import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { getSharedPlan } from "../api/careplans"

export default function SharedPlanPage() {
    const { token } = useParams<{ token: string }>()

    const { data: plan, isLoading, error } = useQuery({
        queryKey: ["shared-plan", token],
        queryFn: () => getSharedPlan(token!),
        enabled: !!token,
        retry: false,
    })

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading shared plan…</p>
            </div>
        )
    }

    if (error || !plan) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="card max-w-md w-full text-center">
                    <h1 className="text-xl font-bold text-red-700">
                        Share link expired or invalid
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Ask the plan owner to generate a new share link.
                    </p>
                    <Link to="/" className="btn-secondary mt-4 inline-block">
                        Go to NursifyGH
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold text-brand-700">
                        NursifyGH
                    </Link>
                    <span className="text-xs text-gray-500">
                        Shared nursing care plan
                    </span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div className="card">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900">{plan.title}</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                By {plan.student_name}
                            </p>
                        </div>
                        {plan.average_rating !== null && (
                            <div className="text-right">
                                <p className="text-2xl font-bold text-brand-700">
                                    {plan.average_rating.toFixed(1)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    ⭐ ({plan.rating_count} rating
                                    {plan.rating_count === 1 ? "" : "s"})
                                </p>
                            </div>
                        )}
                    </div>
                </div>

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
                        <p className="mt-2 text-sm text-gray-500 italic">No goals.</p>
                    ) : (
                        <ul className="mt-3 space-y-4">
                            {plan.goals.map((goal, idx) => (
                                <li key={goal.id} className="border-l-2 border-brand-300 pl-3">
                                    <p className="text-xs font-medium text-gray-500">
                                        Goal {idx + 1}
                                    </p>
                                    <dl className="mt-2 grid grid-cols-1 gap-1 text-sm">
                                        <div>
                                            <dt className="inline font-medium text-gray-700">S: </dt>
                                            <dd className="inline text-gray-800">{goal.specific}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline font-medium text-gray-700">M: </dt>
                                            <dd className="inline text-gray-800">{goal.measurable}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline font-medium text-gray-700">A: </dt>
                                            <dd className="inline text-gray-800">{goal.achievable}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline font-medium text-gray-700">R: </dt>
                                            <dd className="inline text-gray-800">{goal.relevant}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline font-medium text-gray-700">T: </dt>
                                            <dd className="inline text-gray-800">{goal.time_bound}</dd>
                                        </div>
                                    </dl>
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
                        <p className="mt-2 text-sm text-gray-500 italic">No interventions.</p>
                    ) : (
                        <ul className="mt-3 space-y-4">
                            {plan.interventions.map((iv, idx) => (
                                <li key={iv.id} className="border-l-2 border-brand-300 pl-3">
                                    <p className="text-xs font-medium text-gray-500">
                                        Intervention {idx + 1}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-800">{iv.action}</p>
                                    <div className="mt-2 rounded bg-brand-50 p-2">
                                        <p className="text-xs font-medium text-brand-700">Rationale</p>
                                        <p className="mt-1 text-xs text-brand-800">{iv.rationale}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="text-center text-xs text-gray-400 pb-8">
                    Shared via NursifyGH · Read-only view
                </p>
            </main>
        </div>
    )
}