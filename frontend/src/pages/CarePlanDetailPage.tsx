import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
    createGoal,
    createIntervention,
    createShareLink,
    getCarePlan,
} from "../api/careplans"
import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"
import InterventionForm from "../components/InterventionForm"
import SmartGoalForm from "../components/SmartGoalForm"
import type {
    CreateInterventionRequest,
    CreateSmartGoalRequest,
} from "../types/api"

export default function CarePlanDetailPage() {
    const { planId } = useParams<{ planId: string }>()
    const queryClient = useQueryClient()
    const [showGoalForm, setShowGoalForm] = useState(false)
    const [showInterventionForm, setShowInterventionForm] = useState(false)

    const { data: plan, isLoading, error } = useQuery({
        queryKey: ["care-plan", planId],
        queryFn: () => getCarePlan(planId!),
        enabled: !!planId,
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["care-plan", planId] })
        queryClient.invalidateQueries({ queryKey: ["care-plans"] })
    }

    const addGoalMutation = useMutation({
        mutationFn: (payload: CreateSmartGoalRequest) => createGoal(planId!, payload),
        onSuccess: () => {
            setShowGoalForm(false)
            invalidate()
        },
    })

    const addInterventionMutation = useMutation({
        mutationFn: (payload: CreateInterventionRequest) => createIntervention(planId!, payload),
        onSuccess: () => {
            setShowInterventionForm(false)
            invalidate()
        },
    })

    if (isLoading) {
        return (
            <AppShell>
                <div className="max-w-4xl mx-auto py-12 px-4 animate-pulse">
                    <div className="h-4 bg-surface-subtle rounded w-32 mb-8" />
                    <div className="h-10 bg-surface-subtle rounded w-3/4 mb-4" />
                    <div className="h-4 bg-surface-subtle rounded w-1/2 mb-12" />
                    <div className="space-y-4">
                        <div className="h-32 bg-surface-subtle rounded" />
                        <div className="h-48 bg-surface-subtle rounded" />
                    </div>
                </div>
            </AppShell>
        )
    }

    if (error || !plan) {
        return (
            <AppShell>
                <div className="max-w-4xl mx-auto py-12 px-4 text-center">
                    <h1 className="text-h3 text-danger-700">Care plan not found</h1>
                    <Link to="/careplans" className="mt-4 inline-block">
                        <Button variant="secondary">← Back to Care Plans</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    const completion = [
        !!plan.patient_scenario,
        plan.goals.length > 0,
        plan.interventions.length > 0,
    ]
    const completedSteps = completion.filter(Boolean).length
    const isComplete = completedSteps === 3

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto pb-24 px-4 sm:px-0">

                {/* Breadcrumb & Actions */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-xs text-on-surface-muted">
                        <Link to="/careplans" className="hover:text-brand-700 transition-colors">Care Plans</Link>
                        <span>/</span>
                        <span className="text-on-surface font-semibold truncate max-w-[200px]">{plan.title}</span>
                    </div>
                    {isComplete && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold">
                            ✓ Complete
                        </span>
                    )}
                </div>

                {/* Header Card */}
                <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-brand-50/30 p-6 sm:p-8 mb-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="rounded bg-brand-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            NCP Case Study
                        </span>
                        <span className="text-xs text-on-surface-muted font-medium">
                            {formatLongDate(plan.created_at)}
                        </span>
                        <CompletionIndicator completed={completedSteps} total={3} />
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-serif font-bold text-on-surface leading-tight">
                        {plan.title}
                    </h1>

                    <div className="mt-5 flex flex-wrap gap-2">
                        <Link to={`/careplans/${plan.id}/transcription`}>
                            <Button size="sm" variant="secondary" className="gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Transcription View
                            </Button>
                        </Link>
                        <ShareButton planId={plan.id} />
                    </div>
                </div>

                {/* Section 01: Scenario */}
                <Section number="01" title="Presenting Scenario">
                    <div className="rounded-xl border border-border bg-white p-5">
                        <p className="text-base text-on-surface leading-relaxed whitespace-pre-line">
                            {plan.patient_scenario}
                        </p>
                    </div>
                </Section>

                {/* Section 02: Diagnosis */}
                <Section
                    number="02"
                    title="Nursing Diagnosis"
                    right={
                        <span className="font-mono text-xs text-on-surface-muted bg-surface-subtle px-2 py-1 rounded border border-border">
                            {plan.primary_diagnosis.code}
                        </span>
                    }
                >
                    <div className="rounded-xl border border-brand-200 bg-white p-5">
                        <div className="flex flex-wrap items-baseline gap-3 mb-3">
                            <h3 className="text-xl font-bold text-brand-900">{plan.primary_diagnosis.label}</h3>
                            <span className="text-xs font-medium text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                                {plan.primary_diagnosis.domain_display}
                            </span>
                        </div>
                        <p className="text-sm text-on-surface-muted italic leading-relaxed border-l-4 border-brand-200 pl-4 py-1">
                            "{plan.primary_diagnosis.definition}"
                        </p>
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Labeled label="Defining Characteristics">
                                {plan.primary_diagnosis.defining_characteristics}
                            </Labeled>
                            <Labeled label="Related Factors">
                                {plan.primary_diagnosis.related_factors}
                            </Labeled>
                        </div>
                    </div>
                </Section>

                {/* Section 03: Goals */}
                <Section
                    number="03"
                    title="Planning — SMART Goals"
                    right={
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-on-surface-muted">
                                {plan.goals.length} goal{plan.goals.length !== 1 ? "s" : ""}
                            </span>
                            {!showGoalForm && (
                                <button
                                    onClick={() => setShowGoalForm(true)}
                                    className="inline-flex items-center gap-1 rounded-md bg-brand-700 text-white px-2.5 py-1 text-xs font-bold hover:bg-brand-800 transition-colors"
                                >
                                    + Add Goal
                                </button>
                            )}
                        </div>
                    }
                >
                    {plan.goals.length === 0 && !showGoalForm ? (
                        <EmptyHint
                            message="No SMART goals yet."
                            action={<button onClick={() => setShowGoalForm(true)} className="text-brand-600 font-semibold hover:underline">Add your first goal →</button>}
                        />
                    ) : (
                        <div className="space-y-4">
                            {plan.goals.map((goal, idx) => (
                                <GoalCard key={goal.id} index={idx + 1} goal={goal} />
                            ))}
                        </div>
                    )}

                    {showGoalForm && (
                        <div className="mt-4 rounded-xl border-2 border-brand-300 bg-brand-50/50 p-5">
                            <SmartGoalForm
                                submitting={addGoalMutation.isPending}
                                onCancel={() => setShowGoalForm(false)}
                                onSubmit={async (payload) => { await addGoalMutation.mutateAsync(payload) }}
                            />
                        </div>
                    )}
                    {addGoalMutation.isError && (
                        <Alert variant="danger">Failed to save goal. Please try again.</Alert>
                    )}
                </Section>

                {/* Section 04: Interventions */}
                <Section
                    number="04"
                    title="Implementation — Interventions"
                    right={
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-on-surface-muted">
                                {plan.interventions.length} intervention{plan.interventions.length !== 1 ? "s" : ""}
                            </span>
                            {!showInterventionForm && (
                                <button
                                    onClick={() => setShowInterventionForm(true)}
                                    className="inline-flex items-center gap-1 rounded-md bg-brand-700 text-white px-2.5 py-1 text-xs font-bold hover:bg-brand-800 transition-colors"
                                >
                                    + Add Intervention
                                </button>
                            )}
                        </div>
                    }
                >
                    {plan.interventions.length === 0 && !showInterventionForm ? (
                        <EmptyHint
                            message="No interventions yet."
                            action={<button onClick={() => setShowInterventionForm(true)} className="text-brand-600 font-semibold hover:underline">Add your first intervention →</button>}
                        />
                    ) : (
                        <div className="space-y-4">
                            {plan.interventions.map((iv, idx) => (
                                <InterventionCard key={iv.id} index={idx + 1} intervention={iv} />
                            ))}
                        </div>
                    )}

                    {showInterventionForm && (
                        <div className="mt-4 rounded-xl border-2 border-brand-300 bg-brand-50/50 p-5">
                            <InterventionForm
                                submitting={addInterventionMutation.isPending}
                                onCancel={() => setShowInterventionForm(false)}
                                onSubmit={async (payload) => { await addInterventionMutation.mutateAsync(payload) }}
                            />
                        </div>
                    )}
                    {addInterventionMutation.isError && (
                        <Alert variant="danger">Failed to save intervention. Please try again.</Alert>
                    )}
                </Section>

                {/* Footer */}
                <footer className="mt-12 flex items-center justify-between text-[11px] text-on-surface-muted border-t border-border pt-4">
                    <span>NursifyGH · Nursing Care Plan Study Tool</span>
                    <span>Drafted {formatLongDate(plan.created_at)}</span>
                </footer>
            </div>
        </AppShell>
    )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CompletionIndicator({ completed, total }: { completed: number; total: number }) {
    return (
        <span className="ml-auto flex items-center gap-1">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={`h-1 w-6 rounded-full ${i < completed ? "bg-brand-600" : "bg-gray-200"}`} />
            ))}
            <span className="ml-2 text-[11px] font-bold text-on-surface-muted uppercase tracking-wide">
                {completed}/{total} steps
            </span>
        </span>
    )
}

