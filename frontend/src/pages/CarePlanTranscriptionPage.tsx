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
                <div className="border border-black bg-white p-8 text-center">
                    <h1 className="text-lg font-bold text-danger-700">Care plan not found</h1>
                    <Link to="/careplans" className="mt-4 inline-block">
                        <Button variant="secondary" size="sm">← Back to care plans</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell>
            {/* Action bar (hidden on print) */}
            <div className="print:hidden mb-6 space-y-4">
                <Link
                    to={`/careplans/${plan.id}`}
                    className="inline-flex items-center gap-1 text-xs text-on-surface-muted hover:text-brand-700"
                >
                    ← Back to plan
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider">
                            Transcription view · N&amp;MC licensure format
                        </p>
                        <h1 className="mt-1 text-2xl font-bold text-on-surface">
                            Copy into your official booklet
                        </h1>
                        <p className="mt-1 text-sm text-on-surface-muted">
                            Read this clean version and transcribe by hand into your N&amp;MC booklet.
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="secondary" onClick={() => window.print()}>
                            🖨 Print
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                navigator.clipboard.writeText(buildPlainText(plan))
                                alert("Care plan copied as plain text — paste into any editor.")
                            }}
                        >
                            📋 Copy as text
                        </Button>
                    </div>
                </div>

                <div className="border border-black bg-white p-3 text-sm text-on-surface">
                    <strong>Reminder:</strong> Remove the patient's name, ID, and bed number before
                    transcribing. Only initials should appear on the official N&amp;MC form.
                </div>
            </div>

            {/* The document (N&MC licensure authentic format) */}
            <div className="bg-white border border-black print:border-0">
                <div className="p-8 print:p-6">
                    {/* Official header */}
                    <div className="text-center pb-4 mb-4 border-b-2 border-black">
                        <p className="text-[10px] uppercase tracking-widest text-black font-semibold">
                            Nurses and Midwives Council of Ghana
                        </p>
                        <h1 className="text-xl font-bold uppercase tracking-wide mt-1 text-black">
                            Nursing Care Plan
                        </h1>
                        <p className="text-xs text-black mt-1">
                            Licensure Examination Format
                        </p>
                    </div>

                    {/* Patient info bar */}
                    <table className="w-full text-xs mb-4 border border-black">
                        <tbody>
                            <tr>
                                <td className="border-r border-black px-2 py-1.5 font-semibold w-1/4">
                                    Patient Initials:
                                </td>
                                <td className="border-r border-black px-2 py-1.5 w-1/4">&nbsp;</td>
                                <td className="border-r border-black px-2 py-1.5 font-semibold w-1/4">
                                    Age / Sex:
                                </td>
                                <td className="px-2 py-1.5 w-1/4">&nbsp;</td>
                            </tr>
                            <tr className="border-t border-black">
                                <td className="border-r border-black px-2 py-1.5 font-semibold">
                                    Ward:
                                </td>
                                <td className="border-r border-black px-2 py-1.5">&nbsp;</td>
                                <td className="border-r border-black px-2 py-1.5 font-semibold">
                                    Date:
                                </td>
                                <td className="px-2 py-1.5">
                                    {new Date(plan.created_at).toLocaleDateString("en-GB")}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* The 3-column N&MC table */}
                    <div className="overflow-x-auto print:overflow-visible">
                        <table
                            className="w-full text-xs border-collapse print:text-[9px]"
                            style={{ minWidth: "800px" }}
                        >
                            <colgroup>
                                <col style={{ width: "28%" }} />
                                <col style={{ width: "32%" }} />
                                <col style={{ width: "40%" }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="border border-black px-2 py-2 text-left font-bold uppercase tracking-wide bg-gray-100">
                                        Nursing Diagnosis
                                    </th>
                                    <th className="border border-black px-2 py-2 text-left font-bold uppercase tracking-wide bg-gray-100">
                                        Objective / Outcome Criteria
                                    </th>
                                    <th className="border border-black px-2 py-2 text-left font-bold uppercase tracking-wide bg-gray-100">
                                        Nursing Orders
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="align-top">
                                    {/* 1: Nursing Diagnosis (PES format) */}
                                    <td className="border border-black px-2 py-2 leading-snug">
                                        <p className="font-bold">{plan.primary_diagnosis.label}</p>
                                        {plan.primary_diagnosis.related_factors && (
                                            <p className="mt-1">
                                                <span className="font-bold">related to</span>{" "}
                                                {plan.primary_diagnosis.related_factors}
                                            </p>
                                        )}
                                        {plan.primary_diagnosis.defining_characteristics && (
                                            <p className="mt-1">
                                                <span className="font-bold">as evidenced by</span>{" "}
                                                {plan.primary_diagnosis.defining_characteristics}
                                            </p>
                                        )}
                                    </td>

                                    {/* 2: Objective / Outcome Criteria (SMART) */}
                                    <td className="border border-black px-2 py-2 leading-snug">
                                        {plan.goals.length === 0 ? (
                                            <p className="text-gray-500 italic">No objective recorded</p>
                                        ) : (
                                            <ol className="space-y-2 list-decimal list-inside">
                                                {plan.goals.map((goal) => (
                                                    <li key={goal.id}>{goal.specific}</li>
                                                ))}
                                            </ol>
                                        )}
                                    </td>

                                    {/* 3: Nursing Orders (with inline Rationale) */}
                                    <td className="border border-black px-2 py-2 leading-snug">
                                        {plan.interventions.length === 0 ? (
                                            <p className="text-gray-500 italic">No nursing orders recorded</p>
                                        ) : (
                                            <ol className="space-y-3 list-decimal list-inside">
                                                {plan.interventions.map((iv) => (
                                                    <li key={iv.id}>
                                                        <p className="font-medium">{iv.action}</p>
                                                        <p className="mt-1">
                                                            <span className="font-bold underline">Rationale:</span>{" "}
                                                            {iv.rationale}
                                                        </p>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signature block */}
                    <table className="w-full text-xs mt-4 border border-black">
                        <tbody>
                            <tr>
                                <td className="border-r border-black px-2 py-2 font-semibold w-1/3">
                                    Student Name:
                                </td>
                                <td className="border-r border-black px-2 py-2 w-1/3">&nbsp;</td>
                                <td className="px-2 py-2 font-semibold w-1/3">Signature:</td>
                            </tr>
                            <tr className="border-t border-black">
                                <td className="border-r border-black px-2 py-2 font-semibold">
                                    Supervisor:
                                </td>
                                <td className="border-r border-black px-2 py-2">&nbsp;</td>
                                <td className="px-2 py-2 font-semibold">Date Reviewed:</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-black text-[10px] text-gray-600 text-center leading-relaxed">
                        <p>
                            <strong>NursifyGH is a study tool.</strong> This care plan must be verified by a licensed
                            clinical instructor before use in patient care. Transcribe onto the official N&amp;MC form.
                        </p>
                        <p className="mt-1">
                            Format reference: N&amp;MC Licensure Examination · Nursing Care Plan
                        </p>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}

function buildPlainText(plan: any): string {
    const lines: string[] = []
    lines.push("NURSES AND MIDWIVES COUNCIL OF GHANA")
    lines.push("NURSING CARE PLAN")
    lines.push("=".repeat(60))
    lines.push("")
    lines.push("NURSING DIAGNOSIS:")
    lines.push(plan.primary_diagnosis.label)
    if (plan.primary_diagnosis.related_factors) lines.push(`related to ${plan.primary_diagnosis.related_factors}`)
    if (plan.primary_diagnosis.defining_characteristics) lines.push(`as evidenced by ${plan.primary_diagnosis.defining_characteristics}`)
    lines.push("")
    lines.push("OBJECTIVE / OUTCOME CRITERIA:")
    plan.goals.forEach((g: any, i: number) => lines.push(`${i + 1}. ${g.specific}`))
    lines.push("")
    lines.push("NURSING ORDERS:")
    plan.interventions.forEach((iv: any, i: number) => {
        lines.push(`${i + 1}. ${iv.action}`)
        lines.push(`   Rationale: ${iv.rationale}`)
    })
    lines.push("")
    lines.push("---")
    lines.push("NursifyGH Study Tool — verify with clinical instructor before use.")
    return lines.join("\n")
}