import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"

import { getCurrentUser } from "../api/auth"
import {
    initiateCheckout,
    simulatePaystackWebhook,
} from "../api/payments"
import { useAuth } from "../contexts/AuthContext"

export default function SubscribePage() {
    const { user, logout, refreshUser } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [state, setState] = useState<
        "idle" | "creating" | "paying" | "polling" | "error"
    >("idle")
    const [error, setError] = useState<string | null>(null)
    const [pendingReference, setPendingReference] = useState<string | null>(null)

    if (!user) return null

    // If already subscribed, show a friendly "already subscribed" card
    if (user.has_active_subscription) {
        return (
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white border-b border-gray-100">
                    <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
                        <Link to="/dashboard" className="text-xl font-bold text-brand-700">
                            NursifyGH
                        </Link>
                        <button onClick={logout} className="btn-secondary text-sm">
                            Log out
                        </button>
                    </div>
                </header>
                <main className="max-w-3xl mx-auto px-4 py-8">
                    <div className="card bg-green-50 ring-green-100 text-center">
                        <h1 className="text-2xl font-bold text-green-900">
                            You're already subscribed
                        </h1>
                        <p className="mt-2 text-sm text-green-800">
                            Your subscription is active until{" "}
                            {user.subscription_expires_at
                                ? new Date(user.subscription_expires_at).toLocaleDateString()
                                : "—"}
                            .
                        </p>
                        <Link to="/dashboard" className="btn-primary mt-6 inline-block">
                            Go to dashboard
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    async function handleSubscribe() {
        setError(null)
        setState("creating")
        try {
            const txn = await initiateCheckout({
                provider: "PAYSTACK",
                duration_days: 120,
            })

            // Real Paystack: redirect to authorization_url
            if (txn.authorization_url) {
                window.location.href = txn.authorization_url
                return
            }

            // Dev mode: no real key configured, show simulation
            setPendingReference(txn.reference)
            setState("paying")
        } catch {
            setError("Failed to start checkout. Please try again.")
            setState("error")
        }
    }

    async function handleSimulatePayment() {
        if (!pendingReference) return
        setError(null)
        setState("polling")
        try {
            // 1. Fire the signed webhook as if Paystack just called us
            await simulatePaystackWebhook(pendingReference)

            // 2. Poll the backend until the subscription activates (max 10 tries, 1s apart)
            let activated = false
            for (let i = 0; i < 10; i++) {
                await new Promise((r) => setTimeout(r, 1000))
                const me = await getCurrentUser()
                if (me.has_active_subscription) {
                    activated = true
                    break
                }
            }

            if (!activated) {
                setError("Payment accepted but subscription didn't activate. Refresh in a moment.")
                setState("error")
                return
            }

            // 3. Refresh auth state and route home
            await refreshUser()
            queryClient.invalidateQueries()
            navigate("/dashboard", { replace: true })
        } catch {
            setError("Payment simulation failed. Check the Django terminal.")
            setState("error")
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
                    <Link to="/dashboard" className="text-xl font-bold text-brand-700">
                        NursifyGH
                    </Link>
                    <button onClick={logout} className="btn-secondary text-sm">
                        Log out
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div>
                    <Link
                        to="/dashboard"
                        className="text-sm text-brand-600 hover:underline"
                    >
                        ← Back to dashboard
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">
                        Unlock everything
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        One payment. Full access for a semester.
                    </p>
                </div>

                <div className="card">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Semester Pass
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">120 days of full access</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-brand-700">GHS 30</p>
                            <p className="text-xs text-gray-500">one-time</p>
                        </div>
                    </div>

                    <ul className="mt-6 space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                            <span className="text-brand-600">✓</span>
                            <span>All courses, quizzes, and timed mock exams</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-brand-600">✓</span>
                            <span>Full NANDA care plan builder with SMART goals</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-brand-600">✓</span>
                            <span>Share plans with clinical instructors via WhatsApp</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-brand-600">✓</span>
                            <span>Access to the community care plan library</span>
                        </li>
                    </ul>
                </div>

                <div className="card">
                    <h3 className="text-sm font-medium text-gray-700">
                        Pay with Mobile Money
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                        MTN MoMo, Vodafone Cash, AirtelTigo Money · also accepts cards
                    </p>

                    {error && (
                        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {state === "idle" || state === "error" ? (
                        <button
                            onClick={handleSubscribe}
                            className="btn-primary w-full mt-4"
                        >
                            Pay GHS 30 with Paystack
                        </button>
                    ) : state === "creating" ? (
                        <button disabled className="btn-primary w-full mt-4">
                            Starting checkout…
                        </button>
                    ) : state === "paying" ? (
                        <div className="mt-4 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-4">
                            <p className="text-xs font-medium text-amber-800">
                                🧪 Dev mode — no real Paystack key configured
                            </p>
                            <p className="mt-1 text-xs text-amber-700">
                                In production, this is where the student would be redirected to
                                Paystack's hosted MoMo checkout. For testing, click below to
                                simulate a successful payment.
                            </p>
                            <button
                                onClick={handleSimulatePayment}
                                className="btn-primary w-full mt-3"
                            >
                                Simulate successful payment
                            </button>
                            <p className="mt-2 text-xs text-amber-700">
                                Reference: <span className="font-mono">{pendingReference}</span>
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center justify-center gap-2 py-4">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                            <p className="text-sm text-gray-600">
                                Confirming payment with Paystack…
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}