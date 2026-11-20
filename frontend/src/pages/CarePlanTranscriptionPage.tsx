import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getCarePlan } from "../api/careplans"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"

function formatGoalSummary(goal: any): string {
    const base = (goal?.specific || "").trim().replace(/\.$/, "").replace(/>=/g, "≥")
    const cleanMeasurable = (goal?.measurable || "").trim().replace(/\.$/, "").replace(/>=/g, "≥")
    const cleanTimeBound = (goal?.time_bound || "").trim().replace(/\.$/, "").replace(/>=/g, "≥")
    const extras: string[] = []
    if (cleanMeasurable) extras.push(`Target: ${cleanMeasurable}`)
    if (cleanTimeBound) extras.push(`Timeframe: ${cleanTimeBound}`)
    return extras.length > 0 ? `${base} (${extras.join("; ")})` : base
}

export default function CarePlanTranscriptionPage() {
    const { planId } = useParams<{ planId: string }>()
    const { data: plan, isLoading, error } = useQuery({
        queryKey: ["care-plan", planId],
        queryFn: () => getCarePlan(planId!),
        enabled: !!planId,
    })

    if (isLoading) return <AppShell><div className="text-center py-12 text-gray-500">Loading document...</div></AppShell>
    if (error || !plan) return <AppShell><div className="text-center py-12 text-red-600">Care plan not found</div></AppShell>

    const diag = plan.primary_diagnosis as any
    const relatedFactors = diag?.related_factors || diag?.related_to
    const definingCharacteristics = diag?.defining_characteristics || diag?.as_evidenced_by

    return (
        <AppShell>
            {/* Action Bar (Hidden on Print) */}
            <div className="print:hidden mb-6 max-w-5xl mx-auto space-y-4">
                <Link to={`/careplans/${plan.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-700 font-medium">← Back to builder</Link>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">N&MC-Oriented Study Format</p>
                        <h1 className="mt-1 text-2xl font-serif font-bold text-gray-900">{plan.title}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => window.print()}>🖨 Print / Save PDF</Button>
                        <Button variant="secondary" onClick={() => {
                            navigator.clipboard.writeText(buildPlainText(plan))
                            alert("Copied as plain text!")
                        }}>📋 Copy Text</Button>
                    </div>
                </div>
            </div>

            {/* Document Canvas */}
            <div className="document-canvas max-w-5xl mx-auto bg-white shadow-xl border border-gray-200 print:border-0 print:shadow-none">
                <div className="p-8 sm:p-12 print:p-0">

                    {/* Legal Header - FIXED */}
                    <div className="text-center pb-8 mb-8 border-b-2 border-gray-800">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">NursifyGH Study Tool</p>
                        <h1 className="text-3xl font-serif font-black uppercase tracking-wider mt-2 text-gray-900">Nursing Care Plan</h1>
                        <p className="text-xs text-gray-500 mt-1 font-medium italic">N&MC-Oriented Format · Not an Official N&MC Document</p>
                    </div>

                    {/* Patient Info Table */}
                    <table className="w-full text-sm mb-8 border border-gray-300 rounded-lg overflow-hidden print:table-fixed">
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="border-r border-gray-300 px-4 py-3 font-semibold text-gray-600 bg-gray-50 w-1/4 print:bg-transparent">Patient Initials</td>
                                <td className="border-r border-gray-300 px-4 py-3 w-1/4"></td>
                                <td className="border-r border-gray-300 px-4 py-3 font-semibold text-gray-600 bg-gray-50 w-1/4 print:bg-transparent">Age / Sex</td>
                                <td className="px-4 py-3 w-1/4"></td>
                            </tr>
                            <tr>
                                <td className="border-r border-gray-300 px-4 py-3 font-semibold text-gray-600 bg-gray-50 print:bg-transparent">Ward</td>
                                <td className="border-r border-gray-300 px-4 py-3"></td>
                                <td className="border-r border-gray-300 px-4 py-3 font-semibold text-gray-600 bg-gray-50 print:bg-transparent">Date</td>
                                <td className="px-4 py-3">{new Date(plan.created_at).toLocaleDateString("en-GB")}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* NMC Table */}
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-sm border border-gray-300 rounded-lg overflow-hidden print:table-fixed print:text-[11px]">
                            <colgroup>
                                <col style={{ width: "25%" }} />
                                <col style={{ width: "30%" }} />
                                <col style={{ width: "45%" }} />
                            </colgroup>
                            <thead className="bg-gray-50 print:bg-transparent">
                                <tr className="border-b border-gray-300">
                                    <th className="px-4 py-3 text-left font-bold text-gray-800 uppercase text-xs tracking-wider border-r border-gray-300">Nursing Diagnosis</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-800 uppercase text-xs tracking-wider border-r border-gray-300">Outcome Criteria</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-800 uppercase text-xs tracking-wider">Nursing Orders</th>
                                </tr>
                            </thead>
                            <tbody className="align-top">
                                <tr>
                                    {/* Col 1 */}
                                    <td className="border-r border-gray-300 px-4 py-4 leading-relaxed text-gray-700 break-words">
                                        <p className="font-bold text-gray-900">{plan.primary_diagnosis.label}</p>
                                        {relatedFactors && (
                                            <p className="mt-2 text-sm"><span className="font-semibold text-gray-500">related to</span> {relatedFactors}</p>
                                        )}
                                        {definingCharacteristics && (
                                            <p className="mt-2 text-sm"><span className="font-semibold text-gray-500">as evidenced by</span> {definingCharacteristics}</p>
                                        )}
                                    </td>

                                    {/* Col 2 */}
                                    <td className="border-r border-gray-300 px-4 py-4 leading-relaxed text-gray-700 break-words">
                                        <ol className="space-y-3 list-decimal list-outside ml-4 marker:text-gray-400 marker:font-bold">
                                            {plan.goals.map((goal: any) => (
                                                <li key={goal.id} className="pl-2">{formatGoalSummary(goal)}</li>
                                            ))}
                                        </ol>
                                    </td>

                                    {/* Col 3 */}
                                    <td className="px-4 py-4 leading-relaxed text-gray-700 break-words">
                                        <ol className="space-y-5 list-decimal list-outside ml-4 marker:text-gray-400 marker:font-bold">
                                            {plan.interventions.map((iv: any) => (
                                                <li key={iv.id} className="pl-2">
                                                    <p className="font-semibold text-gray-900">{iv.action}</p>
                                                    <div className="mt-2 pl-3 border-l-2 border-brand-200 print:border-gray-400">
                                                        <p className="text-sm text-gray-600 print:text-gray-800"><span className="font-bold text-gray-800 text-[10px] uppercase tracking-wider block mb-0.5">Rationale</span> {iv.rationale}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* EVALUATION SECTION - FIXED */}
                    <div className="mt-8 print:mt-6">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
                            05 · Evaluation
                        </h3>
                        <table className="w-full text-xs border border-gray-300">
                            <thead>
                                <tr className="bg-gray-50 print:bg-transparent">
                                    <th className="border border-gray-300 px-3 py-2 text-left w-1/3 font-semibold text-gray-700">Outcome</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left w-1/4 font-semibold text-gray-700">Status</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Evidence / Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plan.goals.map((goal: any) => (
                                    <tr key={goal.id} className="align-top">
                                        <td className="border border-gray-300 px-3 py-3 text-gray-700">{formatGoalSummary(goal)}</td>
                                        <td className="border border-gray-300 px-3 py-3 text-gray-500">
                                            ☐ Met  ☐ Partially met  ☐ Not met
                                        </td>
                                        <td className="border border-gray-300 px-3 py-4 text-gray-400 italic min-h-[56px]">&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="mt-2 text-[10px] text-gray-500 italic">
                            To be completed by the student after implementing the plan in clinical practice.
                        </p>
                    </div>

                    {/* Signatures */}
                    <table className="w-full text-sm mt-8 border border-gray-300 rounded-lg overflow-hidden print:table-fixed">
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="border-r border-gray-300 px-4 py-3 font-semibold text-gray-600 bg-gray-50 w-1/3 print:bg-transparent">Student Name</td>
                                <td className="border-r border-gray-300 px-4 py-3 w-1/3"></td>
                                <td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50 print:bg-transparent">Signature</td>
                            </tr>
                            <tr>
                                <td className="border-r border-gray-300 px-4 py-3 font-semibold text-gray-600 bg-gray-50 print:bg-transparent">Supervisor</td>
                                <td className="border-r border-gray-300 px-4 py-3"></td>
                                <td className="px-4 py-3 font-semibold text-gray-600 bg-gray-50 print:bg-transparent">Date Reviewed</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer / Legal Notice */}
                    <div className="mt-10 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400 leading-relaxed max-w-xl mx-auto">
                        <p className="font-bold text-gray-500 mb-1">Generated by NursifyGH</p>
                        <p>This is a study tool and is NOT affiliated with the Nurses and Midwives Council of Ghana. Verify all clinical data with your instructor before transcribing to official documents.</p>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}

function buildPlainText(plan: any): string {
    const lines: string[] = []
    const diag = plan.primary_diagnosis as any
    const relatedFactors = diag?.related_factors || diag?.related_to
    const definingCharacteristics = diag?.defining_characteristics || diag?.as_evidenced_by

    lines.push("NURSIFYGH STUDY TOOL")
    lines.push("NURSING CARE PLAN (N&MC-Oriented Format)")
    lines.push("=".repeat(60))
    lines.push("")
    lines.push("NURSING DIAGNOSIS:")
    lines.push(plan.primary_diagnosis.label)
    if (relatedFactors) lines.push(`related to ${relatedFactors}`)
    if (definingCharacteristics) lines.push(`as evidenced by ${definingCharacteristics}`)
    lines.push("")
    lines.push("OBJECTIVE / OUTCOME CRITERIA:")
    plan.goals.forEach((g: any, i: number) => lines.push(`${i + 1}. ${formatGoalSummary(g)}`))
    lines.push("")
    lines.push("NURSING ORDERS:")
    plan.interventions.forEach((iv: any, i: number) => {
        lines.push(`${i + 1}. ${iv.action}`)
        lines.push(`   Rationale: ${iv.rationale}`)
    })
    lines.push("")
    lines.push("EVALUATION (To be completed):")
    plan.goals.forEach((g: any, i: number) => {
        lines.push(`${i + 1}. ${formatGoalSummary(g)}`)
        lines.push(`   Status: [ ] Met  [ ] Partially met  [ ] Not met`)
        lines.push(`   Evidence: `)
    })
    lines.push("")
    lines.push("---")
    lines.push("Generated by NursifyGH Study Tool — verify with clinical instructor before use.")
    return lines.join("\n")
}