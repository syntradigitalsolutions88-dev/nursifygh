import { useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { useAuth } from "../contexts/AuthContext"

/**
 * Landing page after real Paystack redirect. Paystack sends the user back
 * with ?reference=... — we just poll /me/ until is_subscribed becomes true
 * (the webhook handler on the backend activates the subscription).
 */
export default function CheckoutCallbackPage() {
    const [params] = useSearchParams()
    const reference = params.get("reference")
    const navigate = useNavigate()
    const { refreshUser } = useAuth()

    useEffect(() => {
        let cancelled = false
        async function poll() {
            for (let i = 0; i < 30; i++) {
                await new Promise((r) => setTimeout(r, 2000))
                if (cancelled) return
                try {
                    await refreshUser()
                    // If activation succeeded, /me/ returns is_subscribed=true and
                    // refreshUser updates context. Just navigate home and let the
                    // dashboard reflect the new state.
                    navigate("/dashboard", { replace: true })
                    return
                } catch {
                    /* keep polling */
                }
            }
            navigate("/dashboard", { replace: true })
        }
        poll()
        return () => {
            cancelled = true
        }
    }, [navigate, refreshUser])

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="card max-w-md w-full text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                <h1 className="text-xl font-bold text-gray-900">Confirming payment…</h1>
                <p className="mt-2 text-sm text-gray-600">
                    This usually takes a few seconds. Do not close this page.
                </p>
                {reference && (
                    <p className="mt-4 text-xs text-gray-400 font-mono">
                        Reference: {reference}
                    </p>
                )}
                <Link
                    to="/dashboard"
                    className="mt-6 inline-block text-sm text-brand-600 hover:underline"
                >
                    Continue to dashboard →
                </Link>
            </div>
        </div>
    )
}