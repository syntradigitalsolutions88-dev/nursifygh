import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import Button from "./ui/Button"

interface PaywallGateProps {
    feature: string
    description: string
    children: React.ReactNode
}

const PASS_HIGHLIGHTS = [
    "6,000+ NMC Questions & Rationales (RGN · RM · RPN · CHN)",
    "Unlimited 60-Minute Timed CBT Mock Simulations",
    "24/7 Chief AI Nursing & Science Tutor",
    "AI NANDA Care Plans & NMC Licensure Print Format",
    "Interactive Ward Case Studies & Clinical Logbook",
]

export default function PaywallGate({ feature, description, children }: PaywallGateProps) {
    const { user } = useAuth()

    if (!user) return null
    if (user.has_active_subscription) return <>{children}</>

    const isExpired =
        user.subscription_expires_at !== null && new Date(user.subscription_expires_at) < new Date()

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface-subtle">
            <div className="max-w-lg w-full rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="border-b border-gray-100 bg-brand-50/60 px-6 py-6 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 mb-3">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                        {isExpired ? "Free Trial Ended" : "Semester Pass Required"}
                    </p>
                    <h1 className="text-xl font-bold text-gray-900 mt-1">{feature}</h1>
                    <p className="text-sm text-gray-600 mt-1.5 max-w-md mx-auto leading-relaxed">
                        {isExpired
                            ? "Your 3-day free trial has ended. Subscribe to keep using NursifyGH."
                            : description}
                    </p>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2.5">
                            Included in your Semester Pass
                        </p>
                        <ul className="space-y-2">
                            {PASS_HIGHLIGHTS.map((label) => (
                                <li key={label} className="flex items-start gap-2.5 text-sm text-gray-700">
                                    <svg className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Semester Pass</p>
                            <p className="text-xs text-gray-600 mt-0.5">120 full days · One-time payment</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-brand-700">GHS 30</span>
                            <span className="block text-xs text-gray-400 line-through">GHS 60</span>
                        </div>
                    </div>

                    <Link to="/subscribe" className="block">
                        <Button size="lg" fullWidth>Subscribe — GHS 30 →</Button>
                    </Link>

                    <p className="text-xs text-center text-gray-500">
                        Pay with MTN MoMo, Telecel Cash, or AT Money
                    </p>
                </div>
            </div>
        </div>
    )
}
