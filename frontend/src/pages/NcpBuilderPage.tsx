import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"

import { createCarePlan, listNanda } from "../api/careplans"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import { detectPII } from "../utils/anonymization"

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

        const detectedPII = detectPII(patientScenario)
        setPiiWarnings(detectedPII)
        if (detectedPII.length > 0) {
            setError("Please remove patient-identifying information before saving.")
            return
        }

        const selected = diagnoses?.find((d) => d.id === diagnosisId)
        if (!diagnosisId || !selected) {
            setError("Please select a NANDA diagnosis.")
            return
        }
        if (!title.trim()) {
            setError("Please enter a plan title.")
            return
        }
        if (!patientScenario.trim()) {
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

    const grouped = (diagnoses ?? []).reduce<
        Record<string, { label: string; options: { id: string; label: string; code: string }[] }>
    >((acc, d) => {
        if (!acc[d.domain]) {
            acc[d.domain] = { label: d.domain_display, options: [] }
        }
        acc[d.domain].options.push({ id: d.id, label: d.label, code: d.code })
        return acc
    }, {})

    const selectedDiagnosis = diagnoses?.find((d) => d.id === diagnosisId)

    return (
        <AppShell>
            <div className="max-w-2xl space-y-6">
                <div>
                    <h1 className="text-h1">Create a new care plan</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        Draft and structure your NANDA-based care plan. Use this as a study tool
                        to build understanding, then transcribe onto the official N&amp;MC form for submission.
                    </p>
                </div>

                <form onSubmit={onSubmit} className="rounded-xl border border-border bg-white p-6 space-y-5">
                    <Input
                        label="Plan title"
                        type="text"
                        required
                        maxLength={200}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Post-op day 2 — Risk for Infection"
                    />

                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-1.5">
                            Patient scenario
                        </label>
                        <textarea
                            required
                            rows={5}
                            value={patientScenario}
                            onChange={(e) => {
                                setPatientScenario(e.target.value)
                                if (piiWarnings.length > 0) setPiiWarnings(detectPII(e.target.value))
                            }}
                            className="block w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            placeholder="e.g. 45-year-old female, day 2 post-Caesarean, temp 38.2°C, incision red at edges, WBC 13.5…"
                        />
                        <p className="mt-1.5 text-sm text-on-surface-muted">
                            Be specific — the more detail, the more useful your care plan.{" "}
                            <span className="font-medium text-brand-700">
                                Tip: Include patient initials, age, admission date, and presenting complaint (N&amp;MC case study format).
                            </span>
                        </p>
                        {piiWarnings.length > 0 && (
                            <div className="mt-2 rounded-lg border border-warning-200 bg-warning-50 p-3">
                                <p className="text-xs font-medium text-warning-800">
                                    ⚠️ This looks like it may contain patient-identifying information:
                                </p>
                                <ul className="mt-1 list-disc list-inside text-xs text-warning-700">
                                    {piiWarnings.map((w, i) => (
                                        <li key={i}>
                                            <strong>{w.type}:</strong> {w.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface mb-1.5">
                            Primary NANDA diagnosis
                        </label>
                        <select
                            required
                            value={diagnosisId}
                            onChange={(e) => setDiagnosisId(e.target.value)}
                            disabled={diagnosesLoading}
                            className="block w-full h-11 rounded-lg border border-border bg-white px-3.5 text-sm text-on-surface focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        >
                            <option value="">
                                {diagnosesLoading ? "Loading diagnoses…" : "Select a diagnosis…"}
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
                                <p className="text-xs font-medium text-brand-700">Selected diagnosis</p>
                                <p className="mt-1 text-sm font-semibold text-brand-900">
                                    {selectedDiagnosis.code} — {selectedDiagnosis.label}
                                </p>
                                <p className="mt-0.5 text-xs text-brand-700">
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
                            className="mt-1 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                        />
                        <label htmlFor="is_public" className="text-sm text-on-surface">
                            Make this plan public
                            <span className="block text-xs text-on-surface-muted">
                                Public plans appear in the community library for other students
                                to learn from. You can change this later.
                            </span>
                        </label>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate("/careplans")}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={createMutation.isPending}
                            disabled={!diagnosisId}
                        >
                            {createMutation.isPending ? "Creating…" : "Create plan"}
                        </Button>
                    </div>
                </form>
            </div>
        </AppShell>
    )
}