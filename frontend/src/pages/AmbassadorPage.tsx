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

    // ✨ If the user is not an ambassador, show the pitch
    if (user && !user.is_ambassador) {
        return (
            <AppShell>
                <div className="max-w-2xl mx-auto py-6 px-4">
                    <div className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 p-6 sm:p-10 text-white shadow-2xl">
                        <div className="text-center">
                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/20 text-brand-300 mb-4">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Earn GHS 4.50 per Referral</h1>
                            <p className="text-brand-100 text-sm sm:text-base mb-6 max-w-md mx-auto leading-relaxed">
                                Share NursifyGH with your classmates. You earn 15% commission for every student who subscribes with your code.
                            </p>

                            <Button
                                size="lg"
                                onClick={() => becomeMutation.mutate()}
                                disabled={becomeMutation.isPending}
                                className="!bg-brand-500 hover:!bg-brand-400 !text-brand-950 font-bold px-10 h-14 text-base shadow-lg shadow-brand-500/30 w-full sm:w-auto"
                            >
                                {becomeMutation.isPending ? "Activating…" : "Activate my referral code →"}
                            </Button>

                            <p className="mt-3 text-xs text-brand-300">
                                Free to activate. Takes 1 second.
                            </p>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { label: "Get your code", value: "Instantly" },
                                { label: "Per referral", value: "GHS 4.50" },
                                { label: "Payout", value: "3 days" },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl bg-white/10 border border-white/20 p-4 text-center">
                                    <p className="text-[10px] font-semibold text-brand-200 uppercase tracking-wider">{item.label}</p>
                                    <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
                                </div>
                            ))}
                        </div>
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

    if (isLoading || !stats) {
        return (
            <AppShell>
                <div className="p-10 text-center text-on-surface-muted">Loading ambassador data…</div>
            </AppShell>
        )
    }

    const totalEarned = parseFloat(stats.total_earned)
    const pending = parseFloat(stats.pending_payout)
    const paidOut = parseFloat(stats.paid_out)

    // 🎯 Progress towards GHS 10 minimum payout
    const minPayout = 10.00
    const progressToPayout = Math.min((totalEarned / minPayout) * 100, 100)
    const amountNeeded = Math.max(minPayout - totalEarned, 0)

    // 🏆 Milestone Badges
    let badge = { title: "Starter", color: "text-blue-700 bg-blue-50 border-blue-200" }
    if (stats.referral_count >= 3) badge = { title: "Rising Star", color: "text-purple-700 bg-purple-50 border-purple-200" }
    if (stats.referral_count >= 10) badge = { title: "Campus Legend", color: "text-orange-700 bg-orange-50 border-orange-200" }

    const shareMessage = `Hey! Are you writing NMC exams soon? 🩺\n\nUse my code *${stats.referral_code}* on NursifyGH to get 2,000+ NMC practice questions, 60-minute mock exams, and an AI clinical logbook.\n\nLet's pass together! 🚀\nhttps://nursifygh.com`

    return (
        <AppShell>
            <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4 pt-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Ambassador Program</p>
                        <h1 className="text-3xl font-bold text-on-surface mt-1">Your Dashboard</h1>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-bold text-sm ${badge.color}`}>
                        <span>🏆</span> {badge.title}
                    </div>
                </div>

                {/* Referral Code & Share Section */}
                <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="text-xs font-bold text-brand-200 uppercase tracking-widest">Your Referral Code</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <code className="text-3xl sm:text-5xl font-black tracking-tight text-white bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                                    {stats.referral_code}
                                </code>
                                <button
                                    onClick={copyCode}
                                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shrink-0 ${copied ? "bg-green-500 text-white" : "bg-white/15 hover:bg-white/25 text-white border border-white/20"}`}
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    {copied ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {/* 🚀 VIRAL WHATSAPP BUTTON */}
                        <div className="shrink-0">
                            <button
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')}
                                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] px-6 py-3 text-base font-bold text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                Invite via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Earned" value={`GHS ${totalEarned.toFixed(2)}`} accent="brand" />
                    <StatCard label="Paid Out" value={`GHS ${paidOut.toFixed(2)}`} accent="green" />
                    <StatCard label="Pending Payout" value={`GHS ${pending.toFixed(2)}`} accent="amber" />
                    <StatCard label="Referred Students" value={String(stats.referral_count)} accent="slate" />
                </div>

                {/* 🎯 Progress to Payout OR Success State */}
                <div className={`rounded-xl border p-5 shadow-sm ${stats.can_cash_out ? "border-green-300 bg-green-50" : "border-border bg-white"}`}>
                    {stats.can_cash_out ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-green-900 flex items-center gap-2">
                                    🎉 You're eligible for a payout!
                                </h3>
                                <p className="text-sm text-green-800 mt-1">
                                    GHS {parseFloat(stats.cleared_amount).toFixed(2)} has cleared the 3-day hold and is ready to be sent to your MoMo number.
                                </p>
                                {stats.next_payout_date && parseFloat(stats.pending_payout) > 0 && (
                                    <p className="text-xs text-green-700 mt-2 font-medium bg-green-200/50 inline-block px-2 py-1 rounded">
                                        ⏳ Your next pending funds unlock on {new Date(stats.next_payout_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </p>
                                )}
                            </div>
                            <button className="shrink-0 rounded-xl bg-green-600 hover:bg-green-700 px-6 py-3 text-sm font-bold text-white transition-colors shadow-sm">
                                Request Payout
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-bold text-on-surface">Next Payout</p>
                                <p className="text-xs font-medium text-on-surface-muted">Min. GHS {minPayout.toFixed(2)} required</p>
                            </div>
                            <div className="h-3 w-full bg-surface-subtle rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressToPayout}%` }} />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-brand-700 font-medium">
                                    Earn GHS {amountNeeded.toFixed(2)} more to unlock your first MoMo payout!
                                </p>
                                {stats.next_payout_date && parseFloat(stats.pending_payout) > 0 && (
                                    <p className="text-xs text-on-surface-muted">
                                        Est. unlock: <strong>{new Date(stats.next_payout_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</strong>
                                    </p>
                                )}
                            </div>
                        </>
                    )}
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
                                                {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <span className="text-sm font-bold text-brand-700">+ GHS {parseFloat(r.amount).toFixed(2)}</span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${r.is_paid_out ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                            {r.is_paid_out ? "Paid" : "Pending"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* How Payouts Work */}
                <div className="rounded-2xl border border-border bg-surface-subtle/40 p-6">
                    <h3 className="text-sm font-bold text-on-surface mb-3">How payouts work</h3>
                    <ul className="space-y-3 text-sm text-on-surface-muted">
                        <li className="flex gap-3"><span className="text-brand-600 font-bold shrink-0">1.</span><span>Each student who subscribes with your code earns you <strong className="text-on-surface">GHS 4.50</strong>.</span></li>
                        <li className="flex gap-3"><span className="text-brand-600 font-bold shrink-0">2.</span><span>Commissions remain "pending" for <strong className="text-on-surface">3 days</strong> to handle any refunds or payment disputes.</span></li>
                        <li className="flex gap-3"><span className="text-brand-600 font-bold shrink-0">3.</span><span>After 3 days, we send your pending balance directly to your registered <strong className="text-on-surface">MoMo number</strong>.</span></li>
                        <li className="flex gap-3"><span className="text-brand-600 font-bold shrink-0">4.</span><span>Minimum payout threshold: <strong className="text-on-surface">GHS 10.00</strong>.</span></li>
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