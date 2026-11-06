import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"

import { createCarePlan, listNanda } from "../api/careplans"

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

    const createMutation = useMutation({
        mutationFn: createCarePlan,
        onSuccess: (plan) => {
            navigate(`/careplans/${plan.id}`, { replace: true })
        },
        onError: (err) => {
            if (err instanceof AxiosError && err.response?.data?.detail) {
                setError(String(err.response.data.detail))
            } else {
                setError("Failed to create care plan. Please try again.")
            }
        },
    })

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)

        // Resolve the selected diagnosis from the loaded catalog
        const selected = diagnoses?.find((d) => d.id === diagnosisId)

        // Debug log — visible in browser DevTools console
        console.log("[NCP create] submitting:", {
            diagnosisId,
            resolvedCode: selected?.code,
            resolvedLabel: selected?.label,
            titleLength: title.trim().length,
            scenarioLength: patientScenario.trim().length,
        })

        // Safety checks — block submission if anything is off
        if (!diagnosisId) {
            setError("Please select a NANDA diagnosis.")
            return
        }
        if (!selected) {
            setError(
                "Selected diagnosis is invalid. Please reselect from the dropdown.",
            )
            return
        }
        if (title.trim().length === 0) {
            setError("Please enter a plan title.")
            return
        }
        if (patientScenario.trim().length === 0) {
            setError("Please describe the patient scenario.")
            return
        }

        createMutation.mutate({
            title: title.trim(),
            patient_scenario: patientScenario.trim(),
            primary_diagnosis: diagnosisId,
            is_public: isPublic,
        })
    }

    // Group by domain for a cleaner, scannable dropdown
    const grouped = (diagnoses ?? []).reduce<
        Record<
            string,
            { label: string; options: { id: string; label: string; code: string }[] }
        >
    >((acc, d) => {
        if (!acc[d.domain]) {
            acc[d.domain] = { label: d.domain_display, options: [] }
        }
        acc[d.domain].options.push({
            id: d.id,
            label: d.label,
            code: d.code,
        })
        return acc
    }, {})

    const selectedDiagnosis = diagnoses?.find((d) => d.id === diagnosisId)

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <Link
                        to="/careplans"
                        className="text-sm text-brand-600 hover:underline"
                    >
                        ← Back to care plans
                    </Link>
                    <h1 className="mt-2 text-xl font-bold text-gray-900">
                        Create a new care plan
                    </h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                <form onSubmit={onSubmit} className="card space-y-5">
                    <div>
                        <label
                            htmlFor="title"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Plan title
                        </label>
                        <input
                            id="title"
                            type="text"
                            required
                            maxLength={200}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="input mt-1"
                            placeholder="e.g. Post-op day 2 — Risk for Infection"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="scenario"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Patient scenario
                        </label>
                        <textarea
                            id="scenario"
                            required
                            rows={5}
                            value={patientScenario}
                            onChange={(e) => setPatientScenario(e.target.value)}
                            className="input mt-1"
                            placeholder="e.g. 45-year-old female, day 2 post-Caesarean, temp 38.2°C, incision red at edges, WBC 13.5…"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Be specific — the more detail, the more useful your care plan.
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="diagnosis"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Primary NANDA diagnosis
                        </label>
                        <select
                            id="diagnosis"
                            name="diagnosis"
                            required
                            value={diagnosisId}
                            onChange={(e) => {
                                const value = e.target.value
                                console.log("[NCP select] changed to:", value)
                                setDiagnosisId(value)
                            }}
                            className="input mt-1"
                            disabled={diagnosesLoading}
                        >
                            <option value="">
                                {diagnosesLoading
                                    ? "Loading diagnoses…"
                                    : "Select a diagnosis…"}
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
                            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
                                <p className="text-xs font-medium text-brand-700">
                                    Selected diagnosis
                                </p>
                                <p className="mt-1 text-sm font-semibold text-brand-900">
                                    {selectedDiagnosis.code} — {selectedDiagnosis.label}
                                </p>
                                <p className="mt-1 text-xs text-brand-700">
                                    {selectedDiagnosis.domain_display}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-start gap-2">
                        <input
                            id="is_public"
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="mt-1"
                        />
                        <label htmlFor="is_public" className="text-sm text-gray-700">
                            Make this plan public
                            <span className="block text-xs text-gray-500">
                                Public plans appear in the community library for other students
                                to learn from. You can change this later.
                            </span>
                        </label>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Link to="/careplans" className="btn-secondary">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || !diagnosisId}
                            className="btn-primary"
                        >
                            {createMutation.isPending ? "Creating…" : "Create plan"}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    )
}