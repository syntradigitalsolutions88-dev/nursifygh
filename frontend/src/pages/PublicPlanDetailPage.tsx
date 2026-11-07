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
            alert("Rating submitted. Thank you!")
        },
        onError: (err: any) => {
            setRatingError(err?.response?.data?.detail || "Couldn't submit rating.")
        },
    })

    if (isLoading) {
        return (
            <AppShell>
                <div className="text-center py-12">
                    <p className="text-on-surface-muted">Loading plan…</p>
                </div>
            </AppShell>
        )
    }

    if (error || !plan) {
        return (
            <AppShell>
                <div className="rounded-xl border border-border bg-white p-8 text-center">
                    <h1 className="text-h3 text-danger-700">Plan not found</h1>
                    <Link to="/library" className="mt-4 inline-block">
                        <Button variant="secondary" size="sm">← Back to library</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell>
            <div className="max-w-3xl space-y-6">
                <Link
                    to="/library"
                    className="inline-flex items-center gap-1 text-xs text-on-surface-muted hover:text-brand-700"
                >
                    ← Back to library
                </Link>

                {/* Header with author info */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-caption text-brand-600">
                            {plan.primary_diagnosis.code} — {plan.primary_diagnosis.label}
                        </p>
                        <h1 className="mt-2 text-h1">{plan.title}</h1>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-on-surface-muted">
                            <span>By <strong className="text-on-surface">{plan.student_name}</strong></span>
                            {plan.student_level_display && <span>· {plan.student_level_display}</span>}
                            {plan.student_program_display && <span>· {plan.student_program_display}</span>}
                            {plan.student_institution && <span>· {plan.student_institution}</span>}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            loading={forkMutation.isPending}
                            onClick={() => forkMutation.mutate()}
                        >
                            📋 Copy to my plans
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => window.print()}
                        >
                            🖨 Print
                        </Button>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-white p-3">
                        <p className="text-caption">Views</p>
                        <p className="mt-1 text-h3 text-on-surface">{plan.view_count ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-white p-3">
                        <p className="text-caption">Rating</p>
                        <p className="mt-1 text-h3 text-on-surface">
                            {plan.average_rating ? plan.average_rating.toFixed(1) : "—"}
                        </p>
                        <p className="text-xs text-on-surface-muted">
                            {plan.rating_count ?? 0} review{plan.rating_count === 1 ? "" : "s"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border bg-white p-3">
                        <p className="text-caption">Updated</p>
                        <p className="mt-1 text-h4 text-on-surface">
                            {new Date(plan.updated_at).toLocaleDateString("en-GB", {
                                day: "numeric", month: "short",
                            })}
                        </p>
                    </div>
                </div>

                <section className="rounded-xl border border-border bg-white p-6">
                    <h2 className="text-caption">Patient scenario</h2>
                    <p className="mt-3 text-body-sm text-on-surface whitespace-pre-line">
                        {plan.patient_scenario}
                    </p>
                </section>

                <section className="rounded-xl border border-border bg-white p-6">
                    <h2 className="text-caption">NANDA diagnosis</h2>
                    <p className="mt-3 text-h3">
                        {plan.primary_diagnosis.code} — {plan.primary_diagnosis.label}
                    </p>
                    <Badge variant="brand" className="mt-2">
                        {plan.primary_diagnosis.domain_display}
                    </Badge>
                    <p className="mt-3 text-body-sm text-on-surface-muted">
                        {plan.primary_diagnosis.definition}
                    </p>
                </section>

                <section className="rounded-xl border border-border bg-white p-6">
                    <h2 className="text-h4 mb-4">SMART goals</h2>
                    {plan.goals.length === 0 ? (
                        <p className="text-body-sm text-on-surface-muted italic">No goals added.</p>
                    ) : (
                        <ul className="space-y-4">
                            {plan.goals.map((goal: any, idx: number) => (
                                <li key={goal.id} className="border-l-2 border-brand-300 pl-4">
                                    <p className="text-xs font-medium text-on-surface-muted">Goal {idx + 1}</p>
                                    <dl className="mt-2 space-y-1 text-body-sm">
                                        <div><dt className="inline font-semibold">S: </dt><dd className="inline">{goal.specific}</dd></div>
                                        <div><dt className="inline font-semibold">M: </dt><dd className="inline">{goal.measurable}</dd></div>
                                        <div><dt className="inline font-semibold">A: </dt><dd className="inline">{goal.achievable}</dd></div>
                                        <div><dt className="inline font-semibold">R: </dt><dd className="inline">{goal.relevant}</dd></div>
                                        <div><dt className="inline font-semibold">T: </dt><dd className="inline">{goal.time_bound}</dd></div>
                                    </dl>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="rounded-xl border border-border bg-white p-6">
                    <h2 className="text-h4 mb-4">Nursing interventions</h2>
                    {plan.interventions.length === 0 ? (
                        <p className="text-body-sm text-on-surface-muted italic">No interventions added.</p>
                    ) : (
                        <ul className="space-y-4">
                            {plan.interventions.map((iv: any, idx: number) => (
                                <li key={iv.id} className="border-l-2 border-brand-300 pl-4">
                                    <p className="text-xs font-medium text-on-surface-muted">Intervention {idx + 1}</p>
                                    <p className="mt-1 text-body-sm text-on-surface">{iv.action}</p>
                                    <div className="mt-2 rounded-lg bg-brand-50 p-3">
                                        <p className="text-xs font-semibold text-brand-700">Rationale</p>
                                        <p className="mt-1 text-xs text-brand-800">{iv.rationale}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Rating section */}
                <section className="rounded-xl border border-border bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-h4">Rate this plan</h2>
                        {!showRating && (
                            <Button size="sm" variant="secondary" onClick={() => setShowRating(true)}>
                                Leave a review
                            </Button>
                        )}
                    </div>

                    {!showRating && (plan.rating_count ?? 0) === 0 && (
                        <p className="text-body-sm text-on-surface-muted italic">
                            No reviews yet. Be the first to rate this plan.
                        </p>
                    )}

                    {showRating && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-on-surface mb-2">
                                    Your rating
                                </label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setRatingScore(n)}
                                            className={`h-10 w-10 rounded-full border transition-colors ${n <= ratingScore
                                                ? "border-amber-500 bg-amber-500 text-white"
                                                : "border-border bg-white text-on-surface-muted"
                                                }`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface mb-1.5">
                                    Comment (optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={ratingComment}
                                    onChange={(e) => setRatingComment(e.target.value)}
                                    placeholder="What did you find useful?"
                                    className="block w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
                                />
                            </div>
                            {ratingError && <p className="text-sm text-danger-700">{ratingError}</p>}
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => { setShowRating(false); setRatingError(null) }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    loading={rateMutation.isPending}
                                    onClick={() => rateMutation.mutate()}
                                >
                                    Submit review
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-xs text-brand-800">
                    <strong>Study tool:</strong> Verify with your clinical instructor before using in patient care.
                </div>
            </div>
        </AppShell>
    )
}