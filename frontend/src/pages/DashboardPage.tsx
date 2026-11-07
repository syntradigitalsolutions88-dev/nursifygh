import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { getQuizHistory } from "../api/courses"
import { useAuth } from "../contexts/AuthContext"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
}

export default function DashboardPage() {
    const { user } = useAuth()

    const { data: history } = useQuery({
        queryKey: ["quiz-history"],
        queryFn: getQuizHistory,
        enabled: !!user?.has_active_subscription,
    })

    if (!user) return null

    const firstName = user.full_name.split(" ")[0]

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Hero greeting */}
                <div className="rounded-xl border border-border bg-gradient-to-br from-brand-50 via-surface to-surface p-6 lg:p-8">
                    <p className="text-caption text-brand-700">{getGreeting()}</p>
                    <h1 className="mt-1 text-h1 text-on-surface">
                        {firstName}
                    </h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        {user.level_display} · {user.institution || "NursifyGH"}
                    </p>
                </div>

                {/* Subscription banner */}
                {!user.has_active_subscription && (
                    <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <Badge variant="brand">Semester Pass</Badge>
                                <h2 className="mt-2 text-h3 text-brand-900">
                                    Unlock everything for GHS 30
                                </h2>
                                <p className="mt-1 text-body-sm text-brand-800">
                                    120 days of access to all courses, quizzes, and care plan
                                    templates.
                                </p>
                            </div>
                            <Link to="/subscribe" className="shrink-0">
                                <Button size="lg">Subscribe now →</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Quick access — two primary CTAs */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Link
                        to="/courses"
                        className="group rounded-xl border border-border bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                </svg>
                            </div>
                            <span className="text-on-surface-subtle group-hover:text-brand-600 transition-colors">
                                →
                            </span>
                        </div>
                        <h2 className="mt-4 text-h4">Courses &amp; Quizzes</h2>
                        <p className="mt-1 text-body-sm text-on-surface-muted">
                            Practice past questions and timed mock exams.
                        </p>
                    </Link>

                    <Link
                        to="/careplans"
                        className="group rounded-xl border border-border bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                                </svg>
                            </div>
                            <span className="text-on-surface-subtle group-hover:text-brand-600 transition-colors">
                                →
                            </span>
                        </div>
                        <h2 className="mt-4 text-h4">Care Plans</h2>
                        <p className="mt-1 text-body-sm text-on-surface-muted">
                            Build NANDA diagnoses, SMART goals, and interventions.
                        </p>
                    </Link>
                </div>

                {/* Recent quiz attempts */}
                {history && history.length > 0 && (
                    <div className="rounded-xl border border-border bg-white">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h2 className="text-h4">Recent quiz attempts</h2>
                            <Link
                                to="/courses"
                                className="text-xs font-medium text-brand-600 hover:underline"
                            >
                                View all →
                            </Link>
                        </div>
                        <ul className="divide-y divide-border">
                            {history.slice(0, 3).map((attempt) => (
                                <li key={attempt.id} className="px-5 py-3 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-on-surface truncate">
                                            {attempt.course_code} — {attempt.course_title}
                                        </p>
                                        <p className="text-xs text-on-surface-muted mt-0.5">
                                            {new Date(attempt.started_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right ml-3">
                                        <p className="text-sm font-semibold text-brand-700">
                                            {attempt.score_percentage}%
                                        </p>
                                        <p className="text-xs text-on-surface-muted">
                                            {attempt.correct_answers}/{attempt.total_questions}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Empty state */}
                {(!history || history.length === 0) && user.has_active_subscription && (
                    <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center">
                        <p className="text-body-sm font-medium text-on-surface">
                            Ready to test your knowledge?
                        </p>
                        <p className="mt-1 text-xs text-on-surface-muted">
                            You haven't taken any quizzes yet. Practice makes perfect.
                        </p>
                        <Link to="/courses" className="mt-4 inline-block">
                            <Button variant="secondary" size="sm">
                                Browse courses →
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </AppShell>
    )
}