import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
    createGoal,
    createIntervention,
    createShareLink,
    getCarePlan,
} from "../api/careplans"
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
        mutationFn: (payload: CreateSmartGoalRequest) =>
            createGoal(planId!, payload),
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
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading care plan…</p>
            </div>
        )
    }

    if (error || !plan) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="card max-w-md w-full text-center">
                    <h1 className="text-xl font-bold text-red-700">Care plan not found</h1>
                    <Link to="/careplans" className="btn-secondary mt-4 inline-block">
                        Back to care plans
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <Link to="/careplans" className="text-sm text-brand-600 hover:underline">
                        ← Back to care plans
                    </Link>
                    <div className="mt-2 flex items-start justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {plan.primary_diagnosis.code} — {plan.primary_diagnosis.label}
                            </p>
                        </div>
                        <ShareButton planId={plan.id} />
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div className="card">
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Patient scenario
                    </h2>
                    <p className="mt-2 text-sm text-gray-800 whitespace-pre-line">
                        {plan.patient_scenario}
                    </p>
                </div>

                <div className="card">
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        NANDA diagnosis
                    </h2>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                        {plan.primary_diagnosis.code} — {plan.primary_diagnosis.label}
                    </p>
                    <p className="mt-1 text-xs text-brand-600">
                        {plan.primary_diagnosis.domain_display}
                    </p>
                    <p className="mt-3 text-sm text-gray-700">
                        {plan.primary_diagnosis.definition}
                    </p>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                            SMART goals
                        </h2>
                        {!showGoalForm && (
                            <button
                                onClick={() => setShowGoalForm(true)}
                                className="btn-secondary text-xs"
                            >
                                + Add goal
                            </button>
                        )}
                    </div>

                    {plan.goals.length === 0 && !showGoalForm && (
                        <p className="mt-2 text-sm text-gray-500 italic">
                            No goals yet. Add your first SMART goal above.
                        </p>
                    )}

                    {plan.goals.length > 0 && (
                        <ul className="mt-3 space-y-4">
                            {plan.goals.map((goal, idx) => (
                                <li key={goal.id} className="border-l-2 border-brand-300 pl-3">
                                    <p className="text-xs font-medium text-gray-500">
                                        Goal {idx + 1}
                                    </p>
                                    <dl className="mt-2 grid grid-cols-1 gap-1 text-sm">
                                        <div>
                                            <dt className="inline font-medium text-gray-700">S: </dt>
                                            <dd className="inline text-gray-800">{goal.specific}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline font-medium text-gray-700">M: </dt>
                                            <dd className="inline text-gray-800">{goal.measurable}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline font-medium text-gray-700">A: </dt>
                                            <dd className="inline text-gray-800">{goal.achievable}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline font-medium text-gray-700">R: </dt>
                                            <dd className="inline text-gray-800">{goal.relevant}</dd>
                                        </div>
                                        <div>
                                            <dt className="inline font-medium text-gray-700">T: </dt>
                                            <dd className="inline text-gray-800">{goal.time_bound}</dd>
                                        </div>
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
                        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                            Failed to save goal. Please try again.
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                            Nursing interventions
                        </h2>
                        {!showInterventionForm && (
                            <button
                                onClick={() => setShowInterventionForm(true)}
                                className="btn-secondary text-xs"
                            >
                                + Add intervention
                            </button>
                        )}
                    </div>

                    {plan.interventions.length === 0 && !showInterventionForm && (
                        <p className="mt-2 text-sm text-gray-500 italic">
                            No interventions yet. Add your first above.
                        </p>
                    )}

                    {plan.interventions.length > 0 && (
                        <ul className="mt-3 space-y-4">
                            {plan.interventions.map((iv, idx) => (
                                <li key={iv.id} className="border-l-2 border-brand-300 pl-3">
                                    <p className="text-xs font-medium text-gray-500">
                                        Intervention {idx + 1}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-800">{iv.action}</p>
                                    <div className="mt-2 rounded bg-brand-50 p-2">
                                        <p className="text-xs font-medium text-brand-700">Rationale</p>
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
                        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                            Failed to save intervention. Please try again.
                        </div>
                    )}
                </div>

                <div className="flex justify-between pt-4">
                    <Link to="/careplans" className="btn-secondary">
                        Back to list
                    </Link>
                    <span className="text-xs text-gray-500 self-center">
                        Plan editing · Round 2 · Goals & interventions
                    </span>
                </div>
            </main>
        </div>
    )
}

function ShareButton({ planId }: { planId: string }) {
    const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle")
    const [url, setUrl] = useState<string>("")

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
                /* clipboard may be unavailable — user can still copy manually */
            }
        } catch {
            setState("error")
        }
    }

    if (state === "ready") {
        return (
            <div className="text-right max-w-xs shrink-0">
                <p className="text-xs font-medium text-brand-700">Share link ready</p>
                <input
                    readOnly
                    value={url}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                />
                <p className="mt-1 text-xs text-gray-500">
                    Copied to clipboard · valid 30 days
                </p>
            </div>
        )
    }

    return (
        <div className="shrink-0">
            <button
                onClick={handleShare}
                disabled={state === "loading"}
                className="btn-secondary text-xs"
            >
                {state === "loading" ? "Generating…" : "Share"}
            </button>
            {state === "error" && <p className="mt-1 text-xs text-red-600">Failed</p>}
        </div>
    )
}