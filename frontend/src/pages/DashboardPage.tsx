import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { getQuizHistory } from "../api/courses"
import { useAuth } from "../contexts/AuthContext"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import ExamCountdown from "../components/ExamCountdown"
import WeakAreasCard from "../components/WeakAreasCard"

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
}

function formatProgram(program: string) {
    if (program === 'PSYCHIATRIC') return 'Psychiatric Nursing (RPN)'
    if (program === 'MIDWIFERY') return 'Midwifery (RM)'
    if (program === 'COMMUNITY') return 'Community Health (CHN)'
    return 'General Nursing (RGN)'
}

function getCountdownText(msLeft: number): string {
    if (msLeft <= 0) return "expired"
    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24))
    const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60))

    if (daysLeft > 1) return `${daysLeft} days`
    if (daysLeft === 1) return `1 day`
    if (hoursLeft > 1) return `${hoursLeft} hours`
    if (hoursLeft === 1) return `1 hour`
    if (minutesLeft > 1) return `${minutesLeft} minutes`
    if (minutesLeft === 1) return `1 minute`
    return "less than a minute"
}

export default function DashboardPage() {
    const { user } = useAuth()

    const [, setTick] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const { data: history } = useQuery({
        queryKey: ["quiz-history"],
        queryFn: getQuizHistory,
        enabled: !!user?.has_active_subscription,
    })

    if (!user) return null

    const firstName = user.full_name.split(" ")[0]
    const totalAttempts = history?.length || 0
    const averageScore = totalAttempts > 0
        ? Math.round(history!.reduce((sum, a) => sum + parseFloat(a.score_percentage), 0) / totalAttempts)
        : 0
    const readinessScore = Math.min(Math.round((averageScore * 0.7) + (totalAttempts * 0.5)), 100)
    const lastAttempt = history?.[0]

    return (
        <AppShell>
            <div className="space-y-6 max-w-6xl mx-auto pb-10">
                {/* Hero with Edit Profile button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
                    <div className="relative z-10">
                        <p className="text-brand-200 font-medium tracking-wide uppercase text-xs">{getGreeting()}</p>
                        <h1 className="mt-2 text-3xl lg:text-4xl font-bold">Welcome back, {firstName}</h1>
                        <p className="mt-2 text-brand-100 flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-green-400"></span>
                            {formatProgram(user.program)} • {user.level_display}
                        </p>
                        <Link
                            to="/profile"
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Edit Profile
                        </Link>
                    </div>
                    <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl px-5 py-4 border border-white/20 shadow-inner">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">1</p>
                            <p className="text-xs text-brand-200 font-medium">Day Streak</p>
                        </div>
                    </div>
                </div>

                {/* Trial / Active Banner */}
                {user.has_active_subscription && user.subscription_expires_at && (() => {
                    const expiry = new Date(user.subscription_expires_at)
                    const msLeft = expiry.getTime() - Date.now()
                    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24))

                    if (daysLeft <= 7 && msLeft > 0) {
                        const countdownText = getCountdownText(msLeft)
                        const isUrgent = daysLeft < 1
                        const isTrial = !user.has_paid

                        return (
                            <div className={`rounded-xl border-2 p-5 ${
                                isUrgent
                                    ? "border-red-400 bg-gradient-to-r from-red-50 to-orange-50"
                                    : "border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50"
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                            isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                        }`}>
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${isUrgent ? "text-red-900" : "text-amber-900"}`}>
                                                {isTrial
                                                    ? `⏳ Your free trial ends in ${countdownText}!`
                                                    : `✅ Subscription active — ${countdownText} left`}
                                            </p>
                                            <p className={`text-xs mt-1 ${isUrgent ? "text-red-800" : "text-amber-800"}`}>
                                                {isTrial ? (
                                                    <>Subscribe now — we'll add <strong>120 days on top of your trial</strong>. Access until <strong>{expiry.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>.</>
                                                ) : (
                                                    <>Your pass expires <strong>{expiry.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>. Renew early to add another 120 days.</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <Link to="/subscribe" className="shrink-0">
                                        <Button size="md" className={`!text-white shadow-md ${
                                            isUrgent
                                                ? "!bg-red-600 hover:!bg-red-700"
                                                : "!bg-amber-600 hover:!bg-amber-700"
                                        }`}>
                                            {isTrial ? "Subscribe — GHS 30 →" : "Renew — GHS 30 →"}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )
                    }
                    return null
                })()}

                {/* Subscription Banner — only when trial is fully expired */}
                {!user.has_active_subscription && (
                    <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <Badge variant="brand">Semester Pass</Badge>
                                <h2 className="mt-2 text-h3 text-brand-900">Unlock everything for GHS 30</h2>
                                <p className="mt-1 text-body-sm text-brand-800">120 days of access to all courses, quizzes, and care plan templates.</p>
                            </div>
                            <Link to="/subscribe" className="shrink-0">
                                <Button size="lg">Subscribe now →</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-border bg-white p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-on-surface">Exam Readiness</p>
                            <p className="text-xs text-on-surface-muted mt-1">Based on your scores</p>
                            <div className="mt-3 flex items-end gap-1">
                                <p className="text-4xl font-black text-brand-700">{readinessScore}</p>
                                <p className="text-lg font-bold text-brand-400 mb-1">%</p>
                            </div>
                        </div>
                        <div className="relative h-20 w-20">
                            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="text-gray-200" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="text-brand-500 transition-all duration-1000 ease-out" strokeDasharray={`${readinessScore}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-on-surface">Average Score</p>
                            <span className="text-green-600 bg-green-50 p-2 rounded-lg">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            </span>
                        </div>
                        <p className="mt-3 text-4xl font-black text-on-surface">{averageScore}%</p>
                        <p className="text-xs text-on-surface-muted mt-1">Across {totalAttempts} quizzes</p>
                    </div>

                    <div className="rounded-xl border border-brand-300 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-brand-900">Exam Simulator</p>
                            <span className="text-brand-600">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </span>
                        </div>
                        <p className="text-xs text-brand-800 mt-1 mb-3">Take a 60-minute, 50-question mixed mock exam.</p>
                        <Link to="/mock-exam">
                            <Button fullWidth size="sm">Start Mock Exam →</Button>
                        </Link>
                    </div>

                    <ExamCountdown />
                </div>

                <WeakAreasCard />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {lastAttempt ? (
                            <Link to={`/quizzes/${lastAttempt.course_id}`} className="block group rounded-2xl border border-brand-200 bg-gradient-to-br from-white to-brand-50/40 p-6 shadow-sm hover:shadow-lg hover:border-brand-300 transition-all">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <Badge variant="brand" className="mb-2">Continue Learning</Badge>
                                        <h3 className="text-xl font-bold text-on-surface group-hover:text-brand-700 transition-colors">{lastAttempt.course_title}</h3>
                                        <p className="text-sm text-on-surface-muted mt-1">{lastAttempt.course_code} • Last played {new Date(lastAttempt.started_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700">
                                        <svg className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-on-surface">Last Score</span>
                                            <span className="font-bold text-brand-700">{lastAttempt.score_percentage}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${lastAttempt.score_percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center flex flex-col items-center justify-center h-full min-h-[220px]">
                                <div className="h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-on-surface">Start your first quiz</h3>
                                <p className="text-sm text-on-surface-muted max-w-sm mt-1">Jump into your curriculum to practice questions and start building your study streak.</p>
                                <Link to="/courses" className="mt-4"><Button>Browse Courses</Button></Link>
                            </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Link to="/courses" className="group rounded-xl border border-border bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all flex flex-col items-start justify-between">
                                <div className="h-10 w-10 rounded-lg bg-surface-subtle flex items-center justify-center text-on-surface group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors mb-4">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-on-surface">All Courses & Quizzes</h3>
                                    <p className="text-xs text-on-surface-muted mt-1">Practice past questions</p>
                                </div>
                            </Link>
                            <Link to="/careplans" className="group rounded-xl border border-border bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all flex flex-col items-start justify-between">
                                <div className="h-10 w-10 rounded-lg bg-surface-subtle flex items-center justify-center text-on-surface group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors mb-4">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-on-surface">Care Plans</h3>
                                    <p className="text-xs text-on-surface-muted mt-1">Build NANDA + SMART goals</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="rounded-xl border border-border bg-white h-full flex flex-col shadow-sm">
                            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-on-surface">Recent Activity</h2>
                                <Link to="/courses" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>
                            </div>
                            <div className="flex-1 p-5">
                                {history && history.length > 0 ? (
                                    <div className="relative border-l border-border ml-3 space-y-6">
                                        {history.slice(0, 4).map((attempt) => (
                                            <div key={attempt.id} className="relative pl-6">
                                                <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-brand-300 border-2 border-white ring-2 ring-brand-50"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-on-surface-muted mb-1">{new Date(attempt.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                                    <span className="text-sm font-semibold text-on-surface leading-tight">{attempt.course_code}</span>
                                                    <span className="text-xs text-on-surface-muted truncate">{attempt.course_title}</span>
                                                    <span className={`text-xs font-bold mt-1 ${parseFloat(attempt.score_percentage) >= 50 ? 'text-green-600' : 'text-red-500'}`}>{attempt.score_percentage}% Score</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                        <p className="text-sm text-on-surface-muted">No recent activity yet. Take a quiz to see your timeline!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}