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

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface-subtle">
            <div className="max-w-lg w-full bg-white border border-gray-400">
                {/* Header */}
                <div className="border-b-2 border-black px-6 py-5 text-center">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black mb-3">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                        NursifyGH · Premium Access Required
                    </p>
                    <h1 className="text-xl font-bold mt-1 text-black">{feature}</h1>
                    <p className="text-sm text-gray-700 mt-1 leading-snug">{description}</p>
                </div>

                {/* Value list */}
                <div className="px-6 py-5">
                    <p className="text-sm font-semibold text-black mb-3">
                        The Semester Pass includes:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-800">
                        <Bullet>All 148 NMC courses · 1,000+ practice questions</Bullet>
                        <Bullet>Unlimited 60-minute mock exam simulations</Bullet>
                        <Bullet>Clinical Tracker with supervisor log &amp; history</Bullet>
                        <Bullet>AI Care Plan Autofill with NANDA codes</Bullet>
                        <Bullet>N&amp;MC licensure-format transcription view</Bullet>
                        <Bullet>Community care plan library</Bullet>
                    </ul>

                    <div className="mt-5 border border-black p-3">
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-black">Semester Pass</span>
                            <span className="text-xl font-bold text-black">GHS 30</span>
                        </div>
                        <p className="text-xs text-gray-700 mt-1">
                            120 days full access · one-time payment · no renewals
                        </p>
                    </div>

                    <Link to="/subscribe" className="block mt-4">
                        <Button size="lg" fullWidth>Subscribe — GHS 30 →</Button>
                    </Link>

                    <p className="mt-3 text-[11px] text-center text-gray-600">
                        Pay with Mobile Money · Active within 24 hours
                    </p>
                </div>
            </div>
        </div>
    )
}

function Bullet({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-black shrink-0" />
            <span className="leading-snug">{children}</span>
        </li>
    )
}