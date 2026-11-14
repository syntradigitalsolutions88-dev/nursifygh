import { useState, useMemo } from "react"
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
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<"all" | "draft" | "submitted" | "public">("all")

    const { data: plans, isLoading, error } = useQuery({
        queryKey: ["care-plans"],
        queryFn: listCarePlans,
        enabled: !!user,
    })

    // Filter and search logic
    const filteredPlans = useMemo(() => {
        if (!plans) return []
        return plans.filter((plan: any) => {
            const matchesSearch =
                plan.title.toLowerCase().includes(search.toLowerCase()) ||
                plan.primary_diagnosis_label.toLowerCase().includes(search.toLowerCase())

            const matchesFilter =
                filter === "all" ? true :
                    filter === "submitted" ? plan.is_submitted :
                        filter === "public" ? plan.is_public && !plan.is_submitted :
                /* draft */ !plan.is_submitted && !plan.is_public

            return matchesSearch && matchesFilter
        })
    }, [plans, search, filter])

    // Stats
    const totalCount = plans?.length || 0
    const submittedCount = plans?.filter((p: any) => p.is_submitted).length || 0
    const publicCount = plans?.filter((p: any) => p.is_public).length || 0

    if (!user) return null

    return (
        <AppShell>
            <div className="space-y-6">

                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Care Plan Workspace</p>
                        <h1 className="mt-1 text-h1">My Care Plans</h1>
                        <p className="mt-1 text-body-sm text-on-surface-muted max-w-2xl">
                            Draft, refine, and master NANDA care plans with AI-generated SMART goals and evidence-based rationales.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/library" className="hidden sm:block">
                            <Button variant="secondary">Browse Library</Button>
                        </Link>
                        <Link to="/careplans/new">
                            <Button>+ New Plan</Button>
                        </Link>
                    </div>
                </header>

                {/* Stats Bar */}
                {!isLoading && plans && plans.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-border bg-white p-4">
                            <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider">Total Plans</p>
                            <p className="mt-1 text-2xl font-black text-brand-700">{totalCount}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-white p-4">
                            <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider">Submitted</p>
                            <p className="mt-1 text-2xl font-black text-green-700">{submittedCount}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-white p-4">
                            <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider">Public</p>
                            <p className="mt-1 text-2xl font-black text-blue-700">{publicCount}</p>
                        </div>
                    </div>
                )}

                {/* AI Callout Banner (only when they have few plans) */}
                {!isLoading && plans && plans.length < 3 && (
                    <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
                        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 shrink-0 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-lg font-bold">Generate a Care Plan in 30 seconds</p>
                                    <p className="text-sm text-brand-100 mt-1">Describe the patient scenario. Our AI writes SMART goals and rationales instantly.</p>
                                </div>
                            </div>
                            <Link to="/careplans/new" className="shrink-0">
                                <button className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-900 px-5 py-2.5 text-sm font-bold hover:bg-brand-50 transition-colors shadow-sm">
                                    Try AI Autofill
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Search & Filter Bar */}
                {!isLoading && plans && plans.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by title or diagnosis..."
                                className="w-full rounded-lg border border-border bg-white pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                            />
                        </div>
                        <div className="flex gap-1 bg-surface-subtle rounded-lg p-1">
                            {(["all", "draft", "submitted", "public"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${filter === f ? "bg-white text-brand-700 shadow-sm" : "text-on-surface-muted hover:text-on-surface"
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading Skeletons */}
                {isLoading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-xl border border-border bg-white p-5 animate-pulse">
                                <div className="h-4 bg-surface-subtle rounded w-1/3 mb-3" />
                                <div className="h-3 bg-surface-subtle rounded w-1/2 mb-4" />
                                <div className="flex gap-2">
                                    <div className="h-5 w-16 bg-surface-subtle rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-danger-50 p-4">
                        <p className="text-sm text-danger-700">Failed to load care plans. Please try again.</p>
                    </div>
                )}

                {/* Empty State (no plans at all) */}
                {!isLoading && plans && plans.length === 0 && (
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

                {/* No Results (filter/search returned nothing) */}
                {!isLoading && plans && plans.length > 0 && filteredPlans.length === 0 && (
                    <div className="rounded-xl border border-border bg-white p-12 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-on-surface-muted mb-3">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-on-surface">No plans match your search</p>
                        <p className="text-xs text-on-surface-muted mt-1">Try different keywords or clear the filter.</p>
                        <button
                            onClick={() => { setSearch(""); setFilter("all"); }}
                            className="mt-3 text-xs font-bold text-brand-600 hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}

                {/* Plans List */}
                {!isLoading && filteredPlans.length > 0 && (
                    <div className="space-y-3">
                        {filteredPlans.map((plan: any) => (
                            <PlanRow key={plan.id} plan={plan} />
                        ))}
                    </div>
                )}
            </div>

            {/* Floating New Plan Button (mobile) */}
            <Link
                to="/careplans/new"
                className="sm:hidden fixed bottom-24 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg hover:bg-brand-800 active:scale-95 transition-transform"
                aria-label="New care plan"
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
            </Link>
        </AppShell>
    )
}

function PlanRow({ plan }: { plan: any }) {
    const updatedAgo = formatTimeAgo(new Date(plan.updated_at))

    return (
        <Link
            to={`/careplans/${plan.id}`}
            className="group block rounded-xl border border-border bg-white p-5 hover:border-brand-400 hover:shadow-md transition-all"
        >
            <div className="flex items-start justify-between gap-4">

                {/* Left: Icon + Title */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${plan.is_submitted
                            ? "bg-green-100 text-green-700"
                            : plan.is_public
                                ? "bg-blue-100 text-blue-700"
                                : "bg-brand-100 text-brand-700"
                        }`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className="text-h4 truncate group-hover:text-brand-700 transition-colors">
                            {plan.title}
                        </h2>
                        <p className="mt-0.5 text-body-sm text-on-surface-muted truncate">
                            {plan.primary_diagnosis_label}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {plan.is_submitted ? (
                                <Badge variant="success">✓ Submitted</Badge>
                            ) : plan.is_public ? (
                                <Badge variant="brand">🌍 Public</Badge>
                            ) : (
                                <Badge variant="default">📝 Draft</Badge>
                            )}
                            <span className="text-xs text-on-surface-muted">
                                {plan.goal_count} goal{plan.goal_count === 1 ? "" : "s"} · {plan.intervention_count} intervention{plan.intervention_count === 1 ? "" : "s"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Time + Arrow */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-on-surface-muted whitespace-nowrap">
                        {updatedAgo}
                    </p>
                    <svg className="h-4 w-4 text-on-surface-subtle group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    )
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return "Just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}