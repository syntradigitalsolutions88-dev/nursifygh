import { useState } from "react"
import { Link } from "react-router-dom"
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

const INCLUDED_FEATURES = [
    {
        title: "6,000+ NMC Practice & Licensure Questions",
        detail: "Full question banks across RGN, RM, RPN, and CHN with detailed clinical rationales.",
    },
    {
        title: "60-Minute Timed CBT Mock Exams",
        detail: "Practice under real NMC exam timing and review weak areas immediately.",
    },
    {
        title: "Chief AI Nursing & Science Tutor",
        detail: "24/7 clinical explanations across pharmacology, anatomy, and priority nursing care.",
    },
    {
        title: "Interactive Clinical Case Studies",
        detail: "Realistic ward scenarios with patient vitals, triage decisions, and stage feedback.",
    },
    {
        title: "AI-Assisted NANDA Care Plans",
        detail: "Build complete care plans with SMART goals and NMC licensure print formatting.",
    },
    {
        title: "Clinical Logbook & NMC Transcript",
        detail: "Record ward procedures by level and export a clean transcript anytime.",
    },
]

const FAQS = [
    {
        q: "How fast is my account activated after paying?",
        a: "Most Mobile Money payments are verified and activated within 15–60 minutes (always within 24 hours). You can also tap the WhatsApp button after submitting for priority activation.",
    },
    {
        q: "What happens to my remaining free trial days?",
        a: "They stack! If you still have free trial days left, 120 full days are added on top of your current expiry date so you lose nothing.",
    },
    {
        q: "Does GHS 30 cover both First and Second Semester courses?",
        a: "Yes. Your Semester Pass unlocks all courses, quizzes, mock exams, care plans, and clinical tools for your entire program for 120 full days.",
    },
]

