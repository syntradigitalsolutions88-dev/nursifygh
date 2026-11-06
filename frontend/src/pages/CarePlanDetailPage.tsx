import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { getCarePlan } from "../api/careplans"

export default function CarePlanDetailPage() {
    const { planId } = useParams<{ planId: string }>()

    const { data: plan, isLoading, error } = useQuery({
        queryKey: ["care-plan", planId],
        queryFn: () => getCarePlan(planId!),
        enabled: !!planId,
    })

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading care plan…</p>
            </div>
        )
    }

    if (error || !plan) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="card max-w-md w-full text-center">
                    <h1 className="text-xl font-bold text-red-700">Care plan not found</h1>
                    <Link to="/careplans" className="btn-secondary mt-4 inline-block">
                        Back to care plans
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <Link to="/careplans" className="text-sm text-brand-600 hover:underline">
                        ← Back to care plans
                    </Link>
                    <h1 className="mt-2 text-xl font-bold text-gray-900">{plan.title}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {plan.primary_diagnosis.code} — {plan.primary_diagnosis.label}
                    </p>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div className="card">
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Patient scenario
                    </h2>
                    <p className="mt-2 text-sm text-gray-800 whitespace-pre-line">
                        {plan.patient_scenario}
                    </p>
                </div>

                <div className="card">
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        NANDA diagnosis
                    </h2>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                        {plan.primary_diagnosis.code} — {plan.primary_diagnosis.label}
                    </p>
                    <p className="mt-1 text-xs text-brand-600">
                        {plan.primary_diagnosis.domain_display}
                    </p>
                    <p className="mt-3 text-sm text-gray-700">
                        {plan.primary_diagnosis.definition}
                    </p>
                </div>

                <div className="card">
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        SMART goals
                    </h2>
                    {plan.goals.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500 italic">
                            No goals yet — coming in the next edit round.
                        </p>
                    ) : (
                        <ul className="mt-3 space-y-3">
                            {plan.goals.map((goal, idx) => (
                                <li key={goal.id} className="border-l-2 border-brand-200 pl-3">
                                    <p className="text-xs font-medium text-gray-500">Goal {idx + 1}</p>
                                    <p className="text-sm text-gray-800">{goal.specific}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="card">
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Nursing interventions
                    </h2>
                    {plan.interventions.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500 italic">
                            No interventions yet — coming in the next edit round.
                        </p>
                    ) : (
                        <ul className="mt-3 space-y-3">
                            {plan.interventions.map((iv, idx) => (
                                <li key={iv.id} className="border-l-2 border-brand-200 pl-3">
                                    <p className="text-xs font-medium text-gray-500">
                                        Intervention {idx + 1}
                                    </p>
                                    <p className="text-sm text-gray-800">{iv.action}</p>
                                    <p className="mt-1 text-xs text-gray-600">
                                        <span className="font-medium">Rationale: </span>
                                        {iv.rationale}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex justify-between">
                    <Link to="/careplans" className="btn-secondary">
                        Back to list
                    </Link>
                    <span className="text-xs text-gray-500 self-center">
                        Goals & interventions editing coming in Round 2
                    </span>
                </div>
            </main>
        </div>
    )
}