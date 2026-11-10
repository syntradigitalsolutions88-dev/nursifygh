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

interface AiCarePlan {
    diagnosis_code: string
    diagnosis_label: string
    goals: string[]
    interventions: { action: string; rationale: string }[]
}

function splitGoalIntoSmat(goal: string) {
    return { specific: goal, measurable: goal, achievable: goal, relevant: goal, time_bound: goal }
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
            const res = await api.post<AiCarePlan>("/accounts/ai-ncp-autofill/", {
                scenario: patientScenario,
            })
            const aiData = res.data

            const matchingDiagnosis =
                diagnoses?.find((d) => d.code === aiData.diagnosis_code) ||
                diagnoses?.find((d) => d.label.toLowerCase() === aiData.diagnosis_label.toLowerCase())

            if (!matchingDiagnosis) {
                setError(
                    `AI suggested "${aiData.diagnosis_code} — ${aiData.diagnosis_label}" but that diagnosis isn't in the NANDA library. Please select one manually below.`
                )
                return
            }

            const plan = await createCarePlan({
                title: title.trim(),
                patient_scenario: patientScenario.trim(),
                primary_diagnosis: matchingDiagnosis.id,
                is_public: isPublic,
            })

            await Promise.all([
                ...aiData.goals.map((g) =>
                    api.post(`/careplans/plans/${plan.id}/goals/`, splitGoalIntoSmat(g)).catch((err) => {
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
        } catch (err) {
            if (err instanceof AxiosError && err.response?.data?.error) {
                setError(String(err.response.data.error))
            } else {
                setError("The AI is temporarily unavailable. Please try again shortly.")
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
            <div className="max-w-2xl mx-auto pb-16">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-on-surface">Prepare a care plan</h1>
                    <p className="mt-1.5 text-sm text-on-surface-muted leading-relaxed">
                        Fill in the case below and either write your NCP manually, or let AI draft it for you.
                        You can edit everything before saving.
                    </p>
                </header>

                <form onSubmit={onSubmit} className="space-y-6">
                    {/* Case Title */}
                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-1.5">
                            Case title
                        </label>
                        <Input
                            type="text"
                            required
                            maxLength={200}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Post-operative day 2 — Risk for Infection"
                        />
                        <p className="mt-1 text-xs text-on-surface-muted">
                            A short clinical label so you can find this case later.
                        </p>
                    </div>

                    {/* Patient Scenario */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-on-surface">
                                Patient scenario
                            </label>
                            <button
                                type="button"
                                onClick={handleAiAutofill}
                                disabled={isAutofilling || !patientScenario.trim() || !title.trim()}
                                className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {isAutofilling ? (
                                    <>
                                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Drafting…
                                    </>
                                ) : (
                                    <>✨ AI Autofill</>
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
                            className="block w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 leading-relaxed"
                            placeholder={`Write the clinical scenario like you would in your N&MC booklet.

Include: patient initials, age, sex, admission date, ward, presenting complaint, vital signs, relevant lab results, and current management.`}
                        />
                        <p className="mt-1.5 text-xs text-on-surface-muted leading-relaxed">
                            <strong className="text-on-surface">Tip:</strong> Use the N&amp;MC case study format.
                            The more detail you include, the more accurate your NCP will be.
                        </p>
                        {piiWarnings.length > 0 && (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs font-medium text-amber-900 mb-1">
                                    ⚠️ Possible patient-identifying information
                                </p>
                                <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                                    {piiWarnings.map((w, i) => (
                                        <li key={i}><strong>{w.type}:</strong> {w.message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="mt-2 rounded-lg border border-brand-100 bg-brand-50/50 p-3">
                            <p className="text-xs text-brand-900 leading-relaxed">
                                <strong>✨ AI Autofill:</strong> Fill in the title and scenario, then click
                                <strong> AI Autofill</strong> above. The AI will pick an appropriate NANDA
                                diagnosis and draft 3 SMART goals and 5 interventions you can review and edit.
                            </p>
                        </div>
                    </div>

                    {/* NANDA Diagnosis */}
                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-1.5">
                            Primary NANDA diagnosis
                            <span className="font-normal text-on-surface-muted"> (optional if using AI)</span>
                        </label>
                        <select
                            value={diagnosisId}
                            onChange={(e) => setDiagnosisId(e.target.value)}
                            disabled={diagnosesLoading}
                            className="block w-full h-11 rounded-lg border border-border bg-white px-3.5 text-sm text-on-surface focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
                            <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50 p-3">
                                <p className="text-xs font-medium text-brand-700 mb-1">Selected diagnosis</p>
                                <p className="text-sm font-semibold text-brand-900">
                                    {selectedDiagnosis.code} — {selectedDiagnosis.label}
                                </p>
                                <p className="mt-0.5 text-xs text-brand-700">
                                    {selectedDiagnosis.domain_display}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Public toggle */}
                    <div>
                        <label className="flex items-start gap-3 rounded-lg border border-border bg-white p-4 cursor-pointer hover:border-brand-300 transition-colors">
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                            />
                            <div>
                                <p className="text-sm font-medium text-on-surface">
                                    Publish to the community library
                                </p>
                                <p className="mt-0.5 text-xs text-on-surface-muted">
                                    Other students can learn from your case. You can unpublish at any time.
                                </p>
                            </div>
                        </label>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <div className="flex items-center justify-between border-t border-border pt-5">
                        <Button type="button" variant="secondary" onClick={() => navigate("/careplans")}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={createMutation.isPending} disabled={!diagnosisId && !isAutofilling}>
                            {createMutation.isPending ? "Saving…" : "Create care plan"}
                        </Button>
                    </div>
                </form>
            </div>
        </AppShell>
    )
}