import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"

export default function PublicPlanDetailPage() {
    const { planId } = useParams<{ planId: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [showRating, setShowRating] = useState(false)
    const [ratingScore, setRatingScore] = useState(5)
    const [ratingComment, setRatingComment] = useState("")
    const [ratingError, setRatingError] = useState<string | null>(null)

    const { data: plan, isLoading, error } = useQuery({
        queryKey: ["public-plan", planId],
        queryFn: async () => {
            const { data } = await api.get(`/careplans/public/${planId}/`)
            return data
        },
        enabled: !!planId,
    })

    const forkMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post("/careplans/plans/fork-from-plan/", {
                source_plan_id: planId,
            })
            return data
        },
        onSuccess: (newPlan) => navigate(`/careplans/${newPlan.id}`),
        onError: () => alert("Couldn't copy this plan. Please try again."),
    })

    const rateMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post(`/careplans/plans/${planId}/ratings/`, {
                score: ratingScore,
                comment: ratingComment.trim(),
            })
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["public-plan", planId] })
            setShowRating(false)
            setRatingComment("")
        },
        onError: (err: any) => {
            setRatingError(err?.response?.data?.detail || "Couldn't submit rating.")
        },
    })

    if (isLoading) {
        return (
            <AppShell>
                <div className="max-w-4xl mx-auto py-12 px-4 animate-pulse">
                    <div className="h-4 bg-surface-subtle rounded w-32 mb-8" />
                    <div className="h-10 bg-surface-subtle rounded w-3/4 mb-4" />
                    <div className="h-4 bg-surface-subtle rounded w-1/2 mb-8" />
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="h-20 bg-surface-subtle rounded" />
                        <div className="h-20 bg-surface-subtle rounded" />
                        <div className="h-20 bg-surface-subtle rounded" />
                    </div>
                    <div className="h-48 bg-surface-subtle rounded mb-4" />
                    <div className="h-64 bg-surface-subtle rounded" />
                </div>
            </AppShell>
        )
    }

    if (error || !plan) {
        return (
            <AppShell>
                <div className="max-w-2xl mx-auto rounded-xl border border-border bg-white p-8 text-center mt-12">
                    <h1 className="text-h3 text-danger-700">Plan not found</h1>
                    <p className="mt-2 text-sm text-on-surface-muted">This plan may have been removed or made private.</p>
                    <Link to="/library" className="mt-4 inline-block">
                        <Button variant="secondary" size="sm">← Back to library</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto pb-20 px-4 sm:px-0">

                <Link
                    to="/library"
                    className="inline-flex items-center gap-1 text-xs text-on-surface-muted hover:text-brand-700 mb-6 font-medium"
                >
                    ← Back to library
                </Link>

                {/* Header Card */}
                <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-brand-50/30 p-6 sm:p-8 mb-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                                {plan.primary_diagnosis.code} — {plan.primary_diagnosis.label}
                            </p>
                            <h1 className="mt-2 text-3xl font-bold text-on-surface leading-tight">
                                {plan.title}
                            </h1>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                                        {plan.student_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-on-surface">By {plan.student_name}</p>
                                        <p className="text-[11px] text-on-surface-muted">
                                            {plan.student_level_display} · {plan.student_program_display}
                                        </p>
                                    </div>
                                </div>
                                {plan.student_institution && (
                                    <>
                                        <span className="text-on-surface-muted">·</span>
                                        <p className="text-xs text-on-surface-muted">{plan.student_institution}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 shrink-0">
                            <Button
                                variant="secondary"
                                size="sm"
                                loading={forkMutation.isPending}
                                onClick={() => forkMutation.mutate()}
                            >
                                📋 Copy to My Plans
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => window.print()}>
                                🖨 Print
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Views</p>
                        <p className="mt-1 text-2xl font-black text-on-surface">{plan.view_count ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Rating</p>
                        <div className="mt-1 flex items-baseline gap-1">
                            <p className="text-2xl font-black text-amber-600">
                                {plan.average_rating ? plan.average_rating.toFixed(1) : "—"}
                            </p>
                            {plan.rating_count > 0 && (
                                <p className="text-xs text-on-surface-muted font-medium">
                                    ({plan.rating_count})
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">Updated</p>
                        <p className="mt-1 text-base font-bold text-on-surface">
                            {new Date(plan.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                    </div>
                </div>

                {/* Patient Scenario */}
                <section className="rounded-xl border border-border bg-white p-6 mb-4">
                    <h2 className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-3">01 · Patient Scenario</h2>
                    <p className="text-base text-on-surface leading-relaxed whitespace-pre-line">
                        {plan.patient_scenario}
                    </p>
                </section>

                {/* Diagnosis */}
                <section className="rounded-xl border border-brand-200 bg-white p-6 mb-4">
                    <h2 className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-3">02 · Nursing Diagnosis</h2>
                    <div className="flex flex-wrap items-baseline gap-2 mb-2">
                        <h3 className="text-xl font-bold text-brand-900">{plan.primary_diagnosis.label}</h3>
                        <span className="text-xs font-medium text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                            {plan.primary_diagnosis.domain_display}
                        </span>
                    </div>
                    <p className="text-sm text-on-surface-muted italic border-l-4 border-brand-200 pl-4 py-1">
                        "{plan.primary_diagnosis.definition}"
                    </p>
                </section>

                {/* Goals */}
                <section className="rounded-xl border border-border bg-white p-6 mb-4">
                    <h2 className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-4">03 · SMART Goals</h2>
                    {plan.goals.length === 0 ? (
                        <p className="text-sm text-on-surface-muted italic">No goals added.</p>
                    ) : (
                        <ul className="space-y-4">
                            {plan.goals.map((goal: any, idx: number) => (
                                <li key={goal.id} className="rounded-lg border border-border bg-surface-subtle/30 p-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full w-1 bg-brand-500" />
                                    <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1">
                                        Goal {idx + 1}
                                    </p>
                                    <p className="text-sm text-on-surface leading-relaxed">{goal.specific}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Interventions */}
                <section className="rounded-xl border border-border bg-white p-6 mb-4">
                    <h2 className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-4">04 · Nursing Interventions</h2>
                    {plan.interventions.length === 0 ? (
                        <p className="text-sm text-on-surface-muted italic">No interventions added.</p>
                    ) : (
                        <ul className="space-y-4">
                            {plan.interventions.map((iv: any, idx: number) => (
                                <li key={iv.id} className="rounded-lg border border-border bg-surface-subtle/30 p-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full w-1 bg-blue-500" />
                                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                                        Intervention {idx + 1}
                                    </p>
                                    <p className="text-sm font-medium text-on-surface leading-relaxed">{iv.action}</p>
                                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Rationale</p>
                                        <p className="text-xs text-amber-900 leading-relaxed">{iv.rationale}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Rating Section */}
                <section className="rounded-xl border border-border bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-h4">Community Reviews</h2>
                            <p className="text-xs text-on-surface-muted mt-0.5">
                                {plan.rating_count > 0
                                    ? `Rated ${plan.average_rating?.toFixed(1)} by ${plan.rating_count} student${plan.rating_count === 1 ? "" : "s"}`
                                    : "Be the first to review this plan"}
                            </p>
                        </div>
                        {!showRating && (
                            <Button size="sm" variant="secondary" onClick={() => setShowRating(true)}>
                                Leave Review
                            </Button>
                        )}
                    </div>

                    {showRating && (
                        <div className="rounded-xl border-2 border-brand-200 bg-brand-50/30 p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-on-surface mb-2">Your Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setRatingScore(n)}
                                            className={`h-10 w-10 rounded-full border-2 transition-all text-lg ${n <= ratingScore
                                                    ? "border-amber-400 bg-amber-400 text-white scale-105"
                                                    : "border-border bg-white text-on-surface-muted hover:border-amber-300"
                                                }`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-on-surface mb-1.5">Comment (optional)</label>
                                <textarea
                                    rows={3}
                                    value={ratingComment}
                                    onChange={(e) => setRatingComment(e.target.value)}
                                    placeholder="What did you find most useful about this plan?"
                                    className="block w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                            {ratingError && <p className="text-sm text-danger-700">{ratingError}</p>}
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" size="sm" onClick={() => { setShowRating(false); setRatingError(null) }}>
                                    Cancel
                                </Button>
                                <Button size="sm" loading={rateMutation.isPending} onClick={() => rateMutation.mutate()}>
                                    Submit Review
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Disclaimer */}
                <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-xs text-brand-800 flex items-start gap-2">
                    <svg className="h-4 w-4 shrink-0 mt-0.5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p><strong>Study tool only:</strong> Verify with your clinical instructor before using in patient care. NursifyGH is not affiliated with the N&MC of Ghana.</p>
                </div>
            </div>
        </AppShell>
    )
}