function Section({ number, title, right, children }: {
    number: string
    title: string
    right?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <section className="py-6 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-[10px] font-mono font-bold tracking-widest">
                    {number}
                </span>
                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">{title}</h2>
                {right && <span className="ml-auto flex items-center gap-2">{right}</span>}
            </div>
            <div>{children}</div>
        </section>
    )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg bg-surface-subtle/50 p-4">
            <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5">{label}</p>
            <p className="text-sm text-on-surface leading-relaxed">{children}</p>
        </div>
    )
}

function GoalCard({ index, goal }: { index: number; goal: any }) {
    return (
        <div className="rounded-xl border border-border bg-white p-5 hover:shadow-sm transition-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full w-1 bg-brand-500" />
            <div className="flex items-start gap-3">
                <span className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                    {index}
                </span>
                <div>
                    <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1">SMART Goal</p>
                    <p className="text-sm text-on-surface leading-relaxed">{goal.specific}</p>
                </div>
            </div>
        </div>
    )
}

function InterventionCard({ index, intervention }: { index: number; intervention: any }) {
    return (
        <div className="rounded-xl border border-border bg-white p-5 hover:shadow-sm transition-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full w-1 bg-blue-500" />
            <div className="flex items-start gap-3">
                <span className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                    {index}
                </span>
                <div className="flex-1">
                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Nursing Order</p>
                    <p className="text-sm font-medium text-on-surface leading-relaxed">{intervention.action}</p>

                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Rationale</p>
                        <p className="text-xs text-amber-900 leading-relaxed">{intervention.rationale}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function EmptyHint({ message, action }: { message: string; action: React.ReactNode }) {
    return (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface-subtle/30 p-8 text-center">
            <p className="text-sm text-on-surface-muted mb-2">{message}</p>
            <div className="text-sm">{action}</div>
        </div>
    )
}

function ShareButton({ planId }: { planId: string }) {
    const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle")
    const [url, setUrl] = useState("")

    async function handleShare() {
        setState("loading")
        try {
            const link = await createShareLink(planId, 30)
            const shareUrl = `${window.location.origin}/shared/${link.token}`
            setUrl(shareUrl)
            setState("ready")
            navigator.clipboard.writeText(shareUrl).catch(() => { })
        } catch {
            setState("error")
        }
    }

    if (state === "ready") {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2">
                <svg className="h-4 w-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-bold text-green-800">Link Copied!</span>
                <button onClick={() => navigator.clipboard.writeText(url)} className="text-xs text-green-700 hover:underline ml-1">
                    Copy again
                </button>
            </div>
        )
    }

    return (
        <div>
            <Button size="sm" variant="secondary" onClick={handleShare} loading={state === "loading"} className="gap-1.5">
                {state === "loading" ? "Generating…" : (
                    <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                    </>
                )}
            </Button>
            {state === "error" && <p className="mt-1 text-xs text-danger-700">Failed</p>}
        </div>
    )
}

function formatLongDate(date: string) {
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}