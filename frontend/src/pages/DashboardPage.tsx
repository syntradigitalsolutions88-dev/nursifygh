import { Link } from "react-router-dom"

import { useAuth } from "../contexts/AuthContext"

export default function DashboardPage() {
    const { user, logout } = useAuth()

    if (!user) return null

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
                    <Link to="/" className="text-xl font-bold text-brand-700">
                        NursifyGH
                    </Link>
                    <button onClick={logout} className="btn-secondary text-sm">
                        Log out
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div className="card">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome, {user.full_name}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{user.email}</p>

                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-gray-500">Level</dt>
                            <dd className="font-medium text-gray-900">{user.level_display}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Institution</dt>
                            <dd className="font-medium text-gray-900">
                                {user.institution || "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Subscription</dt>
                            <dd className="font-medium">
                                {user.has_active_subscription ? (
                                    <span className="text-green-700">Active</span>
                                ) : (
                                    <span className="text-red-700">Not subscribed</span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">
                                {user.has_active_subscription ? "Expires" : "—"}
                            </dt>
                            <dd className="font-medium text-gray-900">
                                {user.subscription_expires_at
                                    ? new Date(user.subscription_expires_at).toLocaleDateString()
                                    : "—"}
                            </dd>
                        </div>
                    </dl>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Link to="/courses" className="card hover:ring-brand-200 transition">
                        <h2 className="text-lg font-semibold text-gray-900">Courses &amp; Quizzes</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Practice past questions and timed mock exams.
                        </p>
                        <p className="mt-4 text-xs text-brand-600">Coming in Message 3 →</p>
                    </Link>

                    <Link to="/careplans" className="card hover:ring-brand-200 transition">
                        <h2 className="text-lg font-semibold text-gray-900">Care Plans</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Build NANDA diagnoses, SMART goals, and interventions.
                        </p>
                        <p className="mt-4 text-xs text-brand-600">Coming in Message 4 →</p>
                    </Link>
                </div>

                {!user.has_active_subscription && (
                    <div className="card bg-amber-50 ring-amber-100">
                        <h2 className="text-lg font-semibold text-amber-900">Unlock everything</h2>
                        <p className="mt-1 text-sm text-amber-800">
                            Subscribe to access all courses, quizzes, and care plan templates.
                        </p>
                        <button className="btn-primary mt-4" disabled>
                            Subscribe (coming in Message 5)
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}