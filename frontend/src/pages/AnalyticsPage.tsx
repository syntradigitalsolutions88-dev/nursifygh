import { useEffect, useMemo, useState } from "react"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import api from "../api/client"

interface WeakAreaItem {
    topic?: string
    course_code?: string
    course_title?: string
    accuracy?: number
    attempts?: number
}

interface QuizAttemptItem {
    id?: string | number
    course_code?: string
    course_title?: string
    score?: number
    total?: number
    percentage?: number
    created_at?: string
}

interface RevisionStats {
    total_cards?: number
    due_today?: number
    streak_days?: number
    recall_accuracy?: number
    bookmarked_count?: number
}

export default function AnalyticsPage() {
    const [weakAreas, setWeakAreas] = useState<WeakAreaItem[]>([])
    const [history, setHistory] = useState<QuizAttemptItem[]>([])
    const [revision, setRevision] = useState<RevisionStats>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function loadAnalytics() {
        setLoading(true)
        setError(null)
        try {
            const [weakRes, histRes, revRes] = await Promise.allSettled([
                api.get("/academics/weak-areas/"),
                api.get("/academics/quizzes/history/"),
                api.get("/academics/flashcards/stats/"),
            ])

            if (weakRes.status === "fulfilled") {
                const raw = Array.isArray(weakRes.value.data)
                    ? weakRes.value.data
                    : weakRes.value.data?.results ?? weakRes.value.data?.weak_areas ?? []
                setWeakAreas(Array.isArray(raw) ? raw : [])
            }

            if (histRes.status === "fulfilled") {
                const raw = Array.isArray(histRes.value.data)
                    ? histRes.value.data
                    : histRes.value.data?.results ?? histRes.value.data?.attempts ?? []
                setHistory(Array.isArray(raw) ? raw : [])
            }

            if (revRes.status === "fulfilled" && revRes.value.data) {
                setRevision(revRes.value.data)
            }
        } catch {
            setError("Unable to load performance analytics right now.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAnalytics()
    }, [])

    const summary = useMemo(() => {
        const percentages = history
            .map((item) => {
                if (typeof item.percentage === "number") return item.percentage
                if (typeof item.score === "number" && typeof item.total === "number" && item.total > 0) {
                    return Math.round((item.score / item.total) * 100)
                }
                return null
            })
            .filter((v): v is number => v !== null)

        const avgScore =
            percentages.length > 0
                ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
                : 0

        return {
            quizCount: history.length,
            avgScore,
            recallAccuracy: revision.recall_accuracy ?? 0,
            streakDays: revision.streak_days ?? 0,
        }
    }, [history, revision])

    return (
        <AppShell>
            <div className="max-w-4xl space-y-6 pb-24 sm:pb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-h1">Personal Performance Analytics</h1>
                        <p className="mt-1 text-body-sm text-on-surface-muted">
                            Track quiz readiness, spaced-repetition recall, and clinical weak spots across your courses.
                        </p>
                    </div>
                    <Button variant="secondary" onClick={loadAnalytics} disabled={loading}>
                        {loading ? "Refreshing..." : "Refresh Metrics"}
                    </Button>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Avg Quiz Score</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{summary.avgScore}%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Quizzes Taken</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{summary.quizCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Card Recall</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{summary.recallAccuracy}%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-muted">Study Streak</p>
                        <p className="mt-1 text-2xl font-bold text-on-surface">{summary.streakDays}d</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-h4 text-on-surface">Priority Weak Areas</h2>
                        <Badge variant="neutral">{weakAreas.length} tracked</Badge>
                    </div>

                    {loading ? (
                        <p className="text-sm text-on-surface-muted">Loading weak areas...</p>
                    ) : weakAreas.length === 0 ? (
                        <p className="text-sm text-on-surface-muted">
                            No weak topics flagged yet. Complete quizzes or clinical cases to generate targeted study priorities.
                        </p>
                    ) : (
                        <div className="space-y-2.5">
                            {weakAreas.map((area, idx) => {
                                const acc = typeof area.accuracy === "number" ? Math.max(0, Math.min(100, area.accuracy)) : 0
                                return (
                                    <div key={idx} className="rounded-xl border border-border p-3.5 space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-on-surface">
                                                {area.topic || area.course_title || area.course_code || `Topic ${idx + 1}`}
                                            </span>
                                            <span className="text-xs font-semibold text-on-surface-muted">
                                                {acc}% accuracy
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-brand-700"
                                                style={{ width: `${acc}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
                    <h2 className="text-h4 text-on-surface">Recent Quiz Attempts</h2>
                    {loading ? (
                        <p className="text-sm text-on-surface-muted">Loading quiz history...</p>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-on-surface-muted">
                            No quiz attempts recorded yet. Try a course quiz or practice drill to build your score history.
                        </p>
                    ) : (
                        <div className="divide-y divide-border">
                            {history.slice(0, 8).map((item, idx) => {
                                const pct =
                                    typeof item.percentage === "number"
                                        ? item.percentage
                                        : typeof item.score === "number" && typeof item.total === "number" && item.total > 0
                                        ? Math.round((item.score / item.total) * 100)
                                        : 0
                                return (
                                    <div key={item.id ?? idx} className="py-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-on-surface">
                                                {item.course_title || item.course_code || "Assessment Attempt"}
                                            </p>
                                            {item.created_at && (
                                                <p className="text-xs text-on-surface-muted">{item.created_at}</p>
                                            )}
                                        </div>
                                        <Badge variant={pct >= 70 ? "success" : "warning"}>{pct}%</Badge>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    )
}
