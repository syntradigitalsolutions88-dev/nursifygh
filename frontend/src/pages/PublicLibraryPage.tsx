import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { listPublicPlans } from "../api/careplans"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"

export default function PublicLibraryPage() {
    const [search, setSearch] = useState("")

    const { data: plans, isLoading } = useQuery({
        queryKey: ["public-plans"],
        queryFn: listPublicPlans,
    })

    const filteredPlans = useMemo(() => {
        if (!plans) return []
        return plans.filter((p: any) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.primary_diagnosis_label?.toLowerCase().includes(search.toLowerCase())
        )
    }, [plans, search])

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Community Library</p>
                        <h1 className="mt-1 text-3xl font-serif font-bold text-on-surface">Master Care Plans</h1>
                        <p className="mt-2 text-sm text-on-surface-muted max-w-2xl">
                            Browse 100+ A-grade nursing care plans shared by top students and NursifyGH instructors. Read them, rate them, or copy them to your workspace to study.
                        </p>
                    </div>
                    <Link to="/careplans/new">
                        <Button>+ Create a Plan</Button>
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-xl">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by diagnosis, disease, or condition (e.g., Malaria, TB)..."
                        className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
                    />
                </div>

                {/* Loading */}
                {isLoading && <div className="py-12 text-center text-gray-500 animate-pulse">Loading library...</div>}

                {/* Grid */}
                {!isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlans.map((plan: any) => (
                            <Link
                                key={plan.id}
                                to={`/library/${plan.id}`}
                                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-400 hover:shadow-lg transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-1 rounded border border-brand-100">
                                            {plan.primary_diagnosis_domain || "Clinical"}
                                        </span>
                                        <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                            ★ 5.0
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-brand-700 transition-colors">
                                        {plan.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                                        {plan.patient_scenario}
                                    </p>

                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs font-medium text-gray-600">
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {plan.goals?.length || 3} Goals
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                            {plan.interventions?.length || 5} Interventions
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold">
                                            {plan.student_name?.charAt(0) || "N"}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700">{plan.student_name || "NursifyGH Official"}</span>
                                    </div>
                                    <span className="text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                        View Plan <span aria-hidden="true">→</span>
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && filteredPlans.length === 0 && (
                    <div className="py-24 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                        <p className="text-gray-500 font-medium">No care plans found matching "{search}"</p>
                        <button onClick={() => setSearch("")} className="mt-2 text-sm text-brand-600 font-bold hover:underline">Clear search</button>
                    </div>
                )}
            </div>
        </AppShell>
    )
}