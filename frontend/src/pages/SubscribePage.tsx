import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import AppShell from "../components/shell/AppShell"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"
import { useAuth } from "../contexts/AuthContext"
import {
    getManualPaymentInfo,
    initiateManualPayment,
    submitManualPayment,
} from "../api/payments"

export default function SubscribePage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: info } = useQuery({
        queryKey: ["manual-payment-info"],
        queryFn: getManualPaymentInfo,
        enabled: !!user && !user.has_active_subscription,
    })

    const [step, setStep] = useState<"instructions" | "submit">("instructions")
    const [manualReference, setManualReference] = useState("")
    const [manualNote, setManualNote] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [txnRef, setTxnRef] = useState<string | null>(null)

    const initiateMutation = useMutation({
        mutationFn: initiateManualPayment,
        onSuccess: (txn) => {
            setTxnRef(txn.reference)
            setStep("submit")
        },
        onError: () => setError("Failed to start payment. Please try again."),
    })

    const submitMutation = useMutation({
        mutationFn: submitManualPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manual-payment-info"] })
            queryClient.invalidateQueries({ queryKey: ["me"] })
            alert(
                "Payment submitted! We'll verify and activate your subscription within 24 hours."
            )
            navigate("/dashboard")
        },
        onError: () => setError("Failed to submit payment reference. Please try again."),
    })

    if (!user) return null

    if (user.has_active_subscription) {
        return (
            <AppShell>
                <div className="max-w-md mx-auto rounded-xl border border-success-200 bg-success-50 p-8 text-center">
                    <h1 className="text-h2 text-success-800">You're subscribed</h1>
                    <p className="mt-2 text-body-sm text-success-700">
                        Your subscription is active until{" "}
                        {user.subscription_expires_at
                            ? new Date(user.subscription_expires_at).toLocaleDateString(
                                "en-GB",
                                { day: "numeric", month: "short", year: "numeric" }
                            )
                            : "—"}
                        .
                    </p>
                    <Link to="/dashboard" className="mt-6 inline-block">
                        <Button>Go to dashboard</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-h1">Subscribe</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">
                        One payment. Full access for a semester.
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-white p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-h3">Semester Pass</p>
                            <p className="mt-1 text-body-sm text-on-surface-muted">
                                120 days of full access
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-h1 text-brand-700">GHS 30</p>
                            <p className="text-xs text-on-surface-muted">one-time</p>
                        </div>
                    </div>
                    <ul className="mt-4 space-y-1.5 text-sm">
                        <li className="text-on-surface">
                            ✓ All courses, quizzes, and mock exams
                        </li>
                        <li className="text-on-surface">✓ Full NANDA care plan builder</li>
                        <li className="text-on-surface">
                            ✓ Share plans with clinical instructors
                        </li>
                        <li className="text-on-surface">✓ Community care plan library</li>
                    </ul>
                </div>

                {info?.pending && (
                    <div className="rounded-xl border border-warning-200 bg-warning-50 p-4">
                        <p className="text-sm font-medium text-warning-900">
                            ⏳ Your payment is awaiting review
                        </p>
                        <p className="mt-1 text-xs text-warning-800">
                            We received your reference{" "}
                            <strong>{info.pending.manual_reference}</strong>. We'll verify
                            it within 24 hours and activate your subscription.
                        </p>
                    </div>
                )}

                {!info?.pending && step === "instructions" && (
                    <div className="rounded-xl border border-border bg-white p-6 space-y-4">
                        <h2 className="text-h3">Pay with Mobile Money</h2>
                        <p className="text-sm text-on-surface-muted">
                            Send <strong>GHS 30</strong> to our MoMo number below.
                        </p>

                        <div className="rounded-lg border-2 border-brand-600 bg-brand-50 p-4">
                            <p className="text-xs font-medium text-brand-700">Send to</p>
                            <p className="mt-1 text-h2 text-brand-900 tracking-wider">
                                {info?.momo_number || "0556025785"}
                            </p>
                            <p className="mt-1 text-sm text-brand-800">
                                Name: <strong>{info?.momo_name || "NursifyGH"}</strong>
                            </p>
                            <p className="mt-1 text-sm text-brand-800">
                                Amount: <strong>GHS {info?.amount_ghs || "30"}</strong>
                            </p>
                        </div>

                        <div className="rounded-lg border border-border bg-surface-subtle p-4 space-y-2 text-sm">
                            <p className="font-medium text-on-surface">Steps:</p>
                            <ol className="list-decimal list-inside space-y-1 text-on-surface-muted">
                                <li>
                                    Open your MoMo app or dial <strong>*170#</strong>
                                </li>
                                <li>
                                    Send <strong>GHS 30</strong> to{" "}
                                    <strong>{info?.momo_number || "0556025785"}</strong>
                                </li>
                                <li>
                                    Include your email <strong>{user.email}</strong> as
                                    reference
                                </li>
                                <li>
                                    Note the <strong>transaction ID</strong> from your SMS
                                </li>
                                <li>Come back here and click the button below</li>
                            </ol>
                        </div>

                        {error && <Alert variant="danger">{error}</Alert>}

                        <Button
                            size="lg"
                            fullWidth
                            loading={initiateMutation.isPending}
                            onClick={() => {
                                setError(null)
                                initiateMutation.mutate()
                            }}
                        >
                            I've sent the money — submit reference →
                        </Button>
                    </div>
                )}

                {!info?.pending && step === "submit" && (
                    <div className="rounded-xl border border-border bg-white p-6 space-y-4">
                        <h2 className="text-h3">Submit your payment reference</h2>
                        <p className="text-sm text-on-surface-muted">
                            Your payment reference: <strong>{txnRef}</strong>
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-on-surface mb-1.5">
                                MoMo transaction ID
                            </label>
                            <input
                                type="text"
                                value={manualReference}
                                onChange={(e) => setManualReference(e.target.value)}
                                placeholder="e.g. MP2401A12345 — from your MoMo SMS"
                                className="block w-full h-11 rounded-lg border border-border px-3.5 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface mb-1.5">
                                Optional note (for us)
                            </label>
                            <textarea
                                rows={3}
                                value={manualNote}
                                onChange={(e) => setManualNote(e.target.value)}
                                placeholder="e.g. Sent from my AirtelTigo number ending in 456"
                                className="block w-full rounded-lg border border-border px-3.5 py-2.5 text-sm"
                            />
                        </div>

                        {error && <Alert variant="danger">{error}</Alert>}

                        <Button
                            size="lg"
                            fullWidth
                            loading={submitMutation.isPending}
                            disabled={!manualReference.trim() || !txnRef}
                            onClick={() => {
                                setError(null)
                                if (!txnRef) {
                                    setError("Please restart the flow.")
                                    return
                                }
                                submitMutation.mutate({
                                    reference: txnRef,
                                    manual_reference: manualReference.trim(),
                                    manual_note: manualNote.trim(),
                                })
                            }}
                        >
                            Submit for approval →
                        </Button>
                    </div>
                )}
            </div>
        </AppShell>
    )
}