export default function SubscribePage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

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
    const [copiedField, setCopiedField] = useState<"number" | "email" | null>(null)

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

    const copyText = (value: string, field: "number" | "email") => {
        navigator.clipboard.writeText(value)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }

    if (!user) return null

    const momoNumber = info?.momo_number || "0556025785"
    const momoName = info?.momo_name || "NursifyGH"
    const amountGhs = info?.amount_ghs || "30"

    if (user.has_active_subscription && user.has_paid) {
        return (
            <AppShell>
                <div className="max-w-md mx-auto rounded-2xl border border-success-200 bg-gradient-to-br from-success-50 to-white p-8 text-center shadow-sm">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-success-700 mb-4">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-success-900">You&apos;re fully subscribed</h1>
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

    if (info?.pending) {
        const waConfirmUrl = `https://wa.me/233556025785?text=${encodeURIComponent(
            `Hello NursifyGH, I just submitted my GHS ${amountGhs} MoMo payment for ${user.email}. Transaction ID: ${info.pending.manual_reference}`
        )}`
        return (
            <AppShell>
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white p-8 text-center shadow-sm">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-4">
                            <svg className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-amber-900">Payment received. Verifying...</h1>
                        <p className="mt-2 text-sm text-amber-800 max-w-md mx-auto">
                            We&apos;ve received your reference <strong className="text-amber-900 font-mono">{info.pending.manual_reference}</strong>. Our team is verifying your payment now.
                        </p>

                        <div className="mt-6 bg-white rounded-xl border border-amber-200 p-4 text-left max-w-sm mx-auto">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">What happens next?</p>
                            <ol className="text-xs text-amber-800 space-y-1.5 list-decimal list-inside">
                                <li>Admin confirms your MoMo Transaction ID</li>
                                <li>Your 120-day Semester Pass activates automatically</li>
                                <li>Tap below if you want instant WhatsApp confirmation</li>
                            </ol>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <a
                                href={waConfirmUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors"
                            >
                                Fast-Track via WhatsApp →
                            </a>
                            <Link to="/dashboard" className="w-full sm:w-auto">
                                <Button variant="secondary" fullWidth>Back to Dashboard</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </AppShell>
        )
    }

    const baseTime = user.subscription_expires_at && new Date(user.subscription_expires_at).getTime() > Date.now()
        ? new Date(user.subscription_expires_at).getTime()
        : Date.now()
    const newExpiryDate = new Date(baseTime + 120 * 24 * 60 * 60 * 1000)

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6 pb-10">

                {/* Hero Header */}
                <div className="text-center space-y-2 pt-2">
                    <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800 uppercase tracking-wider">
                        {user.is_on_trial ? "Trial Stacking Active (+120 Days)" : "Full Semester Access"}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                        Pass Your NMC Exams With Confidence
                    </h1>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                        One simple Mobile Money payment unlocks every question bank, CBT mock exam, AI tutor, and clinical tool for 4 full months.
                    </p>
                </div>

                {/* Pricing & Value Card */}
                <div className="rounded-2xl border-2 border-brand-600 bg-white p-5 sm:p-6 shadow-md space-y-5 relative overflow-hidden">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg sm:text-xl font-black text-gray-900">Semester Pass</p>
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    50% Student Discount
                                </span>
                            </div>
                            <p className="mt-1 text-xs sm:text-sm text-gray-600">
                                120 full days · Only <strong className="text-brand-700">GHS 0.25/day</strong>
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-3xl font-black text-brand-700">GHS {amountGhs}</p>
                            <p className="text-xs text-gray-400 line-through">GHS 60</p>
                        </div>
                    </div>

                    {user.subscription_expires_at && new Date(user.subscription_expires_at).getTime() > Date.now() && (
                        <div className="rounded-xl bg-brand-50 border border-brand-200 p-3.5 flex items-center gap-2.5">
                            <span className="text-brand-700 font-black text-base">★</span>
                            <p className="text-xs text-brand-900">
                                <strong>Bonus stacking:</strong> Subscribe now and your access extends all the way to{" "}
                                <strong>{newExpiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>.
                            </p>
                        </div>
                    )}

                    <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                            Everything unlocked immediately
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            {INCLUDED_FEATURES.map((item) => (
                                <div key={item.title} className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
                                    <div className="flex items-start gap-2">
                                        <span className="text-brand-600 font-black mt-0.5">✓</span>
                                        <div>
                                            <p className="font-bold text-gray-900">{item.title}</p>
                                            <p className="text-gray-600 mt-0.5 leading-relaxed">{item.detail}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* STEP 1: INSTRUCTIONS */}
                {step === "instructions" && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white text-xs font-bold">1</span>
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">Pay via Mobile Money</h2>
                            </div>
                            <span className="text-[11px] font-semibold text-gray-500">MTN · Telecel · AT</span>
                        </div>

                        <div className="rounded-xl border-2 border-brand-600 bg-gradient-to-br from-brand-50 to-white p-4 sm:p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">MoMo Number</p>
                                    <p className="mt-1 text-2xl sm:text-3xl font-black text-brand-900 tracking-wider">
                                        {momoNumber}
                                    </p>
                                    <p className="mt-1 text-xs sm:text-sm font-medium text-brand-800">
                                        Account Name: <strong>{momoName}</strong> · Amount: <strong>GHS {amountGhs}</strong>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyText(momoNumber, "number")}
                                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 px-3 py-2 text-xs font-bold text-white transition-colors shadow-sm"
                                >
                                    {copiedField === "number" ? "Copied!" : "Copy Number"}
                                </button>
                            </div>

                            <div className="pt-2 border-t border-brand-200/70 flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0 text-xs text-brand-900">
                                    <span className="text-brand-700 font-semibold">Reference: </span>
                                    <strong className="font-mono break-all">{user.email}</strong>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyText(user.email, "email")}
                                    className="shrink-0 rounded-lg border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-50"
                                >
                                    {copiedField === "email" ? "Copied!" : "Copy Email"}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-xs sm:text-sm">
                            <p className="font-bold text-gray-900 text-xs uppercase tracking-wider">Quick 4-Step Guide:</p>
                            <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                                <li>
                                    Dial{" "}
                                    <a href="tel:*170%23" className="font-bold text-brand-700 underline">
                                        *170#
                                    </a>{" "}
                                    or open your MoMo / Telecel Cash app
                                </li>
                                <li>Send <strong>GHS {amountGhs}</strong> to <strong>{momoNumber}</strong> ({momoName})</li>
                                <li>Enter <strong>{user.email}</strong> as the payment reference</li>
                                <li>Copy the <strong>Transaction ID</strong> from your SMS and tap below</li>
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
                            I&apos;ve Sent GHS {amountGhs} — Enter Transaction ID →
                        </Button>

                        <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs text-gray-500">
                            <span>100% Secure</span>
                            <span>•</span>
                            <span>120 Days Access</span>
                            <span>•</span>
                            <a
                                href="https://wa.me/233556025785"
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-brand-700 underline"
                            >
                                Need help? Chat on WhatsApp
                            </a>
                        </div>
                    </div>
                )}

                {/* STEP 2: SUBMIT REFERENCE */}
                {step === "submit" && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white text-xs font-bold">2</span>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900">Confirm your MoMo Transaction ID</h2>
                        </div>

                        <div className="rounded-lg bg-brand-50 border border-brand-200 p-3">
                            <p className="text-xs font-medium text-brand-800">
                                Order Reference: <strong className="font-mono text-brand-900">{txnRef}</strong>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                MoMo Transaction ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={manualReference}
                                onChange={(e) => setManualReference(e.target.value)}
                                placeholder="e.g. 42819045123"
                                className="block w-full h-11 rounded-xl border border-gray-300 px-3.5 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Paste the Transaction ID from your Mobile Money SMS receipt</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                Sender Name / Network (optional)
                            </label>
                            <input
                                type="text"
                                value={manualNote}
                                onChange={(e) => setManualNote(e.target.value)}
                                placeholder="e.g. MTN MoMo - Ama Mensah"
                                className="block w-full h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
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
                            Submit &amp; Activate Pass →
                        </Button>

                        <button
                            type="button"
                            onClick={() => setStep("instructions")}
                            className="w-full text-xs text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            ← Back to payment details
                        </button>
                    </div>
                )}

                {/* FAQ Section */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
                    <h2 className="text-base font-bold text-gray-900">Frequently Asked Questions</h2>
                    <div className="divide-y divide-gray-100">
                        {FAQS.map((item) => (
                            <div key={item.q} className="py-3 first:pt-0 last:pb-0">
                                <p className="text-sm font-bold text-gray-900">{item.q}</p>
                                <p className="mt-1 text-xs text-gray-600 leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
