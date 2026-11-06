import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { listCarePlans } from "../api/careplans"
import { useAuth } from "../contexts/AuthContext"

export default function CarePlansPage() {
    const { user, logout } = useAuth()

    const { data: plans, isLoading, error } = useQuery({
        queryKey: ["care-plans"],
        queryFn: listCarePlans,
        enabled: !!user,
    })

    if (!user) return null

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
                    <Link to="/dashboard" className="text-xl font-bold text-brand-700">
                        NursifyGH
                    </Link>
                    <button onClick={logout} className="btn-secondary text-sm">
                        Log out
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <Link
                            to="/dashboard"
                            className="text-sm text-brand-600 hover:underline"
                        >
                            ← Back to dashboard
                        </Link>
                        <h1 className="mt-2 text-2xl font-bold text-gray-900">
                            My Care Plans
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            NANDA-based nursing care plans with SMART goals and rationales.
                        </p>
                    </div>
                    <Link to="/careplans/new" className="btn-primary shrink-0">
                        + New plan
                    </Link>
                </div>

                {isLoading && (
                    <div className="card">
                        <p className="text-gray-500">Loading care plans…</p>
                    </div>
                )}

                {error && (
                    <div className="card bg-red-50 ring-red-100">
                        <p className="text-sm text-red-700">
                            Failed to load care plans. Please try again.
                        </p>
                    </div>
                )}

                {plans && plans.length === 0 && (
                    <div className="card text-center py-10">
                        <p className="text-gray-500">You haven't created any care plans yet.</p>
                        <Link to="/careplans/new" className="btn-primary mt-4 inline-block">
                            Create your first plan
                        </Link>
                    </div>
                )}

                {plans && plans.length > 0 && (
                    <div className="space-y-3">
                        {plans.map((plan) => (
                            <Link
                                key={plan.id}
                                to={`/careplans/${plan.id}`}
                                className="card hover:ring-brand-200 transition block"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base font-semibold text-gray-900 truncate">
                                            {plan.title}
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-500 truncate">
                                            {plan.primary_diagnosis_label}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-gray-500">
                                            {plan.goal_count} goal{plan.goal_count === 1 ? "" : "s"}
                                            {" · "}
                                            {plan.intervention_count} intervention
                                            {plan.intervention_count === 1 ? "" : "s"}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                            {new Date(plan.updated_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                {plan.is_submitted && (
                                    <span className="mt-2 inline-block text-xs font-medium text-green-700">
                                        ✓ Submitted
                                    </span>
                                )}
                                {plan.is_public && !plan.is_submitted && (
                                    <span className="mt-2 inline-block text-xs font-medium text-brand-600">
                                        🌍 Public
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}