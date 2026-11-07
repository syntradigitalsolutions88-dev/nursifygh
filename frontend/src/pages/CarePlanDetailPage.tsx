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
import Badge from "../components/ui/Badge"
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

    const { data: plan, isLoading, error } = useQuery({
        queryKey: ["care-plan", planId],
        queryFn: () => getCarePlan(planId!),
        enabled: !!planId,
    })

    const [showGoalForm, setShowGoalForm] = useState(false)
    const [showInterventionForm, setShowInterventionForm] = useState(false)

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
        mutationFn: (payload: CreateInterventionRequest) =>
            createIntervention(planId!, payload),
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

    return (
        <AppShell>
            <div className="max-w-3xl space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-caption text-brand-600">{plan.primary_diagnosis.code} — {plan.primary_diagnosis.label}</p>
                        <h1 className="mt-2 text-h1">{plan.title}</h1>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                        <Link to={`/careplans/${plan.id}/transcription`}>
                            <Button size="sm" variant="secondary">📋 Transcription View</Button>
                        </Link>
                        <ShareButton planId={plan.id} />
                    </div>
                </div>

                {/* Patient scenario */}
                <section className="rounded-xl border border-border bg-white p-6">
                    <h2 className="text-caption">Patient scenario</h2>
                    <p className="mt-3 text-body-sm text-on-surface whitespace-pre-line">
                        {plan.patient_scenario}
                    </p>
                </section>

                {/* NANDA diagnosis */}
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

                {/* SMART goals */}
                <section className="rounded-xl border border-border bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-h4">SMART goals</h2>
                        {!showGoalForm && (
                            <Button size="sm" variant="secondary" onClick={() => setShowGoalForm(true)}>
                                + Add goal
                            </Button>
                        )}
                    </div>

                    {plan.goals.length === 0 && !showGoalForm && (
                        <p className="text-body-sm text-on-surface-muted italic">
                            No goals yet. Add your first SMART goal.
                        </p>
                    )}

                    {plan.goals.length > 0 && (
                        <ul className="space-y-4">
                            {plan.goals.map((goal, idx) => (
                                <li key={goal.id} className="border-l-2 border-brand-300 pl-4">
                                    <p className="text-xs font-medium text-on-surface-muted">Goal {idx + 1}</p>
                                    <dl className="mt-2 space-y-1 text-body-sm">
                                        <div><dt className="inline font-semibold text-on-surface">S: </dt><dd className="inline text-on-surface">{goal.specific}</dd></div>
                                        <div><dt className="inline font-semibold text-on-surface">M: </dt><dd className="inline text-on-surface">{goal.measurable}</dd></div>
                                        <div><dt className="inline font-semibold text-on-surface">A: </dt><dd className="inline text-on-surface">{goal.achievable}</dd></div>
                                        <div><dt className="inline font-semibold text-on-surface">R: </dt><dd className="inline text-on-surface">{goal.relevant}</dd></div>
                                        <div><dt className="inline font-semibold text-on-surface">T: </dt><dd className="inline text-on-surface">{goal.time_bound}</dd></div>
                                    </dl>
                                </li>
                            ))}
                        </ul>
                    )}

                    {showGoalForm && (
                        <div className="mt-4">
                            <SmartGoalForm
                                submitting={addGoalMutation.isPending}
                                onCancel={() => setShowGoalForm(false)}
                                onSubmit={async (payload) => {
                                    await addGoalMutation.mutateAsync(payload)
                                }}
                            />
                        </div>
                    )}

                    {addGoalMutation.isError && (
                        <Alert variant="danger" className="mt-3">
                            Failed to save goal. Please try again.
                        </Alert>
                    )}
                </section>

                {/* Interventions */}
                <section className="rounded-xl border border-border bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-h4">Nursing interventions</h2>
                        {!showInterventionForm && (
                            <Button size="sm" variant="secondary" onClick={() => setShowInterventionForm(true)}>
                                + Add intervention
                            </Button>
                        )}
                    </div>

                    {plan.interventions.length === 0 && !showInterventionForm && (
                        <p className="text-body-sm text-on-surface-muted italic">
                            No interventions yet.
                        </p>
                    )}

                    {plan.interventions.length > 0 && (
                        <ul className="space-y-4">
                            {plan.interventions.map((iv, idx) => (
                                <li key={iv.id} className="border-l-2 border-brand-300 pl-4">
                                    <p className="text-xs font-medium text-on-surface-muted">
                                        Intervention {idx + 1}
                                    </p>
                                    <p className="mt-1 text-body-sm text-on-surface">{iv.action}</p>
                                    <div className="mt-2 rounded-lg bg-brand-50 p-3">
                                        <p className="text-xs font-semibold text-brand-700">Rationale</p>
                                        <p className="mt-1 text-xs text-brand-800">{iv.rationale}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {showInterventionForm && (
                        <div className="mt-4">
                            <InterventionForm
                                submitting={addInterventionMutation.isPending}
                                onCancel={() => setShowInterventionForm(false)}
                                onSubmit={async (payload) => {
                                    await addInterventionMutation.mutateAsync(payload)
                                }}
                            />
                        </div>
                    )}

                    {addInterventionMutation.isError && (
                        <Alert variant="danger" className="mt-3">
                            Failed to save intervention. Please try again.
                        </Alert>
                    )}
                </section>
            </div>
        </AppShell>
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
            try {
                await navigator.clipboard.writeText(shareUrl)
            } catch {
                /* clipboard may be unavailable */
            }
        } catch {
            setState("error")
        }
    }

    if (state === "ready") {
        return (
            <div className="max-w-xs">
                <p className="text-xs font-medium text-brand-700">Share link ready · copied</p>
                <input
                    readOnly
                    value={url}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="mt-1 w-full rounded-md border border-border bg-surface-subtle px-2 py-1 text-xs"
                />
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