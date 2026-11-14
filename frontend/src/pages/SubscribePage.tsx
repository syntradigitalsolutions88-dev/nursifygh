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

    // Fetch payment info even if user is on trial (has_active_subscription = true),
    // as long as they haven't paid yet.
    const { data: info } = useQuery({
        queryKey: ["manual-payment-info"],
        queryFn: getManualPaymentInfo,
        enabled: !!user && !user.has_paid,
    })

    const [step, setStep] = useState<"instructions" | "submit">("instructions")
    const [manualReference, setManualReference] = useState("")
    const [manualNote, setManualNote] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [txnRef, setTxnRef] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const initiateMutation = useMutation({
        mutationFn: initiateManualPayment,
        onSuccess: (txn) => {
            setTxnRef(txn.reference)
            setStep("submit")
            window.scrollTo({ top: 0, behavior: "smooth" })
        },
        onError: () => setError("Failed to start payment. Please try again."),
    })

    const submitMutation = useMutation({
        mutationFn: submitManualPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manual-payment-info"] })
            queryClient.invalidateQueries({ queryKey: ["me"] })
            window.scrollTo({ top: 0, behavior: "smooth" })
        },
        onError: () => setError("Failed to submit payment reference. Please try again."),
    })

    const copyMoMoNumber = () => {
        const number = info?.momo_number || "0556025785"
        navigator.clipboard.writeText(number)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!user) return null

    // Only block if the user has ALREADY PAID and is currently active.
    if (user.has_active_subscription && user.has_paid) {
        return (
            <AppShell>
                <div className="max-w-md mx-auto rounded-2xl border border-success-200 bg-gradient-to-br from-success-50 to-white p-8 text-center shadow-sm">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-success-700 mb-4">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-success-900">You're fully subscribed</h1>
                    <p className="mt-2 text-sm text-success-800">
                        Your Semester Pass is active until{" "}
                        <strong className="text-success-900">
                            {user.subscription_expires_at
                                ? new Date(user.subscription_expires_at).toLocaleDateString("en-GB", {
                                    day: "numeric", month: "long", year: "numeric"
                                })
                                : "—"}
                        </strong>
                        .
                    </p>
                    <Link to="/dashboard" className="mt-6 inline-block w-full">
                        <Button size="lg" fullWidth>Go to Dashboard</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    // ─── PENDING REVIEW STATE ───────────────────────────────
    if (info?.pending) {
        return (
            <AppShell>
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white p-8 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-4">
                            <svg className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-amber-900">Payment received. Verifying...</h1>
                        <p className="mt-2 text-sm text-amber-800 max-w-md mx-auto">
                            We've received your reference <strong className="text-amber-900 font-mono">{info.pending.manual_reference}</strong>. Our team is verifying your payment and will activate your subscription within 24 hours.
                        </p>

                        <div className="mt-6 bg-white rounded-xl border border-amber-200 p-4 text-left max-w-sm mx-auto">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">What happens next?</p>
                            <ol className="text-xs text-amber-800 space-y-1.5 list-decimal list-inside">
                                <li>Admin verifies your MoMo reference</li>
                                <li>Your account gets upgraded instantly</li>
                                <li>You'll receive an email confirmation</li>
                            </ol>
                        </div>

                        <Link to="/dashboard" className="mt-6 inline-block">
                            <Button variant="secondary">Back to Dashboard</Button>
                        </Link>
                    </div>
                </div>
            </AppShell>
        )
    }

    // Calculate new expiry date
    const newExpiryDate = user.subscription_expires_at
        ? new Date(new Date(user.subscription_expires_at).getTime() + 120 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="text-center">
                    <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                        {user.is_on_trial ? "Upgrade from Trial" : "Subscribe Now"}
                    </p>
                    <h1 className="text-h1 mt-1">
                        {user.is_on_trial ? "Unlock your full access" : "Get your Semester Pass"}
                    </h1>
                    <p className="mt-2 text-body-sm text-on-surface-muted max-w-md mx-auto">
                        {user.is_on_trial
                            ? "You're on a 3-day free trial. Pay now to add 120 full days on top of your trial."
                            : "One payment. Full access for the entire semester."}
                    </p>
                </div>

                {/* Pricing Card */}
                <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-h3">Semester Pass</p>
                                <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Best Value
                                </span>
                            </div>
                            <p className="mt-1 text-body-sm text-on-surface-muted">
                                120 days of unlimited access
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-h1 text-brand-700">GHS 30</p>
                            <p className="text-xs text-on-surface-muted line-through">GHS 60</p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-on-surface-muted">
                            <span className="text-brand-600">✓</span> 2,113+ NMC Questions
                        </div>
                        <div className="flex items-center gap-1.5 text-on-surface-muted">
                            <span className="text-brand-600">✓</span> 60-min Mock Exams
                        </div>
                        <div className="flex items-center gap-1.5 text-on-surface-muted">
                            <span className="text-brand-600">✓</span> AI Clinical Logbook
                        </div>
                        <div className="flex items-center gap-1.5 text-on-surface-muted">
                            <span className="text-brand-600">✓</span> NANDA Care Plans
                        </div>
                    </div>

                    {user.is_on_trial && user.subscription_expires_at && (
                        <div className="mt-4 rounded-lg bg-brand-50 border border-brand-200 p-3">
                            <p className="text-xs font-medium text-brand-800">
                                💡 <strong>Stacking bonus:</strong> Pay today and your access extends to{" "}
                                <strong>{newExpiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>
                            </p>
                        </div>
                    )}
                </div>

                {/* ─── STEP 1: INSTRUCTIONS ──────────────────────── */}
                {step === "instructions" && (
                    <div className="rounded-2xl border border-border bg-white p-6 space-y-4 shadow-sm">

                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white text-xs font-bold">1</span>
                            <h2 className="text-h3">Send payment via Mobile Money</h2>
                        </div>

                        <p className="text-sm text-on-surface-muted">
                            Send <strong className="text-on-surface">GHS 30</strong> to the MoMo number below. Use your email as reference so we can identify you.
                        </p>

                        <div className="rounded-xl border-2 border-brand-600 bg-gradient-to-br from-brand-50 to-white p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Send to</p>
                                    <p className="mt-2 text-3xl font-black text-brand-900 tracking-wider">
                                        {info?.momo_number || "0556025785"}
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-brand-800">
                                        Name: <strong>{info?.momo_name || "NursifyGH"}</strong>
                                    </p>
                                    <p className="mt-0.5 text-sm font-medium text-brand-800">
                                        Amount: <strong>GHS {info?.amount_ghs || "30"}</strong>
                                    </p>
                                </div>
                                <button
                                    onClick={copyMoMoNumber}
                                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 px-3 py-2 text-xs font-bold text-white transition-colors shadow-sm"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    {copied ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border bg-surface-subtle p-4 space-y-2 text-sm">
                            <p className="font-bold text-on-surface text-xs uppercase tracking-wider">Steps to follow:</p>
                            <ol className="list-decimal list-inside space-y-1.5 text-on-surface-muted">
                                <li>Open your MoMo app or dial <strong className="text-on-surface">*170#</strong></li>
                                <li>Send <strong className="text-on-surface">GHS 30</strong> to <strong className="text-on-surface">{info?.momo_number || "0556025785"}</strong></li>
                                <li>Use your email <strong className="text-on-surface truncate">{user.email}</strong> as reference</li>
                                <li>Copy the <strong className="text-on-surface">Transaction ID</strong> from your SMS</li>
                                <li>Click the button below to submit it</li>
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
                            I've sent GHS 30 — Submit Reference →
                        </Button>

                        <div className="flex items-center justify-center gap-4 pt-1 text-xs text-on-surface-muted">
                            <span className="flex items-center gap-1">🔒 100% Secure</span>
                            <span className="flex items-center gap-1">⚡ 24hr Activation</span>
                            <span className="flex items-center gap-1">💬 24/7 Support</span>
                        </div>
                    </div>
                )}

                {/* ─── STEP 2: SUBMIT REFERENCE ──────────────────── */}
                {step === "submit" && (
                    <div className="rounded-2xl border border-border bg-white p-6 space-y-4 shadow-sm">

                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white text-xs font-bold">2</span>
                            <h2 className="text-h3">Submit your transaction reference</h2>
                        </div>

                        <div className="rounded-lg bg-brand-50 border border-brand-200 p-3">
                            <p className="text-xs font-medium text-brand-800">
                                Your payment reference: <strong className="font-mono text-brand-900">{txnRef}</strong>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-on-surface mb-1.5">
                                MoMo Transaction ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={manualReference}
                                onChange={(e) => setManualReference(e.target.value)}
                                placeholder="e.g. MP2401A12345"
                                className="block w-full h-11 rounded-lg border border-border px-3.5 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                            />
                            <p className="text-xs text-on-surface-muted mt-1">Find this in your MoMo SMS confirmation message</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-on-surface mb-1.5">
                                Optional note
                            </label>
                            <textarea
                                rows={2}
                                value={manualNote}
                                onChange={(e) => setManualNote(e.target.value)}
                                placeholder="e.g. Sent from AirtelTigo number ending 456"
                                className="block w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
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
                            Submit for Approval →
                        </Button>

                        <button
                            onClick={() => setStep("instructions")}
                            className="w-full text-xs text-on-surface-muted hover:text-on-surface transition-colors"
                        >
                            ← Back to payment instructions
                        </button>
                    </div>
                )}
            </div>
        </AppShell>
    )
}