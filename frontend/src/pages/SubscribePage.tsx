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

type NetworkKey = "mtn" | "telecel" | "at"

const NETWORKS: Record<
    NetworkKey,
    {
        name: string
        short: string
        ussd: string
        telHref: string
        dotColor: string
        steps: string[]
    }
> = {
    mtn: {
        name: "MTN MoMo",
        short: "MTN",
        ussd: "*170#",
        telHref: "tel:*170%23",
        dotColor: "bg-amber-400",
        steps: [
            "Dial *170# or open the MTN MoMo App",
            "Choose 1 (Transfer Money) → 1 (MoMo User)",
            "Enter the MoMo number above and amount",
            "Use your NursifyGH email as Reference and approve",
        ],
    },
    telecel: {
        name: "Telecel Cash",
        short: "Telecel",
        ussd: "*110#",
        telHref: "tel:*110%23",
        dotColor: "bg-rose-500",
        steps: [
            "Dial *110# or open the Telecel Play App",
            "Select 1 (Send Money) → Other Networks (MTN)",
            "Enter the MoMo number above and amount",
            "Enter your NursifyGH email as Reference and confirm",
        ],
    },
    at: {
        name: "AT Money",
        short: "AT",
        ussd: "*110#",
        telHref: "tel:*110%23",
        dotColor: "bg-sky-500",
        steps: [
            "Dial *110# on your AT line",
            "Select Send Money → Other Networks (MTN)",
            "Enter the MoMo number above and amount",
            "Add your NursifyGH email as Reference and confirm",
        ],
    },
}

