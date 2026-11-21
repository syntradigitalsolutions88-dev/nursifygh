import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"

import { createCarePlan, listNanda } from "../api/careplans"
import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import { detectPII } from "../utils/anonymization"

// FIXED: Matches the new strict JSON schema from the backend
interface AiCarePlan {
    primary_diagnosis: {
        code: string
        label: string
        domain: string
        definition: string
        related_to: string
        as_evidenced_by: string
    }
    goals: {
        specific: string
        measurable: string
        achievable: string
        relevant: string
        time_bound: string
    }[]
    interventions: {
        action: string
        rationale: string
        type: string
        medication_details?: {
            drug: string
            dose: string
            route: string
            rate: string
            timing: string
            precautions: string
        }
    }[]
    evaluation: {
        outcome: string
        status: string
        evidence: string
    }[]
}

export default function NcpBuilderPage() {
    const navigate = useNavigate()

    const { data: diagnoses, isLoading: diagnosesLoading } = useQuery({
        queryKey: ["nanda"],
        queryFn: () => listNanda(),
    })

    const [title, setTitle] = useState("")
    const [patientScenario, setPatientScenario] = useState("")
    const [diagnosisId, setDiagnosisId] = useState("")
    const [isPublic, setIsPublic] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [piiWarnings, setPiiWarnings] = useState<{ matched: string; type: string; message: string }[]>([])
    const [isAutofilling, setIsAutofilling] = useState(false)

    const createMutation = useMutation({
        mutationFn: createCarePlan,
        onSuccess: (plan) => navigate(`/careplans/${plan.id}`, { replace: true }),
        onError: (err) => {
            if (err instanceof AxiosError && err.response?.data?.detail) {
                setError(String(err.response.data.detail))
            } else {
                setError("We couldn't save this care plan. Please try again.")
            }
        },
    })

    async function handleAiAutofill() {
        setError(null)
        if (!title.trim()) return setError("Please enter a case title first.")
        if (!patientScenario.trim()) return setError("Please describe the patient scenario first.")

        const detectedPII = detectPII(patientScenario)
        if (detectedPII.length > 0) {
            setPiiWarnings(detectedPII)
            return setError("Remove identifying information before using AI Autofill.")
        }

        setIsAutofilling(true)
        try {
            // FIX 1: Added a 60-second timeout so Vercel doesn't abort the request early
            const res = await api.post<AiCarePlan>(
                "/accounts/ai-ncp-autofill/",
                { scenario: patientScenario.trim() },
                { timeout: 60000 }
            )
            const aiData = res.data

            // FIX 2: Match against the new `primary_diagnosis` object
            const matchingDiagnosis =
                diagnoses?.find((d) => d.code === aiData.primary_diagnosis.code) ||
                diagnoses?.find((d) => d.label.toLowerCase() === aiData.primary_diagnosis.label.toLowerCase())

            if (!matchingDiagnosis) {
                setError(
                    `AI suggested "${aiData.primary_diagnosis.code} — ${aiData.primary_diagnosis.label}" but that diagnosis isn't in the NANDA library. Please select one manually below.`
                )
                return
            }

            const plan = await createCarePlan({
                title: title.trim(),
                patient_scenario: patientScenario.trim(),
                primary_diagnosis: matchingDiagnosis.id,
                is_public: isPublic,
            })

            // FIX 3: Save the exact SMART goals and Interventions returned by the AI
            await Promise.all([
                ...aiData.goals.map((g) =>
                    api.post(`/careplans/plans/${plan.id}/goals/`, g).catch((err) => {
                        console.error("Goal save failed:", err.response?.data || err)
                        return null
                    })
                ),
                ...aiData.interventions.map((iv) =>
                    api.post(`/careplans/plans/${plan.id}/interventions/`, iv).catch((err) => {
                        console.error("Intervention save failed:", err.response?.data || err)
                        return null
                    })
                ),
            ])

            navigate(`/careplans/${plan.id}`, { replace: true })
        } catch (err: any) {
            // FIX 4: Expose the exact backend error instead of hiding it
            if (err instanceof AxiosError && err.response?.data?.error) {
                setError(String(err.response.data.error))
            } else {
                setError(err.message || "The AI is temporarily unavailable. Please try again shortly.")
            }
        } finally {
            setIsAutofilling(false)
        }
    }

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)

        const detectedPII = detectPII(patientScenario)
        setPiiWarnings(detectedPII)
        if (detectedPII.length > 0) return setError("Remove identifying information before saving.")
        if (!diagnosisId) return setError("Please select a NANDA diagnosis.")
        if (!title.trim()) return setError("Please enter a case title.")
        if (!patientScenario.trim()) return setError("Please describe the patient scenario.")

        createMutation.mutate({
            title: title.trim(),
            patient_scenario: patientScenario.trim(),
            primary_diagnosis: diagnosisId,
            is_public: isPublic,
        })
    }

    const grouped = (diagnoses ?? []).reduce<
        Record<string, { label: string; options: { id: string; label: string; code: string }[] }>
    >((acc, d) => {
        if (!acc[d.domain]) acc[d.domain] = { label: d.domain_display, options: [] }
        acc[d.domain].options.push({ id: d.id, label: d.label, code: d.code })
        return acc
    }, {})

    const selectedDiagnosis = diagnoses?.find((d) => d.id === diagnosisId)

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto pb-16">

                {/* Header */}
                <div className="mb-8 border-b border-gray-200 pb-6">
                    <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Nursing Care Plan</p>
                    <h1 className="mt-1 text-3xl font-bold text-gray-900">Draft a New Care Plan</h1>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-2xl">
                        Enter the clinical scenario below. You can use the AI Autofill to generate a strict NANDA diagnosis, SMART goals, and evidence-based interventions, or fill it out manually.
                    </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">

                    {/* Step 1: Clinical Context */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                            <h2 className="text-sm font-bold text-gray-900">1. Clinical Context</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Case Title <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    required
                                    maxLength={200}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Postpartum Haemorrhage — Risk for Shock"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Patient Scenario <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAiAutofill}
                                        disabled={isAutofilling || !patientScenario.trim() || !title.trim()}
                                        className="inline-flex items-center gap-2 rounded-md bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isAutofilling ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-brand-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Generating…
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                AI Autofill
                                            </>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    required
                                    rows={6}
                                    value={patientScenario}
                                    onChange={(e) => {
                                        setPatientScenario(e.target.value)
                                        if (piiWarnings.length > 0) setPiiWarnings(detectPII(e.target.value))
                                    }}
                                    className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                                    placeholder="Describe the patient's age, sex, presenting complaint, vital signs, lab results, and current management..."
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Do not include patient names or identifiable information. The AI uses this data to generate accurate NANDA outcomes.
                                </p>
                            </div>

                            {piiWarnings.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-amber-800">Sensitive Information Detected</h3>
                                            <div className="mt-2 text-sm text-amber-700">
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {piiWarnings.map((w, i) => (
                                                        <li key={i}>{w.message}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Diagnosis */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                            <h2 className="text-sm font-bold text-gray-900">2. Primary NANDA Diagnosis</h2>
                        </div>
                        <div className="p-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Select Diagnosis <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={diagnosisId}
                                onChange={(e) => setDiagnosisId(e.target.value)}
                                disabled={diagnosesLoading}
                                className="block w-full h-11 rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                                <option value="">
                                    {diagnosesLoading ? "Loading NANDA library…" : "Select a diagnosis…"}
                                </option>
                                {Object.entries(grouped).map(([domain, group]) => (
                                    <optgroup key={domain} label={group.label}>
                                        {group.options.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.code} — {opt.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>

                            {selectedDiagnosis && (
                                <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/50 p-4">
                                    <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">Selected Diagnosis</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {selectedDiagnosis.code} — {selectedDiagnosis.label}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-600 font-medium">
                                        Domain: {selectedDiagnosis.domain_display}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Settings */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="p-5">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <span className="font-semibold text-gray-900">Publish to Community Library</span>
                                    <p className="text-gray-500 mt-1">
                                        Allow other nursing students to view and learn from this care plan. Your name will remain anonymous.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4">
                        <Button type="button" variant="secondary" onClick={() => navigate("/careplans")}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="lg"
                            loading={createMutation.isPending}
                            disabled={!diagnosisId && !isAutofilling}
                            className="px-8"
                        >
                            {createMutation.isPending ? "Saving…" : "Create Care Plan"}
                        </Button>
                    </div>
                </form>
            </div>
        </AppShell>
    )
}