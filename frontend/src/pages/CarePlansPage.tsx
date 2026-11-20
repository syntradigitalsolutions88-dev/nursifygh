import { useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { listCarePlans, listTemplates, forkTemplate } from "../api/careplans"
import { useAuth } from "../contexts/AuthContext"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import EmptyState from "../components/ui/EmptyState"

export default function CarePlansPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // State for switching between views
    const [view, setView] = useState<"my-plans" | "templates">("my-plans")
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<"all" | "draft" | "submitted" | "public">("all")

    // --- Queries ---
    const { data: plans, isLoading: loadingPlans, error } = useQuery({
        queryKey: ["care-plans"],
        queryFn: listCarePlans,
        enabled: !!user && view === "my-plans",
    })

    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ["careplan-templates"],
        queryFn: () => listTemplates(),
        enabled: !!user && view === "templates",
    })

    // --- Mutations ---
    const forkMutation = useMutation({
        mutationFn: (templateId: string) => forkTemplate(templateId),
        onSuccess: (newPlan) => {
            // Invalidate so the new plan shows up in "My Plans"
            queryClient.invalidateQueries({ queryKey: ["care-plans"] })
            // Redirect straight to the newly created plan builder
            navigate(`/careplans/${newPlan.id}`)
        },
    })

    // --- Filtering ---
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

    const filteredTemplates = useMemo(() => {
        if (!templates) return []
        return templates.filter((t: any) =>
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.description?.toLowerCase().includes(search.toLowerCase())
        )
    }, [templates, search])

    // Stats
    const totalCount = plans?.length || 0
    const submittedCount = plans?.filter((p: any) => p.is_submitted).length || 0
    const publicCount = plans?.filter((p: any) => p.is_public).length || 0

    if (!user) return null

    return (
        <AppShell>
            <div className="space-y-6 max-w-6xl mx-auto">
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

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button
                        onClick={() => { setView("my-plans"); setSearch(""); }}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${view === "my-plans" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        My Workspace
                    </button>
                    <button
                        onClick={() => { setView("templates"); setSearch(""); }}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${view === "templates" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Study Templates
                    </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={view === "templates" ? "Search templates by condition (e.g., Malaria, TB)..." : "Search my plans..."}
                            className="w-full rounded-lg border border-border bg-white pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                        />
                    </div>
                    {/* Only show filter on My Plans */}
                    {view === "my-plans" && (
                        <div className="flex gap-1 bg-surface-subtle rounded-lg p-1">
                            {(["all", "draft", "submitted", "public"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${filter === f ? "bg-white text-brand-700 shadow-sm" : "text-on-surface-muted hover:text-on-surface"}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ======================= MY PLANS VIEW ======================= */}
                {view === "my-plans" && (
                    <>
                        {/* Stats Bar */}
                        {!loadingPlans && plans && plans.length > 0 && (
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

                        {/* AI Callout Banner */}
                        {!loadingPlans && plans && plans.length < 3 && (
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

                        {/* Loading */}
                        {loadingPlans && (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="rounded-xl border border-border bg-white p-5 animate-pulse">
                                        <div className="h-4 bg-surface-subtle rounded w-1/3 mb-3" />
                                        <div className="h-3 bg-surface-subtle rounded w-1/2 mb-4" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!loadingPlans && plans && plans.length === 0 && (
                            <EmptyState
                                title="No care plans yet"
                                description="Create your first NCP with NANDA diagnoses, SMART goals, and evidence-based rationales."
                                action={<Link to="/careplans/new"><Button>Create your first plan</Button></Link>}
                            />
                        )}

                        {/* Plans List */}
                        {!loadingPlans && filteredPlans.length > 0 && (
                            <div className="space-y-3">
                                {filteredPlans.map((plan: any) => (
                                    <PlanRow key={plan.id} plan={plan} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ======================= TEMPLATES VIEW ======================= */}
                {view === "templates" && (
                    <>
                        {loadingTemplates ? (
                            <div className="py-12 text-center text-gray-500 animate-pulse">Loading NANDA templates...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredTemplates.map((template: any) => (
                                    <div key={template.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 hover:border-brand-300 hover:shadow-md transition-all">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">NANDA Template</span>
                                            </div>
                                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{template.title}</h3>
                                            <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">{template.description}</p>

                                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs font-medium text-gray-600">
                                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> {template.goal_count || 3} Goals</div>
                                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {template.intervention_count || 5} Interventions</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => forkMutation.mutate(template.id)}
                                            disabled={forkMutation.isPending}
                                            className="mt-5 w-full rounded-lg bg-gray-50 border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-brand-700 hover:border-brand-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {forkMutation.isPending ? "Forking..." : "Use This Template →"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
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

// ─── Sub-components ────────────────────────────────────────────────────────────

function PlanRow({ plan }: { plan: any }) {
    const updatedAgo = formatTimeAgo(new Date(plan.updated_at))

    return (
        <Link
            to={`/careplans/${plan.id}`}
            className="group block rounded-xl border border-border bg-white p-5 hover:border-brand-400 hover:shadow-md transition-all"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${plan.is_submitted ? "bg-green-100 text-green-700" : plan.is_public ? "bg-blue-100 text-blue-700" : "bg-brand-100 text-brand-700"}`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-h4 truncate group-hover:text-brand-700 transition-colors">{plan.title}</h2>
                        <p className="mt-0.5 text-body-sm text-on-surface-muted truncate">{plan.primary_diagnosis_label}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {plan.is_submitted ? <Badge variant="success">✓ Submitted</Badge> : plan.is_public ? <Badge variant="brand">🌍 Public</Badge> : <Badge variant="brand">📝 Draft</Badge>}
                            <span className="text-xs text-on-surface-muted">{plan.goal_count} goal{plan.goal_count === 1 ? "" : "s"} · {plan.intervention_count} intervention{plan.intervention_count === 1 ? "" : "s"}</span>
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-on-surface-muted whitespace-nowrap">{updatedAgo}</p>
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