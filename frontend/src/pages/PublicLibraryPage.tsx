import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { listPublicPlans } from "../api/careplans"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"

export default function PublicLibraryPage() {
    const [search, setSearch] = useState("")
    const [sortBy, setSortBy] = useState<"newest" | "rating" | "views">("newest")

    const { data: plans, isLoading, error } = useQuery({
        queryKey: ["public-plans"],
        queryFn: listPublicPlans,
    })

    const filteredPlans = useMemo(() => {
        if (!plans) return []
        const filtered = plans.filter((p: any) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.primary_diagnosis.label.toLowerCase().includes(search.toLowerCase())
        )
        return [...filtered].sort((a: any, b: any) => {
            if (sortBy === "rating") return (b.average_rating || 0) - (a.average_rating || 0)
            if (sortBy === "views") return (b.view_count || 0) - (a.view_count || 0)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
    }, [plans, search, sortBy])

    return (
        <AppShell>
            <div className="space-y-6 max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Community Library</p>
                        <h1 className="mt-1 text-h1">Community Care Plans</h1>
                        <p className="mt-1 text-body-sm text-on-surface-muted max-w-2xl">
                            Browse NANDA-based care plans shared by other students. Copy them to your workspace or leave a review.
                        </p>
                    </div>
                    <Link to="/careplans/new">
                        <Button>+ Create a Plan</Button>
                    </Link>
                </div>

                {/* Search & Sort Bar */}
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
                        <div className="flex gap-1 bg-surface-subtle rounded-lg p-1 shrink-0">
                            {(["newest", "rating", "views"] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSortBy(s)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${sortBy === s ? "bg-white text-brand-700 shadow-sm" : "text-on-surface-muted hover:text-on-surface"
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading Skeletons */}
                {isLoading && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="rounded-xl border border-border bg-white p-5 animate-pulse">
                                <div className="h-4 bg-surface-subtle rounded w-2/3 mb-2" />
                                <div className="h-3 bg-surface-subtle rounded w-1/2 mb-4" />
                                <div className="h-20 bg-surface-subtle rounded mb-3" />
                                <div className="flex gap-2">
                                    <div className="h-5 w-16 bg-surface-subtle rounded-full" />
                                    <div className="h-5 w-20 bg-surface-subtle rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-danger-50 p-4">
                        <p className="text-sm text-danger-700">Failed to load community plans. Please try again.</p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && plans && plans.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-border bg-surface-subtle/30 p-12 text-center">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 mb-4">
                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <p className="text-body-sm font-bold text-on-surface">
                            No community care plans yet
                        </p>
                        <p className="mt-1 text-xs text-on-surface-muted max-w-sm mx-auto">
                            Be the first to share a plan. Help thousands of students learn from your work.
                        </p>
                        <Link to="/careplans/new" className="mt-4 inline-block">
                            <Button size="sm">Create a Care Plan →</Button>
                        </Link>
                    </div>
                )}

                {/* No Results State */}
                {!isLoading && plans && plans.length > 0 && filteredPlans.length === 0 && (
                    <div className="rounded-xl border border-border bg-white p-12 text-center">
                        <p className="text-sm font-semibold text-on-surface">No plans match your search</p>
                        <p className="text-xs text-on-surface-muted mt-1">Try different keywords or clear the search.</p>
                        <button
                            onClick={() => setSearch("")}
                            className="mt-3 text-xs font-bold text-brand-600 hover:underline"
                        >
                            Clear search
                        </button>
                    </div>
                )}

                {/* Plan Cards Grid */}
                {!isLoading && filteredPlans.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredPlans.map((plan: any) => (
                            <PlanCard key={plan.id} plan={plan} />
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    )
}

function PlanCard({ plan }: { plan: any }) {
    return (
        <Link
            to={`/library/${plan.id}`}
            className="group flex flex-col rounded-xl border border-border bg-white p-5 hover:border-brand-400 hover:shadow-lg transition-all"
        >
            {/* Title & Rating */}
            <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="text-h4 text-on-surface group-hover:text-brand-700 transition-colors line-clamp-2 flex-1">
                    {plan.title}
                </h2>
                {plan.rating_count > 0 && (
                    <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {plan.average_rating?.toFixed(1)}
                    </div>
                )}
            </div>

            {/* Diagnosis Badge */}
            <p className="text-[11px] font-bold text-brand-600 uppercase tracking-wider mb-3">
                {plan.primary_diagnosis.domain_display}
            </p>

            {/* Diagnosis label */}
            <div className="flex-1 mb-4">
                <p className="text-xs text-on-surface-muted">
                    <span className="font-mono font-bold text-on-surface">{plan.primary_diagnosis.code}</span> · {plan.primary_diagnosis.label}
                </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-[11px] text-on-surface-muted pb-3 border-b border-border">
                <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {plan.goals.length} goals
                </span>
                <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {plan.interventions.length} interventions
                </span>
                <span className="flex items-center gap-1 ml-auto">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {plan.view_count ?? 0}
                </span>
            </div>

            {/* Author */}
            <div className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {plan.student_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <p className="text-xs text-on-surface-muted truncate">
                        {plan.student_name}
                    </p>
                </div>
                <svg className="h-4 w-4 text-on-surface-subtle group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </Link>
    )
}