import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { listPublicPlans } from "../api/careplans"
import { useAuth } from "../contexts/AuthContext"

export default function PublicLibraryPage() {
    const { user, logout } = useAuth()

    const { data: plans, isLoading, error } = useQuery({
        queryKey: ["public-plans"],
        queryFn: listPublicPlans,
        enabled: !!user,
    })

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
                    <Link to="/dashboard" className="text-xl font-bold text-brand-700">
                        NursifyGH
                    </Link>
                    {user && (
                        <button onClick={logout} className="btn-secondary text-sm">
                            Log out
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div>
                    <Link
                        to="/careplans"
                        className="text-sm text-brand-600 hover:underline"
                    >
                        ← My care plans
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">
                        Community Care Plans
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Browse care plans shared by other students.
                    </p>
                </div>

                {isLoading && (
                    <div className="card">
                        <p className="text-gray-500">Loading plans…</p>
                    </div>
                )}

                {error && (
                    <div className="card bg-red-50 ring-red-100">
                        <p className="text-sm text-red-700">Failed to load public plans.</p>
                    </div>
                )}

                {plans && plans.length === 0 && (
                    <div className="card text-center py-10">
                        <p className="text-gray-500">
                            No public plans yet. Make yours public to share with the
                            community.
                        </p>
                    </div>
                )}

                {plans && plans.length > 0 && (
                    <div className="space-y-3">
                        {plans.map((plan) => (
                            <div key={plan.id} className="card">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base font-semibold text-gray-900 truncate">
                                            {plan.title}
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-500 truncate">
                                            {plan.primary_diagnosis.code} —{" "}
                                            {plan.primary_diagnosis.label}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                            By {plan.student_name}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {plan.average_rating !== null ? (
                                            <>
                                                <p className="text-lg font-bold text-brand-700">
                                                    {plan.average_rating.toFixed(1)} ⭐
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {plan.rating_count} rating
                                                    {plan.rating_count === 1 ? "" : "s"}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-gray-400">No ratings yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}