import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { listPublicPlans } from "../api/careplans"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"

export default function PublicLibraryPage() {
    const { data: plans, isLoading, error } = useQuery({
        queryKey: ["public-plans"],
        queryFn: listPublicPlans,
    })

    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-h1">Community Care Plans</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        Browse NANDA-based care plans shared by other students for inspiration.
                    </p>
                </div>

                {isLoading && (
                    <div className="rounded-xl border border-border bg-white p-8 text-center">
                        <p className="text-on-surface-muted">Loading plans…</p>
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-danger-50 p-4">
                        <p className="text-sm text-danger-700">Failed to load public plans.</p>
                    </div>
                )}

                {plans && plans.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center">
                        <p className="text-body-sm font-medium text-on-surface">
                            No community care plans yet
                        </p>
                        <p className="mt-1 text-xs text-on-surface-muted">
                            Be the first to share a plan and help other students learn.
                        </p>
                        <Link to="/careplans/new" className="mt-4 inline-block">
                            <Button size="sm">Create a care plan →</Button>
                        </Link>
                    </div>
                )}

                {plans && plans.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {plans.map((plan) => (
                            <Link
                                key={plan.id}
                                to={`/library/${plan.id}`}
                                className="group block rounded-xl border border-border bg-white p-5 hover:border-brand-300 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-h4 text-on-surface truncate group-hover:text-brand-700 transition-colors">
                                            {plan.title}
                                        </h2>
                                        <p className="mt-1 text-xs text-on-surface-muted">
                                            {plan.primary_diagnosis.code} · {plan.primary_diagnosis.label}
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-brand-600">
                                            {plan.primary_diagnosis.domain_display}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {plan.rating_count > 0 ? (
                                            <div className="flex items-center gap-1 text-xs font-medium text-amber-700">
                                                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span>{plan.average_rating?.toFixed(1)}</span>
                                                <span className="text-on-surface-muted">({plan.rating_count})</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-on-surface-muted">No ratings</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-4 text-xs text-on-surface-muted">
                                    <div className="flex items-center gap-1">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>{plan.goals.length} goal{plan.goals.length === 1 ? "" : "s"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span>{plan.interventions.length} intervention{plan.interventions.length === 1 ? "" : "s"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        <span>{plan.view_count ?? 0}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                    <p className="text-xs text-on-surface-muted">
                                        By <span className="font-medium text-on-surface">{plan.student_name}</span>
                                    </p>
                                    <p className="text-xs text-on-surface-muted">
                                        {new Date(plan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    )
}