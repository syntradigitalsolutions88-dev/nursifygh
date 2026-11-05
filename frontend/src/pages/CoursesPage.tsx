import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { AxiosError } from "axios"

import { listCourses } from "../api/courses"
import { useAuth } from "../contexts/AuthContext"

export default function CoursesPage() {
    const { user, logout } = useAuth()

    const { data: courses, isLoading, error } = useQuery({
        queryKey: ["courses"],
        queryFn: listCourses,
        enabled: !!user?.has_active_subscription,
    })

    if (!user) return null

    // Paywall branch: user is authenticated but not subscribed
    if (!user.has_active_subscription) {
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
                <main className="max-w-3xl mx-auto px-4 py-8">
                    <div className="card bg-amber-50 ring-amber-100">
                        <h1 className="text-2xl font-bold text-amber-900">
                            Subscription required
                        </h1>
                        <p className="mt-2 text-sm text-amber-800">
                            You need an active semester pass to access courses and quizzes.
                        </p>
                        <Link to="/dashboard" className="btn-primary mt-4">
                            Go to dashboard
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

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
                <div>
                    <Link to="/dashboard" className="text-sm text-brand-600 hover:underline">
                        ← Back to dashboard
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">
                        Courses for {user.level_display}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Practice questions from your current level.
                    </p>
                </div>

                {isLoading && (
                    <div className="card">
                        <p className="text-gray-500">Loading courses…</p>
                    </div>
                )}

                {error && (
                    <div className="card bg-red-50 ring-red-100">
                        <p className="text-sm text-red-700">
                            {error instanceof AxiosError
                                ? `Failed to load courses: ${error.message}`
                                : "Failed to load courses."}
                        </p>
                    </div>
                )}

                {courses && courses.length === 0 && (
                    <div className="card">
                        <p className="text-gray-500">
                            No courses available yet for your level.
                        </p>
                    </div>
                )}

                {courses && courses.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {courses.map((course) => (
                            <Link
                                key={course.id}
                                to={`/quizzes/${course.id}`}
                                className="card hover:ring-brand-200 transition block"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-brand-600 uppercase tracking-wide">
                                            {course.code}
                                        </p>
                                        <h2 className="mt-1 text-lg font-semibold text-gray-900">
                                            {course.title}
                                        </h2>
                                    </div>
                                </div>
                                <p className="mt-2 text-sm text-gray-500">
                                    {course.category_display} · {course.semester_display}
                                </p>
                                <p className="mt-3 text-xs text-gray-400">
                                    {course.question_count} question
                                    {course.question_count === 1 ? "" : "s"}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}