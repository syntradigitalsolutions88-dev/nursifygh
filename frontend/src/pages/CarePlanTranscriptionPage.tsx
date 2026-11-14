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
                <div className="border border-black bg-white p-8 text-center max-w-2xl mx-auto">
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
            <div className="print:hidden mb-6 max-w-5xl mx-auto space-y-4">
                <Link
                    to={`/careplans/${plan.id}`}
                    className="inline-flex items-center gap-1 text-xs text-on-surface-muted hover:text-brand-700 font-medium"
                >
                    ← Back to plan
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                            Transcription View · N&amp;MC Format
                        </p>
                        <h1 className="mt-1 text-2xl font-bold text-on-surface">
                            {plan.title}
                        </h1>
                        <p className="mt-1 text-sm text-on-surface-muted">
                            Clean, print-ready view. Transcribe by hand into your official N&amp;MC booklet.
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
                            📋 Copy as Text
                        </Button>
                    </div>
                </div>

                <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">
                        <strong>⚠️ Privacy Reminder:</strong> Remove the patient's name, ID, and bed number before transcribing. Only initials should appear on the official N&amp;MC form.
                    </p>
                </div>
            </div>

            {/* Document Canvas */}
            <div className="max-w-5xl mx-auto bg-white border-2 border-black print:border-0 print:max-w-none">
                <div className="p-8 print:p-4">

                    {/* Official Header */}
                    <div className="text-center pb-6 mb-6 border-b-2 border-black">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-black font-bold">
                            Nurses and Midwives Council of Ghana
                        </p>
                        <h1 className="text-2xl font-black uppercase tracking-wide mt-2 text-black">
                            Nursing Care Plan
                        </h1>
                        <p className="text-xs text-black mt-1 font-medium">
                            Licensure Examination Format
                        </p>
                    </div>

                    {/* Patient Info Bar */}
                    <table className="w-full text-xs mb-6 border-2 border-black">
                        <tbody>
                            <tr>
                                <td className="border-r-2 border-black px-3 py-2 font-bold w-1/4 bg-gray-50">Patient Initials:</td>
                                <td className="border-r-2 border-black px-3 py-2 w-1/4">&nbsp;</td>
                                <td className="border-r-2 border-black px-3 py-2 font-bold w-1/4 bg-gray-50">Age / Sex:</td>
                                <td className="px-3 py-2 w-1/4">&nbsp;</td>
                            </tr>
                            <tr className="border-t-2 border-black">
                                <td className="border-r-2 border-black px-3 py-2 font-bold bg-gray-50">Ward:</td>
                                <td className="border-r-2 border-black px-3 py-2">&nbsp;</td>
                                <td className="border-r-2 border-black px-3 py-2 font-bold bg-gray-50">Date:</td>
                                <td className="px-3 py-2">{new Date(plan.created_at).toLocaleDateString("en-GB")}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* The 3-column N&MC Table */}
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-xs border-collapse print:text-[10px]" style={{ minWidth: "800px" }}>
                            <colgroup>
                                <col style={{ width: "25%" }} />
                                <col style={{ width: "35%" }} />
                                <col style={{ width: "40%" }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="border-2 border-black px-3 py-3 text-left font-black uppercase tracking-wide bg-gray-100">
                                        Nursing Diagnosis
                                    </th>
                                    <th className="border-2 border-black px-3 py-3 text-left font-black uppercase tracking-wide bg-gray-100">
                                        Objective / Outcome Criteria
                                    </th>
                                    <th className="border-2 border-black px-3 py-3 text-left font-black uppercase tracking-wide bg-gray-100">
                                        Nursing Orders
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="align-top">
                                    {/* Column 1: Diagnosis */}
                                    <td className="border-2 border-black px-3 py-3 leading-relaxed">
                                        <p className="font-bold text-black">{plan.primary_diagnosis.label}</p>
                                        {plan.primary_diagnosis.related_factors && (
                                            <p className="mt-2">
                                                <span className="font-black">related to</span>{" "}
                                                {plan.primary_diagnosis.related_factors}
                                            </p>
                                        )}
                                        {plan.primary_diagnosis.defining_characteristics && (
                                            <p className="mt-2">
                                                <span className="font-black">as evidenced by</span>{" "}
                                                {plan.primary_diagnosis.defining_characteristics}
                                            </p>
                                        )}
                                    </td>

                                    {/* Column 2: Goals */}
                                    <td className="border-2 border-black px-3 py-3 leading-relaxed">
                                        {plan.goals.length === 0 ? (
                                            <p className="text-gray-500 italic">No objective recorded</p>
                                        ) : (
                                            <ol className="space-y-2 list-decimal list-inside marker:font-bold">
                                                {plan.goals.map((goal) => (
                                                    <li key={goal.id}>{goal.specific}</li>
                                                ))}
                                            </ol>
                                        )}
                                    </td>

                                    {/* Column 3: Interventions */}
                                    <td className="border-2 border-black px-3 py-3 leading-relaxed">
                                        {plan.interventions.length === 0 ? (
                                            <p className="text-gray-500 italic">No nursing orders recorded</p>
                                        ) : (
                                            <ol className="space-y-4 list-decimal list-inside marker:font-bold">
                                                {plan.interventions.map((iv) => (
                                                    <li key={iv.id}>
                                                        <p className="font-semibold text-black">{iv.action}</p>
                                                        <div className="mt-1 pl-4 border-l-2 border-black">
                                                            <p>
                                                                <span className="font-black underline">Rationale:</span>{" "}
                                                                {iv.rationale}
                                                            </p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signature Block */}
                    <table className="w-full text-xs mt-6 border-2 border-black">
                        <tbody>
                            <tr>
                                <td className="border-r-2 border-black px-3 py-3 font-bold w-1/3 bg-gray-50">Student Name:</td>
                                <td className="border-r-2 border-black px-3 py-3 w-1/3">&nbsp;</td>
                                <td className="px-3 py-3 font-bold w-1/3 bg-gray-50">Signature:</td>
                            </tr>
                            <tr className="border-t-2 border-black">
                                <td className="border-r-2 border-black px-3 py-3 font-bold bg-gray-50">Supervisor:</td>
                                <td className="border-r-2 border-black px-3 py-3">&nbsp;</td>
                                <td className="px-3 py-3 font-bold bg-gray-50">Date Reviewed:</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t-2 border-black text-[10px] text-gray-800 text-center leading-relaxed">
                        <p className="font-bold">
                            NursifyGH is an independent study tool and is NOT affiliated with the N&amp;MC of Ghana.
                        </p>
                        <p className="mt-1">
                            This care plan must be verified by a licensed clinical instructor before use in patient care. Transcribe onto the official N&amp;MC form.
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