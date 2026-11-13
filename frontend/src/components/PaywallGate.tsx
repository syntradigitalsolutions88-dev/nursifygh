import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import Button from "./ui/Button"

interface PaywallGateProps {
    feature: string
    description: string
    children: React.ReactNode
}

export default function PaywallGate({ feature, description, children }: PaywallGateProps) {
    const { user } = useAuth()

    if (!user) return null
    if (user.has_active_subscription) return <>{children}</>

    // Determine if this is a trial expiry or a fresh signup
    const isExpired = user.subscription_expires_at !== null && new Date(user.subscription_expires_at) < new Date()

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface-subtle">
            <div className="max-w-lg w-full bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-brand-900 to-brand-800 px-6 py-6 text-center text-white">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm mb-3">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-200">
                        {isExpired ? "Free Trial Ended" : "Premium Access Required"}
                    </p>
                    <h1 className="text-xl font-bold mt-1">{feature}</h1>
                    <p className="text-sm text-brand-100 mt-1 leading-snug">
                        {isExpired
                            ? "Your 3-day free trial has ended. Subscribe to keep using NursifyGH."
                            : description}
                    </p>
                </div>

                {/* Value list */}
                <div className="px-6 py-5">
                    <p className="text-sm font-semibold text-on-surface mb-3">
                        The Semester Pass includes:
                    </p>
                    <ul className="space-y-2 text-sm text-on-surface-muted">
                        <Bullet>All 148 NMC courses · 1,000+ practice questions</Bullet>
                        <Bullet>Unlimited 60-minute mock exam simulations</Bullet>
                        <Bullet>Clinical Tracker with supervisor log &amp; history</Bullet>
                        <Bullet>AI Care Plan Autofill with NANDA codes</Bullet>
                        <Bullet>N&amp;MC licensure-format transcription view</Bullet>
                        <Bullet>Community care plan library</Bullet>
                    </ul>

                    <div className="mt-5 border border-brand-200 bg-brand-50 rounded-xl p-4">
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-brand-900">Semester Pass</span>
                            <span className="text-xl font-bold text-brand-700">GHS 30</span>
                        </div>
                        <p className="text-xs text-brand-700 mt-1">
                            120 days of full access · one-time payment · no auto-renewals
                        </p>
                    </div>

                    <Link to="/subscribe" className="block mt-4">
                        <Button size="lg" fullWidth>Subscribe — GHS 30 →</Button>
                    </Link>

                    <p className="mt-3 text-[11px] text-center text-on-surface-muted">
                        Pay with Mobile Money · Active instantly
                    </p>
                </div>
            </div>
        </div>
    )
}

function Bullet({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-brand-600 shrink-0" />
            <span className="leading-snug">{children}</span>
        </li>
    )
}