const INCLUDED_FEATURES = [
    {
        title: "6,000+ NMC Exam Questions",
        detail: "Full question banks for RGN, RM, RPN, CHN, NAC, and NAP with clear clinical rationales.",
        icon: (
            <svg className="h-5 w-5 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        title: "60-Minute Timed CBT Mocks",
        detail: "Practice under real NMC licensure exam timing and review weak topics.",
        icon: (
            <svg className="h-5 w-5 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        title: "Chief AI Nursing Tutor",
        detail: "24/7 clinical explanations across pharmacology, anatomy, and priority care.",
        icon: (
            <svg className="h-5 w-5 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        ),
    },
    {
        title: "Ward Case Studies",
        detail: "Step-by-step clinical scenarios with vitals, triage decisions, and feedback.",
        icon: (
            <svg className="h-5 w-5 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
    },
    {
        title: "NANDA Care Plan Builder",
        detail: "Create structured SMART care plans formatted for NMC practical evaluation.",
        icon: (
            <svg className="h-5 w-5 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4" />
            </svg>
        ),
    },
    {
        title: "Clinical Logbook & Transcript",
        detail: "Log ward procedures across every level and export clean transcripts.",
        icon: (
            <svg className="h-5 w-5 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        ),
    },
]

const FAQS = [
    {
        q: "How fast is my account activated after paying?",
        a: "Most Mobile Money payments are verified and activated within 15–60 minutes (always within 24 hours). You can also tap the WhatsApp button right after submitting for faster confirmation.",
    },
    {
        q: "What happens to my remaining free trial days?",
        a: "They stack automatically. If you still have active trial days left, 120 full days are added on top of your current expiry date so you lose nothing.",
    },
    {
        q: "Does GHS 30 cover both First and Second Semester courses?",
        a: "Yes. Your Semester Pass unlocks every level, course, quiz, CBT mock exam, care plan tool, and clinical logbook in your program for 120 full days.",
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
    const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>("mtn")
    const [manualReference, setManualReference] = useState("")
    const [manualNote, setManualNote] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [txnRef, setTxnRef] = useState<string | null>(null)
    const [copiedField, setCopiedField] = useState<"number" | "email" | null>(null)
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

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
    const activeNet = NETWORKS[selectedNetwork]

    if (user.has_active_subscription && user.has_paid) {
        return (
            <AppShell>
                <div className="max-w-md mx-auto rounded-2xl border border-emerald-200 bg-white p-7 text-center shadow-sm">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mb-4">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Your Semester Pass is active</h1>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                        You have full access to all courses, mock exams, and clinical tools until{" "}
                        <strong className="text-gray-900">
                            {user.subscription_expires_at
                                ? new Date(user.subscription_expires_at).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                  })
                                : "—"}
                        </strong>
                        .
                    </p>
                    <Link to="/dashboard" className="mt-6 block">
                        <Button size="lg" fullWidth>Back to Dashboard</Button>
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
                <div className="max-w-xl mx-auto space-y-5">
                    <div className="rounded-2xl border border-amber-300 bg-white p-6 sm:p-8 shadow-sm">
                        <div className="text-center">
                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 mb-3">
                                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-900">
                                Pending Verification
                            </span>
                            <h1 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900">
                                Payment submitted
                            </h1>
                            <p className="mt-1.5 text-sm text-gray-600 max-w-md mx-auto">
                                We received your Transaction ID{" "}
                                <strong className="font-mono text-gray-900">{info.pending.manual_reference}</strong>. Your 120-day pass will activate shortly.
                            </p>
                        </div>

                        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2.5 text-xs">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">✓</span>
                                <span className="text-gray-800">Reference logged for <strong>{user.email}</strong></span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold">2</span>
                                <span className="text-gray-800">Confirming MoMo receipt (usually 15–60 mins)</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-gray-500">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-bold">3</span>
                                <span>120-day Semester Pass activates automatically</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <a
                                href={waConfirmUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                            >
                                Confirm on WhatsApp →
                            </a>
                            <Link to="/dashboard" className="sm:w-auto">
                                <Button variant="secondary" fullWidth>Dashboard</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </AppShell>
        )
    }

    const baseTime =
        user.subscription_expires_at && new Date(user.subscription_expires_at).getTime() > Date.now()
            ? new Date(user.subscription_expires_at).getTime()
            : Date.now()
    const newExpiryDate = new Date(baseTime + 120 * 24 * 60 * 60 * 1000)

    return (
        <AppShell>
            <div className="max-w-2xl mx-auto space-y-6 pb-12">
                {/* Clean Header + Plan Summary */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full bg-brand-50 border border-brand-200 px-3 py-0.5 text-xs font-semibold text-brand-800">
                            {user.is_on_trial ? "Trial Stacking (+120 Days)" : "Semester Pass"}
                        </span>
                        <span className="text-xs font-medium text-gray-500">RGN · RM · RPN · CHN</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Full Semester Exam Access
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                120 full days of access · Only <strong className="text-gray-900">GHS 0.25/day</strong> · One-time payment
                            </p>
                        </div>
                        <div className="sm:text-right shrink-0">
                            <div className="flex items-baseline sm:justify-end gap-2">
                                <span className="text-sm text-gray-400 line-through">GHS 60</span>
                                <span className="text-3xl font-bold text-brand-700">GHS {amountGhs}</span>
                            </div>
                            <span className="inline-block mt-0.5 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                50% Student Discount
                            </span>
                        </div>
                    </div>

                    {user.subscription_expires_at && new Date(user.subscription_expires_at).getTime() > Date.now() && (
                        <div className="rounded-xl bg-brand-50/80 border border-brand-200 px-3.5 py-2.5 text-xs text-brand-900">
                            <strong>Remaining trial days stay yours:</strong> subscribing now extends your access to{" "}
                            <strong>
                                {newExpiryDate.toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </strong>
                            .
                        </div>
                    )}
                </div>

                {/* STEP 1: MOBILE MONEY PAYMENT */}
                {step === "instructions" && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white text-xs font-bold">
                                    1
                                </span>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">Pay via Mobile Money</h2>
                                    <p className="text-xs text-gray-500">Step 1 of 2</p>
                                </div>
                            </div>

                            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                                {(["mtn", "telecel", "at"] as NetworkKey[]).map((key) => {
                                    const net = NETWORKS[key]
                                    const active = selectedNetwork === key
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelectedNetwork(key)}
                                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                                active
                                                    ? "bg-white text-gray-900 shadow-xs"
                                                    : "text-gray-500 hover:text-gray-800"
                                            }`}
                                        >
                                            <span className={`h-2 w-2 rounded-full ${net.dotColor}`} />
                                            {net.short}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* MoMo Recipient Box */}
                        <div className="rounded-xl border border-brand-300 bg-brand-50/40 p-4 sm:p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-brand-800">
                                        Send GHS {amountGhs} to MoMo Number
                                    </p>
                                    <p className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tracking-wide font-mono">
                                        {momoNumber}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-700">
                                        Account Name: <strong className="text-gray-900">{momoName}</strong>
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => copyText(momoNumber, "number")}
                                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
                                >
                                    {copiedField === "number" ? "Copied!" : "Copy Number"}
                                </button>
                            </div>

                            <div className="pt-2.5 border-t border-brand-200/70 flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0 text-xs">
                                    <span className="text-gray-600">Reference: </span>
                                    <strong className="font-mono text-gray-900 break-all">{user.email}</strong>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyText(user.email, "email")}
                                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    {copiedField === "email" ? "Copied!" : "Copy Email"}
                                </button>
                            </div>
                        </div>

                        {/* Network Steps */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-800">
                                    Steps for {activeNet.name}
                                </span>
                                <a
                                    href={activeNet.telHref}
                                    className="text-xs font-bold text-brand-700 hover:underline"
                                >
                                    Dial {activeNet.ussd} →
                                </a>
                            </div>
                            <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-700">
                                {activeNet.steps.map((s) => (
                                    <li key={s}>{s}</li>
                                ))}
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

                        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
                            <span>Secure MoMo Payment</span>
                            <span>•</span>
                            <span>120 Days Access</span>
                            <span>•</span>
                            <a
                                href="https://wa.me/233556025785"
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-brand-700 hover:underline"
                            >
                                Need help? Chat on WhatsApp
                            </a>
                        </div>
                    </div>
                )}

                {/* STEP 2: CONFIRM TRANSACTION ID */}
                {step === "submit" && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white text-xs font-bold">
                                    2
                                </span>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">Confirm Transaction ID</h2>
                                    <p className="text-xs text-gray-500">Step 2 of 2</p>
                                </div>
                            </div>
                            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                                {txnRef}
                            </span>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                            Check your Mobile Money SMS receipt for the 10–11 digit{" "}
                            <strong className="text-gray-900">Transaction ID</strong> (e.g.{" "}
                            <span className="font-mono">42819045123</span>) and enter it below.
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                                MoMo Transaction ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={manualReference}
                                onChange={(e) => setManualReference(e.target.value)}
                                placeholder="e.g. 42819045123"
                                className="block w-full h-11 rounded-xl border border-gray-300 px-3.5 text-sm font-mono text-gray-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                                Sender Name / Network (optional)
                            </label>
                            <input
                                type="text"
                                value={manualNote}
                                onChange={(e) => setManualNote(e.target.value)}
                                placeholder="e.g. MTN MoMo - Ama Mensah"
                                className="block w-full h-11 rounded-xl border border-gray-300 px-3.5 text-sm focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
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
                            className="w-full text-xs text-gray-500 hover:text-gray-900"
                        >
                            ← Back to payment details
                        </button>
                    </div>
                )}

                {/* INCLUDED TOOLS */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">What&apos;s included in your pass</h2>
                        <p className="text-xs text-gray-500">Everything unlocks immediately once confirmed</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {INCLUDED_FEATURES.map((item) => (
                            <div
                                key={item.title}
                                className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3.5 flex items-start gap-3"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 border border-brand-100">
                                    {item.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{item.title}</p>
                                    <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">{item.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-3">
                    <h2 className="text-base font-bold text-gray-900">Frequently Asked Questions</h2>
                    <div className="space-y-2">
                        {FAQS.map((item, idx) => {
                            const isOpen = openFaqIndex === idx
                            return (
                                <div key={item.q} className="rounded-xl border border-gray-200 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-gray-50/60 hover:bg-gray-50"
                                    >
                                        <span className="text-xs sm:text-sm font-semibold text-gray-900">{item.q}</span>
                                        <svg
                                            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                                                isOpen ? "rotate-180" : ""
                                            }`}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {isOpen && (
                                        <div className="px-4 py-3 text-xs text-gray-600 leading-relaxed bg-white border-t border-gray-100">
                                            {item.a}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
