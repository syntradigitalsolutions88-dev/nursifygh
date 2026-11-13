import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"
import { useAuth } from "../contexts/AuthContext"
import type { AmbassadorStats } from "../types/api"

export default function AmbassadorPage() {
    const { user, refreshUser } = useAuth()
    const queryClient = useQueryClient()
    const [copied, setCopied] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    const { data: stats, isLoading } = useQuery<AmbassadorStats>({
        queryKey: ["ambassador-stats"],
        queryFn: async () => {
            const res = await api.get("/accounts/ambassador/stats/")
            return res.data
        },
        enabled: !!user?.is_ambassador,
    })

    const becomeMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post("/accounts/ambassador/become/")
            return res.data as { code: string }
        },
        onSuccess: async (data) => {
            await refreshUser()
            queryClient.invalidateQueries({ queryKey: ["ambassador-stats"] })
            showToast(`You're an ambassador! Code: ${data.code}`)
        },
        onError: () => showToast("Failed to become ambassador.", "error"),
    })

    async function copyCode() {
        if (!stats?.referral_code) return
        try {
            await navigator.clipboard.writeText(stats.referral_code)
            setCopied(true)
            showToast("Code copied!")
            setTimeout(() => setCopied(false), 2000)
        } catch {
            showToast("Couldn't copy — long-press the code instead.", "error")
        }
    }

    // ── Not yet an ambassador
    if (user && !user.is_ambassador) {
        return (
            <AppShell>
                <div className="max-w-2xl mx-auto py-12 px-4">
                    <div className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 p-8 sm:p-12 text-white text-center shadow-2xl">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/20 text-brand-300 mb-6">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-4">Become a NursifyGH Ambassador</h1>
                        <p className="text-brand-100 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                            Share NursifyGH with your classmates and earn <strong className="text-white">GHS 4.50</strong> (15%)
                            for every student who subscribes using your unique referral code.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            {[
                                { label: "Get your code", value: "Instantly" },
                                { label: "Per referral", value: "GHS 4.50" },
                                { label: "Payout", value: "MoMo" },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl bg-white/10 border border-white/20 p-4 backdrop-blur-sm">
                                    <p className="text-xs font-semibold text-brand-200 uppercase tracking-wider">{item.label}</p>
                                    <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <Button
                            size="lg"
                            onClick={() => becomeMutation.mutate()}
                            disabled={becomeMutation.isPending}
                            className="!bg-brand-500 hover:!bg-brand-400 !text-brand-950 font-bold px-10 h-14 text-base shadow-lg shadow-brand-500/30"
                        >
                            {becomeMutation.isPending ? "Activating…" : "Activate my referral code →"}
                        </Button>

                        <p className="mt-6 text-xs text-brand-300 max-w-md mx-auto">
                            You must be a subscribed student to earn commissions. Codes are unique and tied to your account.
                        </p>
                    </div>
                </div>

                {toast && (
                    <div className={`fixed top-6 right-6 z-[60] rounded-lg px-4 py-3 shadow-xl text-sm font-medium text-white ${toast.type === "success" ? "bg-brand-700" : "bg-red-600"}`}>
                        {toast.message}
                    </div>
                )}
            </AppShell>
        )
    }

    // ── Loading
    if (isLoading || !stats) {
        return (
            <AppShell>
                <div className="p-10 text-center text-on-surface-muted">Loading ambassador data…</div>
            </AppShell>
        )
    }

    // ── Ambassador dashboard
    const totalEarned = parseFloat(stats.total_earned)
    const pending = parseFloat(stats.pending_payout)
    const paidOut = parseFloat(stats.paid_out)

    return (
        <AppShell>
            <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4">

                {/* Header */}
                <div>
                    <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Ambassador Program</p>
                    <h1 className="text-3xl font-bold text-on-surface mt-1">Your Dashboard</h1>
                    <p className="text-sm text-on-surface-muted mt-2">
                        Track your earnings, share your code, and see who's joined through you.
                    </p>
                </div>

                {/* Code Card */}
                <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-brand-200 uppercase tracking-widest">Your Referral Code</p>
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-4">
                            <code className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                                {stats.referral_code}
                            </code>
                            <button
                                onClick={copyCode}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shrink-0 ${
                                    copied
                                        ? "bg-green-500 text-white"
                                        : "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                                }`}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {copied ? "Copied!" : "Copy code"}
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-brand-100">
                            Share this code with classmates. They enter it on the registration page. You earn <strong className="text-white">GHS 4.50</strong> each time they pay for a semester pass.
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Earned" value={`GHS ${totalEarned.toFixed(2)}`} accent="brand" />
                    <StatCard label="Paid Out" value={`GHS ${paidOut.toFixed(2)}`} accent="green" />
                    <StatCard label="Pending Payout" value={`GHS ${pending.toFixed(2)}`} accent="amber" />
                    <StatCard label="Referred Students" value={String(stats.referral_count)} accent="slate" />
                </div>

                {/* Recent Referrals */}
                <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border px-6 py-4">
                        <h2 className="text-base font-bold text-on-surface">Recent Referrals</h2>
                        <p className="text-xs text-on-surface-muted mt-0.5">Students who signed up using your code</p>
                    </div>

                    {stats.recent.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-on-surface-muted mb-3">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-on-surface">No referrals yet</p>
                            <p className="text-xs text-on-surface-muted mt-1">Share your code to get your first signup.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {stats.recent.map((r, i) => (
                                <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-surface-subtle/40 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                                            {r.referred_email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-on-surface truncate">{r.referred_email}</p>
                                            <p className="text-xs text-on-surface-muted">
                                                {new Date(r.date).toLocaleDateString("en-GB", {
                                                    day: "numeric", month: "short", year: "numeric"
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <span className="text-sm font-bold text-brand-700">+ GHS {parseFloat(r.amount).toFixed(2)}</span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                            r.is_paid_out
                                                ? "bg-green-100 text-green-700"
                                                : "bg-amber-100 text-amber-700"
                                        }`}>
                                            {r.is_paid_out ? "Paid" : "Pending"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* How it works */}
                <div className="rounded-2xl border border-border bg-surface-subtle/40 p-6">
                    <h3 className="text-sm font-bold text-on-surface mb-3">How payouts work</h3>
                    <ul className="space-y-2 text-sm text-on-surface-muted">
                        <li className="flex gap-2">
                            <span className="text-brand-600 font-bold">1.</span>
                            Each student who subscribes with your code earns you GHS 4.50.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-brand-600 font-bold">2.</span>
                            Commissions remain "pending" for <strong>14 days</strong> to handle any refunds or payment disputes.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-brand-600 font-bold">3.</span>
                            After 14 days, we send your pending balance directly to your registered MoMo number.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-brand-600 font-bold">4.</span>
                            Minimum payout threshold: <strong>GHS 10.00</strong>.
                        </li>
                    </ul>
                </div>
            </div>

            {toast && (
                <div className={`fixed top-6 right-6 z-[60] rounded-lg px-4 py-3 shadow-xl text-sm font-medium text-white ${toast.type === "success" ? "bg-brand-700" : "bg-red-600"}`}>
                    {toast.message}
                </div>
            )}
        </AppShell>
    )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: "brand" | "green" | "amber" | "slate" }) {
    const accentClasses = {
        brand: "text-brand-700",
        green: "text-green-700",
        amber: "text-amber-700",
        slate: "text-on-surface",
    } as const
    return (
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider">{label}</p>
            <p className={`mt-2 text-2xl font-black ${accentClasses[accent]}`}>{value}</p>
        </div>
    )
}