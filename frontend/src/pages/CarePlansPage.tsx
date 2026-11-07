import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { listCarePlans } from "../api/careplans"
import { useAuth } from "../contexts/AuthContext"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import EmptyState from "../components/ui/EmptyState"

export default function CarePlansPage() {
    const { user } = useAuth()

    const { data: plans, isLoading, error } = useQuery({
        queryKey: ["care-plans"],
        queryFn: listCarePlans,
        enabled: !!user,
    })

    if (!user) return null

    return (
        <AppShell>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-h1">My Care Plans</h1>
                        <p className="mt-1 text-body-sm text-on-surface-muted">
                            Build, refine, and understand NANDA care plans with SMART goals and rationales.
                        </p>
                    </div>
                    <Link to="/careplans/new" className="hidden sm:block">
                        <Button>+ New plan</Button>
                    </Link>
                </div>

                {/* Study Tool callout */}
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5 text-brand-700">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-brand-900">
                                This is your personal study companion
                            </p>
                            <p className="mt-1 text-xs text-brand-800 leading-relaxed">
                                Use NursifyGH to <strong>draft, refine, and understand</strong> your care plans — the rationales
                                and SMART goals you build here help you master the clinical reasoning behind each NANDA diagnosis.
                                When you're ready to submit to your lecturer or hospital, <strong>transcribe this plan onto the
                                    official N&amp;MC care plan form</strong>. We help you learn; you still submit on paper.
                            </p>
                        </div>
                    </div>
                </div>

                {isLoading && (
                    <div className="rounded-xl border border-border bg-white p-8 text-center">
                        <p className="text-on-surface-muted">Loading care plans…</p>
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-danger-50 p-4">
                        <p className="text-sm text-danger-700">
                            Failed to load care plans. Please try again.
                        </p>
                    </div>
                )}

                {plans && plans.length === 0 && (
                    <EmptyState
                        title="No care plans yet"
                        description="Create your first NCP with NANDA diagnoses, SMART goals, and evidence-based rationales."
                        action={
                            <Link to="/careplans/new">
                                <Button>Create your first plan</Button>
                            </Link>
                        }
                    />
                )}

                {plans && plans.length > 0 && (
                    <div className="space-y-3">
                        {plans.map((plan) => (
                            <Link
                                key={plan.id}
                                to={`/careplans/${plan.id}`}
                                className="block rounded-xl border border-border bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-h4 truncate">{plan.title}</h2>
                                        <p className="mt-1 text-body-sm text-on-surface-muted truncate">
                                            {plan.primary_diagnosis_label}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-on-surface-muted">
                                            {plan.goal_count} goal{plan.goal_count === 1 ? "" : "s"} ·{" "}
                                            {plan.intervention_count} intervention
                                            {plan.intervention_count === 1 ? "" : "s"}
                                        </p>
                                        <p className="mt-1 text-xs text-on-surface-subtle">
                                            {new Date(plan.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    {plan.is_submitted && <Badge variant="success">✓ Submitted</Badge>}
                                    {plan.is_public && !plan.is_submitted && (
                                        <Badge variant="brand">🌍 Public</Badge>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Mobile floating action button */}
            <Link
                to="/careplans/new"
                className="sm:hidden fixed bottom-24 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg hover:bg-brand-800"
                aria-label="New care plan"
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
            </Link>
        </AppShell>
    )
}