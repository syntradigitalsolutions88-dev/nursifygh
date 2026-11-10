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
                <div className="text-center py-12">
                    <p className="text-on-surface-muted">Loading care plan…</p>
                </div>
            </AppShell>
        )
    }

    if (error || !plan) {
        return (
            <AppShell>
                <div className="rounded-xl border border-border bg-white p-8 text-center">
                    <h1 className="text-h3 text-danger-700">Care plan not found</h1>
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

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto pb-20">
                <Breadcrumb title={plan.title} />

                <header className="border-b border-border pb-6">
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
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link to={`/careplans/${plan.id}/transcription`}>
                            <Button size="sm" variant="secondary">📋 Transcription view</Button>
                        </Link>
                        <ShareButton planId={plan.id} />
                    </div>
                </header>

                <Section number="01" title="Presenting Scenario">
                    <p className="text-base text-on-surface leading-relaxed whitespace-pre-line">
                        {plan.patient_scenario}
                    </p>
                </Section>

                <Section
                    number="02"
                    title="Nursing Diagnosis"
                    right={
                        <span className="font-mono text-xs text-on-surface-muted bg-surface-subtle px-2 py-1 rounded border border-border">
                            {plan.primary_diagnosis.code}
                        </span>
                    }
                >
                    <div className="flex flex-wrap items-baseline gap-3 mb-2">
                        <h3 className="text-xl font-bold text-brand-900">{plan.primary_diagnosis.label}</h3>
                        <span className="text-xs font-medium text-on-surface-muted bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                            {plan.primary_diagnosis.domain_display}
                        </span>
                    </div>
                    <p className="text-sm text-on-surface-muted italic leading-relaxed">
                        "{plan.primary_diagnosis.definition}"
                    </p>
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <Labeled label="Defining Characteristics">
                            {plan.primary_diagnosis.defining_characteristics}
                        </Labeled>
                        <Labeled label="Related Factors">
                            {plan.primary_diagnosis.related_factors}
                        </Labeled>
                    </div>
                </Section>

                <Section
                    number="03"
                    title="Planning — SMART Goals"
                    right={
                        <>
                            <span className="text-xs text-on-surface-muted">
                                {plan.goals.length} goal{plan.goals.length !== 1 ? "s" : ""}
                            </span>
                            {!showGoalForm && (
                                <button onClick={() => setShowGoalForm(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                                    + Add
                                </button>
                            )}
                        </>
                    }
                >
                    {plan.goals.length === 0 && !showGoalForm ? (
                        <EmptyHint>No SMART goals yet.</EmptyHint>
                    ) : (
                        <div className="space-y-5">
                            {plan.goals.map((goal, idx) => (
                                <GoalCard key={goal.id} index={idx + 1} goal={goal} />
                            ))}
                        </div>
                    )}

                    {showGoalForm && (
                        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
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

                <Section
                    number="04"
                    title="Implementation — Interventions"
                    right={
                        <>
                            <span className="text-xs text-on-surface-muted">
                                {plan.interventions.length} intervention{plan.interventions.length !== 1 ? "s" : ""}
                            </span>
                            {!showInterventionForm && (
                                <button onClick={() => setShowInterventionForm(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                                    + Add
                                </button>
                            )}
                        </>
                    }
                >
                    {plan.interventions.length === 0 && !showInterventionForm ? (
                        <EmptyHint>No interventions yet.</EmptyHint>
                    ) : (
                        <div className="space-y-5">
                            {plan.interventions.map((iv, idx) => (
                                <InterventionCard key={iv.id} index={idx + 1} intervention={iv} />
                            ))}
                        </div>
                    )}

                    {showInterventionForm && (
                        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
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

                <footer className="mt-8 flex items-center justify-between text-[11px] text-on-surface-muted">
                    <span>NursifyGH · Nursing Care Plan Study Tool</span>
                    <span>Drafted {formatLongDate(plan.created_at)}</span>
                </footer>
            </div>
        </AppShell>
    )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Breadcrumb({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-2 text-xs text-on-surface-muted mb-6">
            <Link to="/careplans" className="hover:text-brand-700 transition-colors">Care Plans</Link>
            <span>/</span>
            <span className="text-on-surface font-medium truncate">{title}</span>
        </div>
    )
}

function CompletionIndicator({ completed, total }: { completed: number; total: number }) {
    return (
        <span className="ml-auto flex items-center gap-1">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={`h-1 w-6 rounded-full ${i < completed ? "bg-brand-600" : "bg-gray-200"}`} />
            ))}
            <span className="ml-2 text-[11px] font-semibold text-on-surface-muted uppercase tracking-wide">
                {completed}/{total}
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
            <div className="flex items-baseline gap-3 mb-4">
                <span className="text-[10px] font-mono font-bold text-brand-700 tracking-widest">{number}</span>
                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">{title}</h2>
                {right && <span className="ml-auto flex items-center gap-2">{right}</span>}
            </div>
            <div className="pl-7">{children}</div>
        </section>
    )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5">{label}</p>
            <p className="text-sm text-on-surface leading-relaxed">{children}</p>
        </div>
    )
}

function GoalCard({ index, goal }: { index: number; goal: any }) {
    return (
        <div className="relative pl-6 border-l-2 border-brand-200">
            <div className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-white" />
            <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-2">Goal {index}</p>
            <p className="text-sm text-on-surface leading-relaxed">{goal.specific}</p>
        </div>
    )
}

function InterventionCard({ index, intervention }: { index: number; intervention: any }) {
    return (
        <div className="relative pl-6 border-l-2 border-border">
            <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-gray-400 ring-4 ring-white" />
            <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider mb-2">
                Intervention {index}
            </p>
            <p className="text-sm font-medium text-on-surface leading-relaxed">{intervention.action}</p>
            <div className="mt-2 pl-4 border-l border-amber-300">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Rationale</p>
                <p className="mt-0.5 text-xs text-amber-900 leading-relaxed">{intervention.rationale}</p>
            </div>
        </div>
    )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-on-surface-muted italic py-4">{children}</p>
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
            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-green-800">✓ Copied</span>
                <button onClick={() => navigator.clipboard.writeText(url)} className="text-xs text-green-700 hover:underline">
                    Copy again
                </button>
            </div>
        )
    }

    return (
        <div>
            <Button size="sm" variant="secondary" onClick={handleShare} loading={state === "loading"}>
                {state === "loading" ? "Generating…" : "Share"}
            </Button>
            {state === "error" && <p className="mt-1 text-xs text-danger-700">Failed</p>}
        </div>
    )
}

function formatLongDate(date: string) {
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}