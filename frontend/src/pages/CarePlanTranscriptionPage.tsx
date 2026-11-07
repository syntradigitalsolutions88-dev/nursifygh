import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { getCarePlan } from "../api/careplans"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"

export default function CarePlanTranscriptionPage() {
    const { planId } = useParams<{ planId: string }>()

    const { data: plan, isLoading, error } = useQuery({
        queryKey: ["care-plan", planId],
        queryFn: () => getCarePlan(planId!),
        enabled: !!planId,
    })

    if (isLoading) {
        return (
            <AppShell>
                <div className="text-center py-12">
                    <p className="text-on-surface-muted">Loading care plan…</p>
                </div>
            </AppShell>
        )
    }

    if (error || !plan) {
        return (
            <AppShell>
                <div className="rounded-xl border border-border bg-white p-8 text-center">
                    <h1 className="text-h3 text-danger-700">Care plan not found</h1>
                    <Link to="/careplans" className="mt-4 inline-block">
                        <Button variant="secondary" size="sm">← Back to care plans</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell>
            {/* Non-printable action bar */}
            <div className="print:hidden max-w-6xl space-y-4 mb-6">
                <Link
                    to={`/careplans/${plan.id}`}
                    className="inline-flex items-center gap-1 text-xs text-on-surface-muted hover:text-brand-700"
                >
                    ← Back to plan
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <p className="text-caption text-brand-700">Transcription View · N&MC Format</p>
                        <h1 className="mt-1 text-h2">Copy into your official booklet</h1>
                        <p className="mt-1 text-body-sm text-on-surface-muted">
                            Place your phone next to your N&MC booklet and transcribe by hand.
                            Use the Print button for a cleaner reference.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => window.print()}>
                            🖨 Print
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                const text = buildPlainText(plan)
                                navigator.clipboard.writeText(text)
                                alert("Care plan copied as plain text — paste into any editor.")
                            }}
                        >
                            📋 Copy as Text
                        </Button>
                    </div>
                </div>

                {/* Anonymization reminder */}
                <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800">
                    <strong>Reminder:</strong> Before transcribing, double-check that your booklet entry does not contain
                    the patient's full name, ID number, or bed number. Only initials should appear on the N&MC form.
                </div>
            </div>

            {/* The transcription table (printable) */}
            <div className="print:block max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-border print:border-0 print:p-0 print:rounded-none">
                {/* Header */}
                <div className="text-center border-b-2 border-on-surface pb-4 mb-6">
                    <h1 className="text-xl font-bold text-on-surface">
                        NURSING CARE PLAN
                    </h1>
                    <p className="text-sm text-on-surface-muted mt-1">
                        {plan.primary_diagnosis.code} · {plan.primary_diagnosis.label}
                    </p>
                </div>

                {/* Patient info */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                    <div>
                        <span className="font-semibold text-on-surface">Patient Initials:</span>{" "}
                        <span className="text-on-surface">___</span>
                    </div>
                    <div>
                        <span className="font-semibold text-on-surface">Age / Sex:</span>{" "}
                        <span className="text-on-surface">___</span>
                    </div>
                    <div>
                        <span className="font-semibold text-on-surface">Ward:</span>{" "}
                        <span className="text-on-surface">___</span>
                    </div>
                    <div>
                        <span className="font-semibold text-on-surface">Date:</span>{" "}
                        <span className="text-on-surface">{new Date(plan.created_at).toLocaleDateString("en-GB")}</span>
                    </div>
                </div>

                {/* The 5-column table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-subtle">
                                <th className="border border-border px-2 py-2 font-semibold text-on-surface w-[20%]">
                                    Assessment
                                </th>
                                <th className="border border-border px-2 py-2 font-semibold text-on-surface w-[20%]">
                                    Nursing Diagnosis
                                </th>
                                <th className="border border-border px-2 py-2 font-semibold text-on-surface w-[20%]">
                                    Planning (Goals)
                                </th>
                                <th className="border border-border px-2 py-2 font-semibold text-on-surface w-[20%]">
                                    Implementation (Interventions)
                                </th>
                                <th className="border border-border px-2 py-2 font-semibold text-on-surface w-[20%]">
                                    Evaluation
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="align-top">
                                {/* Column 1: Assessment */}
                                <td className="border border-border px-2 py-3 text-on-surface whitespace-pre-line">
                                    <p className="font-semibold mb-1">Subjective / Objective:</p>
                                    {plan.patient_scenario}
                                </td>

                                {/* Column 2: Diagnosis */}
                                <td className="border border-border px-2 py-3 text-on-surface">
                                    <p className="font-semibold mb-1">{plan.primary_diagnosis.code}</p>
                                    <p className="mb-2">{plan.primary_diagnosis.label}</p>
                                    {plan.primary_diagnosis.related_factors && (
                                        <>
                                            <p className="font-semibold">Related to:</p>
                                            <p className="mb-2">{plan.primary_diagnosis.related_factors}</p>
                                        </>
                                    )}
                                    {plan.primary_diagnosis.defining_characteristics && (
                                        <>
                                            <p className="font-semibold">As evidenced by:</p>
                                            <p>{plan.primary_diagnosis.defining_characteristics}</p>
                                        </>
                                    )}
                                </td>

                                {/* Column 3: Goals */}
                                <td className="border border-border px-2 py-3 text-on-surface">
                                    {plan.goals.length === 0 ? (
                                        <p className="italic text-on-surface-muted">No goals added</p>
                                    ) : (
                                        <ol className="space-y-3 list-decimal list-inside">
                                            {plan.goals.map((goal) => (
                                                <li key={goal.id}>
                                                    <p className="font-semibold">SMART Goal:</p>
                                                    <p>S: {goal.specific}</p>
                                                    <p>M: {goal.measurable}</p>
                                                    <p>A: {goal.achievable}</p>
                                                    <p>R: {goal.relevant}</p>
                                                    <p>T: {goal.time_bound}</p>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </td>

                                {/* Column 4: Interventions */}
                                <td className="border border-border px-2 py-3 text-on-surface">
                                    {plan.interventions.length === 0 ? (
                                        <p className="italic text-on-surface-muted">No interventions added</p>
                                    ) : (
                                        <ol className="space-y-3 list-decimal list-inside">
                                            {plan.interventions.map((iv) => (
                                                <li key={iv.id}>
                                                    <p>{iv.action}</p>
                                                    <p className="mt-1 text-on-surface-muted">
                                                        <em>Rationale: {iv.rationale}</em>
                                                    </p>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </td>

                                {/* Column 5: Evaluation */}
                                <td className="border border-border px-2 py-3 text-on-surface">
                                    <p className="italic text-on-surface-muted">
                                        To be filled in during clinical evaluation.
                                    </p>
                                    <p className="mt-2">Goal met / partially met / not met.</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer disclaimer */}
                <div className="mt-6 pt-4 border-t border-border text-xs text-on-surface-muted text-center">
                    <p>
                        <strong>NursifyGH is a study tool.</strong> This care plan must be verified by a licensed
                        clinical instructor before use in patient care. Transcribe onto the official N&MC form
                        for your booklet submission.
                    </p>
                </div>
            </div>
        </AppShell>
    )
}

function buildPlainText(plan: any): string {
    const lines: string[] = []
    lines.push("NURSING CARE PLAN")
    lines.push("=".repeat(50))
    lines.push("")
    lines.push(`Diagnosis: ${plan.primary_diagnosis.code} — ${plan.primary_diagnosis.label}`)
    lines.push("")
    lines.push("ASSESSMENT:")
    lines.push(plan.patient_scenario)
    lines.push("")
    lines.push("NURSING DIAGNOSIS:")
    lines.push(`${plan.primary_diagnosis.code} — ${plan.primary_diagnosis.label}`)
    if (plan.primary_diagnosis.related_factors) {
        lines.push(`Related to: ${plan.primary_diagnosis.related_factors}`)
    }
    if (plan.primary_diagnosis.defining_characteristics) {
        lines.push(`As evidenced by: ${plan.primary_diagnosis.defining_characteristics}`)
    }
    lines.push("")
    lines.push("PLANNING (SMART Goals):")
    plan.goals.forEach((goal: any, i: number) => {
        lines.push(`${i + 1}.`)
        lines.push(`   S: ${goal.specific}`)
        lines.push(`   M: ${goal.measurable}`)
        lines.push(`   A: ${goal.achievable}`)
        lines.push(`   R: ${goal.relevant}`)
        lines.push(`   T: ${goal.time_bound}`)
    })
    lines.push("")
    lines.push("IMPLEMENTATION (Interventions):")
    plan.interventions.forEach((iv: any, i: number) => {
        lines.push(`${i + 1}. ${iv.action}`)
        lines.push(`   Rationale: ${iv.rationale}`)
    })
    lines.push("")
    lines.push("EVALUATION:")
    lines.push("To be completed during clinical evaluation.")
    lines.push("")
    lines.push("---")
    lines.push("NursifyGH Study Tool — verify with clinical instructor before use.")
    return lines.join("\n")
}