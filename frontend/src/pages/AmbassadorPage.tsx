import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"
import { useAuth } from "../contexts/AuthContext"
import type { AmbassadorStats } from "../types/api"

type ReferralFilter = "ALL" | "CONFIRMED" | "PENDING"

export default function AmbassadorPage() {
    const { user, refreshUser } = useAuth()
    const queryClient = useQueryClient()
    const [copiedCode, setCopiedCode] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)
    const [filter, setFilter] = useState<ReferralFilter>("ALL")
    const [searchQuery, setSearchQuery] = useState("")
    const [payoutRequested, setPayoutRequested] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    // Also save ?ref= if someone lands on /ambassador with a ref param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const refParam = (params.get("ref") || params.get("code") || "").trim().toUpperCase()
        if (refParam) {
            localStorage.setItem("nursify_ref", refParam)
        }
    }, [])

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

    const referralLink = useMemo(() => {
        if (!stats?.referral_code) return ""
        const origin = typeof window !== "undefined" ? window.location.origin : "https://nursifygh-frontend.vercel.app"
        return `${origin}/register?ref=${encodeURIComponent(stats.referral_code)}`
    }, [stats?.referral_code])

    async function copyCode() {
        if (!stats?.referral_code) return
        try {
            await navigator.clipboard.writeText(stats.referral_code)
            setCopiedCode(true)
            showToast("Referral code copied!")
            setTimeout(() => setCopiedCode(false), 2000)
        } catch {
            showToast("Couldn't copy — long-press the code instead.", "error")
        }
    }

    async function copyLink() {
        if (!referralLink) return
        try {
            await navigator.clipboard.writeText(referralLink)
            setCopiedLink(true)
            showToast("Unique referral link copied!")
            setTimeout(() => setCopiedLink(false), 2000)
        } catch {
            showToast("Couldn't copy link — copy it from the box instead.", "error")
        }
    }

    const filteredReferrals = useMemo(() => {
        if (!stats?.recent) return []
        return stats.recent.filter((r) => {
            const matchesFilter =
                filter === "ALL" ||
                (filter === "CONFIRMED" && r.status === "CONFIRMED") ||
                (filter === "PENDING" && r.status !== "CONFIRMED")
            const q = searchQuery.trim().toLowerCase()
            const matchesSearch =
                !q ||
                r.referred_email.toLowerCase().includes(q) ||
                (r.full_name || "").toLowerCase().includes(q)
            return matchesFilter && matchesSearch
        })
    }, [stats?.recent, filter, searchQuery])

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
                                Share your personal NursifyGH referral link or code with classmates. You earn GHS 4.50 for every student who subscribes.
                            </p>

                            <Button
                                size="lg"
                                onClick={() => becomeMutation.mutate()}
                                disabled={becomeMutation.isPending}
                                className="!bg-brand-500 hover:!bg-brand-400 !text-brand-950 font-bold px-10 h-14 text-base shadow-lg shadow-brand-500/30 w-full sm:w-auto"
                            >
                                {becomeMutation.isPending ? "Activating…" : "Activate my referral link & code →"}
                            </Button>

                            <p className="mt-3 text-xs text-brand-300">
                                Free to activate. Takes 1 second.
                            </p>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { label: "Unique link + code", value: "Instant" },
                                { label: "Per paid referral", value: "GHS 4.50" },
                                { label: "Payout window", value: "3 days" },
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
                <div className="p-10 text-center text-on-surface-muted">Loading ambassador dashboard…</div>
            </AppShell>
        )
    }

    const totalEarned = parseFloat(stats.total_earned || "0")
    const pending = parseFloat(stats.pending_payout || "0")
    const paidOut = parseFloat(stats.paid_out || "0")
    const clearedAmount = parseFloat(stats.cleared_amount || "0")

    const minPayout = 10.00
    const progressToPayout = Math.min((clearedAmount / minPayout) * 100, 100)
    const amountNeeded = Math.max(minPayout - clearedAmount, 0)

    let badge = { title: "Starter", color: "text-blue-700 bg-blue-50 border-blue-200" }
    if (stats.referral_count >= 3) badge = { title: "Rising Star", color: "text-purple-700 bg-purple-50 border-purple-200" }
    if (stats.referral_count >= 10) badge = { title: "Campus Legend", color: "text-orange-700 bg-orange-50 border-orange-200" }

    const shareMessage = `Hey! Are you preparing for NMC exams or nursing semesters? 🩺\n\nRegister with my personal NursifyGH link or code *${stats.referral_code}* to practice NMC questions, mock exams, care plans, and clinical logs:\n${referralLink}`

    return (
        <AppShell>
            <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4 pt-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Ambassador Commission Hub</p>
                        <h1 className="text-3xl font-bold text-on-surface mt-1">Referral & Payout Dashboard</h1>
                        <p className="text-xs text-on-surface-muted mt-1">
                            Total signups: <strong>{stats.total_referrals}</strong> · Confirmed paid: <strong>{stats.confirmed_referrals}</strong> · Pending trial/unpaid: <strong>{stats.pending_referrals}</strong>
                        </p>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-bold text-sm ${badge.color}`}>
                        <span>🏆</span> {badge.title}
                    </div>
                </div>

                {/* Unique Referral Link & Code Card */}
                <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />

                    <div className="relative z-10 space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold text-brand-200 uppercase tracking-widest">Your Referral Code</p>
                                <div className="mt-2 flex flex-wrap items-center gap-3">
                                    <code className="text-2xl sm:text-4xl font-black tracking-tight text-white bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                                        {stats.referral_code}
                                    </code>
                                    <button
                                        onClick={copyCode}
                                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shrink-0 ${copiedCode ? "bg-green-500 text-white" : "bg-white/15 hover:bg-white/25 text-white border border-white/20"}`}
                                    >
                                        {copiedCode ? "Code Copied!" : "Copy Code"}
                                    </button>
                                </div>
                            </div>

                            <div className="shrink-0">
                                <button
                                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank")}
                                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] px-6 py-3 text-base font-bold text-white transition-all shadow-lg"
                                >
                                    Share Link on WhatsApp
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/15">
                            <p className="text-xs font-bold text-brand-200 uppercase tracking-wider mb-2">
                                Unique Referral Link (Auto-applies on signup)
                            </p>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={referralLink}
                                    className="flex-1 rounded-xl bg-black/25 border border-white/20 px-4 py-2.5 text-xs sm:text-sm text-brand-100 font-mono focus:outline-none"
                                />
                                <button
                                    onClick={copyLink}
                                    className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all shrink-0 ${copiedLink ? "bg-green-500 text-white" : "bg-brand-500 hover:bg-brand-400 text-brand-950"}`}
                                >
                                    {copiedLink ? "Link Copied!" : "Copy Referral Link"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Earned" value={`GHS ${totalEarned.toFixed(2)}`} accent="brand" />
                    <StatCard label="Cleared (Ready)" value={`GHS ${clearedAmount.toFixed(2)}`} accent="green" />
                    <StatCard label="Unpaid Balance" value={`GHS ${pending.toFixed(2)}`} accent="amber" />
                    <StatCard label="Paid Out" value={`GHS ${paidOut.toFixed(2)}`} accent="slate" />
                </div>

                {/* Payout Eligibility & Progress */}
                <div className={`rounded-xl border p-5 shadow-sm ${stats.can_cash_out ? "border-green-300 bg-green-50" : "border-border bg-white"}`}>
                    {stats.can_cash_out ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-green-900">
                                    Cleared balance ready for payout
                                </h3>
                                <p className="text-sm text-green-800 mt-1">
                                    GHS {clearedAmount.toFixed(2)} has cleared the 3-day hold (minimum GHS {minPayout.toFixed(2)}).
                                </p>
                                {payoutRequested && (
                                    <p className="text-xs text-green-900 font-semibold mt-2 bg-green-200/70 inline-block px-3 py-1 rounded">
                                        Payout noted for MoMo ({user?.phone_number || "profile phone"}) — admin will process and mark paid out.
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setPayoutRequested(true)
                                    showToast(`Payout request noted for GHS ${clearedAmount.toFixed(2)}`)
                                }}
                                className="shrink-0 rounded-xl bg-green-600 hover:bg-green-700 px-6 py-3 text-sm font-bold text-white transition-colors shadow-sm"
                            >
                                {payoutRequested ? "Payout Noted" : "Request Payout"}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-bold text-on-surface">Cleared Payout Threshold</p>
                                <p className="text-xs font-medium text-on-surface-muted">Min. GHS {minPayout.toFixed(2)} cleared</p>
                            </div>
                            <div className="h-3 w-full bg-surface-subtle rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressToPayout}%` }} />
                            </div>
                            <div className="flex flex-wrap justify-between items-center gap-2 mt-2">
                                <p className="text-xs text-brand-700 font-medium">
                                    {amountNeeded > 0
                                        ? `GHS ${amountNeeded.toFixed(2)} more cleared commission needed to reach GHS ${minPayout.toFixed(2)}.`
                                        : "Commissions are currently within the 3-day hold window."}
                                </p>
                                {stats.next_payout_date && pending > 0 && (
                                    <p className="text-xs text-on-surface-muted">
                                        Next hold clears: <strong>{new Date(stats.next_payout_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</strong>
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Recent Referrals & Commissions Tracker */}
                <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-on-surface">Referred Students & Commissions</h2>
                            <p className="text-xs text-on-surface-muted mt-0.5">Track signups via your link/code, subscription status, and payouts</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search student email..."
                                className="rounded-lg border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                            />
                            {(["ALL", "CONFIRMED", "PENDING"] as ReferralFilter[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${filter === tab ? "bg-brand-700 text-white" : "bg-surface-subtle text-on-surface-muted hover:text-on-surface"}`}
                                >
                                    {tab === "ALL" ? "All" : tab === "CONFIRMED" ? "Paid" : "Pending"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredReferrals.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-sm font-semibold text-on-surface">No matching referrals yet</p>
                            <p className="text-xs text-on-surface-muted mt-1">Share your unique link or referral code to track signups here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredReferrals.map((r, i) => (
                                <div key={`${r.referred_email}-${i}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface-subtle/40 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                                            {r.referred_email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-on-surface truncate">
                                                {r.full_name ? `${r.full_name} (${r.referred_email})` : r.referred_email}
                                            </p>
                                            <p className="text-xs text-on-surface-muted">
                                                {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                {" · "}
                                                <span className="font-semibold">{r.status === "CONFIRMED" ? "Subscribed" : "Trial / Unpaid"}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-sm font-bold text-brand-700">+ GHS {parseFloat(r.amount || "0").toFixed(2)}</span>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${r.is_paid_out ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                            {r.is_paid_out ? "Paid Out" : "Unpaid"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* How Payouts Work */}
                <div className="rounded-2xl border border-border bg-surface-subtle/40 p-6">
                    <h3 className="text-sm font-bold text-on-surface mb-3">How referrals & payouts work</h3>
                    <ul className="space-y-2.5 text-sm text-on-surface-muted">
                        <li className="flex gap-3"><span className="text-brand-600 font-bold shrink-0">1.</span><span>Students who sign up via your unique link or code are linked to you automatically.</span></li>
                        <li className="flex gap-3"><span className="text-brand-600 font-bold shrink-0">2.</span><span>When a referred student's subscription is activated as paid, you earn <strong className="text-on-surface">GHS 4.50</strong>.</span></li>
                        <li className="flex gap-3"><span className="text-brand-600 font-bold shrink-0">3.</span><span>Commissions clear after a <strong className="text-on-surface">3-day</strong> window and can be paid out once cleared balance reaches <strong className="text-on-surface">GHS 10.00</strong>.</span></li>
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
