import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import { useAuth } from "../contexts/AuthContext"

interface AdminOverviewResponse {
    generated_at: string
    summary: {
        total_users: number
        paid_users: number
        total_referrals: number
        ambassador_count: number
        total_earned: string
        unpaid_ghs: string
        paid_out_ghs: string
    }
    ambassadors: {
        id: number
        full_name: string
        email: string
        phone_number: string
        referral_code: string
        total_referrals: number
        paid_referrals: number
        total_earned: string
        unpaid_ghs: string
        paid_out_ghs: string
    }[]
    referrals: {
        student_id: number
        student_name: string
        student_email: string
        student_phone: string
        student_has_paid: boolean
        joined_at: string
        referral_code: string
        ambassador_name: string
        ambassador_email: string
        ambassador_phone: string
        commission_amount: string
        is_paid_out: boolean
    }[]
    payments: {
        id: number
        reference: string
        manual_reference: string
        student_name: string
        student_email: string
        student_phone: string
        referred_by: string
        amount_ghs: string
        provider: string
        status: string
        initiated_at: string | null
    }[]
}

export default function AdminCommissionsPage() {
    const { user } = useAuth()
    const [tab, setTab] = useState<"ambassadors" | "referrals" | "payments">("ambassadors")

    const isStaff = Boolean(user?.is_staff || user?.is_superuser)

    const { data, isLoading, isError, refetch } = useQuery<AdminOverviewResponse>({
        queryKey: ["admin-commissions-overview"],
        queryFn: async () => {
            const res = await api.get("/accounts/admin/commissions-overview/")
            return res.data
        },
        enabled: isStaff,
    })

    if (!isStaff) {
        return (
            <AppShell>
                <div className="max-w-2xl mx-auto py-12 px-4 text-center">
                    <h1 className="text-xl font-bold text-on-surface">Admin Access Only</h1>
                    <p className="text-sm text-on-surface-muted mt-2">
                        This commission, referral, and payment tracking board is restricted to staff/admin accounts.
                    </p>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Admin Control Board</p>
                        <h1 className="text-3xl font-bold text-on-surface mt-1">Commissions, Referrals & Payments</h1>
                        <p className="text-xs text-on-surface-muted mt-1">
                            Track every ambassador, who referred whom, referral counts, commissions, and payments
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-subtle"
                        >
                            Refresh Data
                        </button>
                        <a
                            href="/admin/"
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-brand-700 px-4 py-2 text-xs font-bold text-white hover:bg-brand-800"
                        >
                            Django Admin
                        </a>
                    </div>
                </div>

                {isLoading && <div className="p-10 text-center text-on-surface-muted">Loading admin overview…</div>}
                {isError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Could not load admin overview. Make sure your account has staff/admin permissions.
                    </div>
                )}

                {data && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard label="Total Earned" value={`GHS ${parseFloat(data.summary.total_earned).toFixed(2)}`} />
                            <KpiCard label="Unpaid Commissions" value={`GHS ${parseFloat(data.summary.unpaid_ghs).toFixed(2)}`} />
                            <KpiCard label="Paid Out" value={`GHS ${parseFloat(data.summary.paid_out_ghs).toFixed(2)}`} />
                            <KpiCard
                                label="Referrals / Paid Users"
                                value={`${data.summary.total_referrals} / ${data.summary.paid_users}`}
                            />
                        </div>

                        <div className="flex gap-2 border-b border-border pb-3">
                            {(
                                [
                                    ["ambassadors", `Ambassadors (${data.ambassadors.length})`],
                                    ["referrals", `Referral Ledger (${data.referrals.length})`],
                                    ["payments", `Payments (${data.payments.length})`],
                                ] as const
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setTab(key)}
                                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                                        tab === key ? "bg-brand-700 text-white" : "bg-surface-subtle text-on-surface-muted hover:text-on-surface"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {tab === "ambassadors" && (
                            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-surface-subtle text-on-surface-muted uppercase text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3">Ambassador</th>
                                            <th className="px-4 py-3">MoMo / Phone</th>
                                            <th className="px-4 py-3">Code</th>
                                            <th className="px-4 py-3">Referrals (Paid)</th>
                                            <th className="px-4 py-3">Unpaid GHS</th>
                                            <th className="px-4 py-3">Paid Out GHS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {data.ambassadors.map((a) => (
                                            <tr key={a.id} className="hover:bg-surface-subtle/40">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-on-surface">{a.full_name || "—"}</div>
                                                    <div className="text-xs text-on-surface-muted">{a.email}</div>
                                                </td>
                                                <td className="px-4 py-3 font-mono">{a.phone_number || "—"}</td>
                                                <td className="px-4 py-3">
                                                    <code className="rounded bg-brand-50 px-2 py-0.5 font-bold text-brand-800">{a.referral_code}</code>
                                                </td>
                                                <td className="px-4 py-3 font-semibold">
                                                    {a.total_referrals} ({a.paid_referrals} paid)
                                                </td>
                                                <td className="px-4 py-3 font-bold text-amber-700">
                                                    GHS {parseFloat(a.unpaid_ghs).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-green-700">
                                                    GHS {parseFloat(a.paid_out_ghs).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {tab === "referrals" && (
                            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-surface-subtle text-on-surface-muted uppercase text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3">Referred Student</th>
                                            <th className="px-4 py-3">Ambassador Who Referred</th>
                                            <th className="px-4 py-3">Code</th>
                                            <th className="px-4 py-3">Subscription</th>
                                            <th className="px-4 py-3">Commission</th>
                                            <th className="px-4 py-3">Payout</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {data.referrals.map((r) => (
                                            <tr key={r.student_id} className="hover:bg-surface-subtle/40">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-on-surface">{r.student_name || "—"}</div>
                                                    <div className="text-xs text-on-surface-muted">
                                                        {r.student_email} {r.student_phone ? `· ${r.student_phone}` : ""}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-on-surface">{r.ambassador_name}</div>
                                                    <div className="text-xs text-on-surface-muted">{r.ambassador_email}</div>
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold">{r.referral_code}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.student_has_paid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                                        {r.student_has_paid ? "PAID" : "UNPAID"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-brand-700">
                                                    GHS {parseFloat(r.commission_amount).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.is_paid_out ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                                        {r.is_paid_out ? "PAID OUT" : "UNPAID"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {tab === "payments" && (
                            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-surface-subtle text-on-surface-muted uppercase text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3">Student</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Provider / Ref</th>
                                            <th className="px-4 py-3">Referred By</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {data.payments.map((p) => (
                                            <tr key={p.id} className="hover:bg-surface-subtle/40">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-on-surface">{p.student_name || "—"}</div>
                                                    <div className="text-xs text-on-surface-muted">
                                                        {p.student_email} {p.student_phone ? `· ${p.student_phone}` : ""}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-bold">GHS {parseFloat(p.amount_ghs).toFixed(2)}</td>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    <div>{p.provider}</div>
                                                    <div className="text-on-surface-muted">{p.manual_reference || p.reference}</div>
                                                </td>
                                                <td className="px-4 py-3 font-mono">{p.referred_by || "—"}</td>
                                                <td className="px-4 py-3">
                                                    <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[10px] font-bold">
                                                        {p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppShell>
    )
}

function KpiCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider">{label}</p>
            <p className="mt-2 text-2xl font-black text-on-surface">{value}</p>
        </div>
    )
}
