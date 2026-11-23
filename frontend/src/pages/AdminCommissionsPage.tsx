import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import { useAuth } from "../contexts/AuthContext"

interface AdminUserRow {
    id: number
    full_name: string
    email: string
    phone_number: string
    program: string
    level: number | null
    has_paid: boolean
    is_subscribed: boolean
    subscription_expires_at: string | null
    is_ambassador: boolean
    referral_code: string
    referred_by: string
    is_staff: boolean
    date_joined?: string | null
}

interface AdminReferralRow {
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
    created_at?: string | null
    paid_out_at?: string | null
    payout_due_date?: string | null
}

interface AdminPaymentRow {
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
    completed_at?: string | null
}

interface AdminOverviewResponse {
    generated_at: string
    users: AdminUserRow[]
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
    referrals: AdminReferralRow[]
    payments: AdminPaymentRow[]
}

function formatDateTime(iso?: string | null): string {
    if (!iso) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    })
}

function formatDateOnly(iso?: string | null): string {
    if (!iso) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
}

function matchesDateFilter(
    iso: string | null | undefined,
    quickPreset: "all" | "today" | "month" | "year",
    selectedYear: string,
    selectedMonth: string,
    exactDate: string,
): boolean {
    const hasCustom = Boolean(selectedYear || selectedMonth || exactDate)
    if (quickPreset === "all" && !hasCustom) return true
    if (!iso) return false
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return false

    const now = new Date()
    if (exactDate) {
        const localYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        if (localYmd !== exactDate) return false
    }
    if (selectedYear && String(d.getFullYear()) !== selectedYear) return false
    if (selectedMonth && String(d.getMonth() + 1).padStart(2, "0") !== selectedMonth) return false

    if (quickPreset === "today") {
        return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
        )
    }
    if (quickPreset === "month") {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }
    if (quickPreset === "year") {
        return d.getFullYear() === now.getFullYear()
    }
    return true
}

export default function AdminCommissionsPage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [tab, setTab] = useState<"users" | "ambassadors" | "referrals" | "payments">("users")
    const [search, setSearch] = useState("")
    const [quickDate, setQuickDate] = useState<"all" | "today" | "month" | "year">("all")
    const [filterYear, setFilterYear] = useState("")
    const [filterMonth, setFilterMonth] = useState("")
    const [exactDate, setExactDate] = useState("")
    const [unpaidOnly, setUnpaidOnly] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)
    const [promoteEmail, setPromoteEmail] = useState("")
    const [promoteCode, setPromoteCode] = useState("")

    const authUser = user as (typeof user & { id?: number; is_staff?: boolean; is_superuser?: boolean }) | null
    const isStaff = Boolean(authUser?.is_staff || authUser?.is_superuser)

    const { data, isLoading, isError, refetch } = useQuery<AdminOverviewResponse>({
        queryKey: ["admin-commissions-overview"],
        queryFn: async () => {
            const res = await api.get("/accounts/admin/commissions-overview/")
            return res.data
        },
        enabled: isStaff,
    })

    const actionMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const res = await api.post("/accounts/admin/commissions-action/", payload)
            return res.data
        },
        onSuccess: (res, vars) => {
            const act = String(vars.action || "")
            const messages: Record<string, string> = {
                mark_commission_paid: `Marked ${res.updated ?? 1} commission(s) as PAID OUT.`,
                revert_commission_paid: `Reverted ${res.updated ?? 1} commission(s) back to UNPAID.`,
                approve_payment: "Payment approved and student 120-day pass + commission activated.",
                reject_payment: "Payment marked as FAILED.",
                delete_payment: "Payment record deleted.",
                promote_ambassador: `Ambassador active with referral code ${res.referral_code}.`,
                toggle_ambassador: res.is_ambassador
                    ? `Enabled ambassador (${res.referral_code}).`
                    : "Disabled ambassador status.",
                grant_pass: "Granted 120-day subscription pass to user.",
                revoke_pass: "Revoked active subscription pass from user.",
                delete_user: "User account deleted.",
                delete_commission: "Commission record deleted.",
                clear_referral: "Cleared referral code from student.",
            }
            setFeedback(messages[act] || "Action completed.")
            if (act === "promote_ambassador") {
                setPromoteEmail("")
                setPromoteCode("")
            }
            queryClient.invalidateQueries({ queryKey: ["admin-commissions-overview"] })
        },
        onError: (err: unknown) => {
            const maybeResp = err as { response?: { data?: { error?: string } } }
            setFeedback(maybeResp?.response?.data?.error || "Could not complete that action. Try again.")
        },
    })

    function handlePromoteSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!promoteEmail.trim() || actionMutation.isPending) return
        actionMutation.mutate({
            action: "promote_ambassador",
            email: promoteEmail.trim(),
            referral_code: promoteCode.trim().toUpperCase(),
        })
    }

    function resetDateFilters() {
        setQuickDate("all")
        setFilterYear("")
        setFilterMonth("")
        setExactDate("")
        setUnpaidOnly(false)
    }

    if (!isStaff) {
        return (
            <AppShell>
                <div className="max-w-2xl mx-auto py-12 px-4 text-center">
                    <h1 className="text-xl font-bold text-on-surface">Admin Access Only</h1>
                    <p className="text-sm text-on-surface-muted mt-2">
                        This control center is restricted to staff/admin accounts.
                    </p>
                </div>
            </AppShell>
        )
    }

    const q = search.trim().toLowerCase()
    const filteredUsers = (data?.users || []).filter((u) => {
        if (!matchesDateFilter(u.date_joined, quickDate, filterYear, filterMonth, exactDate)) return false
        if (!q) return true
        return (
            u.full_name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.phone_number.toLowerCase().includes(q) ||
            u.referral_code.toLowerCase().includes(q) ||
            u.referred_by.toLowerCase().includes(q)
        )
    })

    const filteredAmbassadors = (data?.ambassadors || []).filter((a) => {
        if (unpaidOnly && parseFloat(a.unpaid_ghs) <= 0) return false
        if (!q) return true
        return (
            a.full_name.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            a.phone_number.toLowerCase().includes(q) ||
            a.referral_code.toLowerCase().includes(q)
        )
    })

    const filteredReferrals = (data?.referrals || []).filter((r) => {
        const refStamp = r.created_at || r.joined_at
        if (!matchesDateFilter(refStamp, quickDate, filterYear, filterMonth, exactDate)) return false
        if (unpaidOnly && (r.is_paid_out || parseFloat(r.commission_amount) <= 0)) return false
        if (!q) return true
        return (
            r.student_name.toLowerCase().includes(q) ||
            r.student_email.toLowerCase().includes(q) ||
            r.ambassador_name.toLowerCase().includes(q) ||
            r.referral_code.toLowerCase().includes(q)
        )
    })

    const filteredPayments = (data?.payments || []).filter((p) => {
        if (!matchesDateFilter(p.initiated_at, quickDate, filterYear, filterMonth, exactDate)) return false
        if (unpaidOnly && p.status === "SUCCESS") return false
        if (!q) return true
        return (
            p.student_name.toLowerCase().includes(q) ||
            p.student_email.toLowerCase().includes(q) ||
            p.reference.toLowerCase().includes(q) ||
            p.manual_reference.toLowerCase().includes(q) ||
            p.referred_by.toLowerCase().includes(q)
        )
    })

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Admin Control Board</p>
                        <h1 className="text-3xl font-bold text-on-surface mt-1">Users, Commissions &amp; Payments</h1>
                        <p className="text-xs text-on-surface-muted mt-1">
                            Filter by date, month, year, or today · View exact date &amp; time · Control payouts, approvals, and users
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setFeedback(null)
                            refetch()
                        }}
                        className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-subtle self-start sm:self-auto"
                    >
                        Refresh Data
                    </button>
                </div>

                {feedback && (
                    <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs sm:text-sm font-medium text-brand-900 flex items-center justify-between gap-3">
                        <span>{feedback}</span>
                        <button onClick={() => setFeedback(null)} className="text-xs font-bold text-brand-700 hover:underline">
                            Dismiss
                        </button>
                    </div>
                )}

                {isLoading && <div className="p-10 text-center text-on-surface-muted">Loading admin data…</div>}
                {isError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Could not load admin overview. Make sure your account has staff/admin permissions.
                    </div>
                )}

                {data && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard label="Total Users" value={String(data.summary.total_users)} />
                            <KpiCard label="Unpaid Commissions" value={`GHS ${parseFloat(data.summary.unpaid_ghs).toFixed(2)}`} />
                            <KpiCard label="Paid Out" value={`GHS ${parseFloat(data.summary.paid_out_ghs).toFixed(2)}`} />
                            <KpiCard
                                label="Referrals / Paid Users"
                                value={`${data.summary.total_referrals} / ${data.summary.paid_users}`}
                            />
                        </div>

                        {/* Django-style Date, Month, Year & Today Filter Bar */}
                        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {(
                                        [
                                            ["all", "All Dates"],
                                            ["today", "Today"],
                                            ["month", "This Month"],
                                            ["year", "This Year"],
                                        ] as const
                                    ).map(([k, lbl]) => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => {
                                                setQuickDate(k)
                                                setExactDate("")
                                            }}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                                quickDate === k && !exactDate
                                                    ? "bg-brand-700 text-white"
                                                    : "bg-surface-subtle text-on-surface-muted hover:text-on-surface"
                                            }`}
                                        >
                                            {lbl}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setUnpaidOnly((v) => !v)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                            unpaidOnly
                                                ? "bg-amber-600 text-white"
                                                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                        }`}
                                    >
                                        {unpaidOnly ? "Showing Unpaid / Pending Only" : "Unpaid / Pending Only"}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetDateFilters}
                                    className="text-xs font-semibold text-on-surface-muted hover:text-on-surface underline"
                                >
                                    Reset Filters
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name, email, phone, code…"
                                    className="h-9 rounded-lg border border-border px-3 text-xs"
                                />
                                <select
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    className="h-9 rounded-lg border border-border bg-white px-2.5 text-xs"
                                >
                                    <option value="">All Years</option>
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                </select>
                                <select
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="h-9 rounded-lg border border-border bg-white px-2.5 text-xs"
                                >
                                    <option value="">All Months</option>
                                    <option value="01">January</option>
                                    <option value="02">February</option>
                                    <option value="03">March</option>
                                    <option value="04">April</option>
                                    <option value="05">May</option>
                                    <option value="06">June</option>
                                    <option value="07">July</option>
                                    <option value="08">August</option>
                                    <option value="09">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                                <input
                                    type="date"
                                    value={exactDate}
                                    onChange={(e) => setExactDate(e.target.value)}
                                    className="h-9 rounded-lg border border-border bg-white px-2.5 text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                            {(
                                [
                                    ["users", `All Users (${filteredUsers.length})`],
                                    ["ambassadors", `Ambassadors & Payouts (${filteredAmbassadors.length})`],
                                    ["referrals", `Referral Ledger (${filteredReferrals.length})`],
                                    ["payments", `Payments (${filteredPayments.length})`],
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

                        {tab === "users" && (
                            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-surface-subtle text-on-surface-muted uppercase text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3">User</th>
                                            <th className="px-4 py-3">Joined (Date &amp; Time)</th>
                                            <th className="px-4 py-3">Program / Ref</th>
                                            <th className="px-4 py-3">Pass Status</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">Controls</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredUsers.map((u) => {
                                            const isSelf = authUser?.id === u.id
                                            return (
                                                <tr key={u.id} className="hover:bg-surface-subtle/40">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-on-surface">{u.full_name || "—"}</div>
                                                        <div className="text-xs text-on-surface-muted">
                                                            {u.email} {u.phone_number ? `· ${u.phone_number}` : ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDateTime(u.date_joined)}</td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <div>{u.program || "—"} {u.level ? `· L${u.level}` : ""}</div>
                                                        <div className="font-mono text-on-surface-muted">
                                                            {u.referral_code ? `Code: ${u.referral_code}` : ""}{" "}
                                                            {u.referred_by ? `· Ref by: ${u.referred_by}` : ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.has_paid || u.is_subscribed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                                            {u.has_paid ? "PAID PASS" : u.is_subscribed ? "TRIAL/ACTIVE" : "FREE"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-semibold">
                                                        {u.is_staff ? "ADMIN" : u.is_ambassador ? "AMBASSADOR" : "STUDENT"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <button
                                                                disabled={actionMutation.isPending}
                                                                onClick={() => actionMutation.mutate({ action: "grant_pass", user_id: u.id })}
                                                                className="rounded-lg bg-brand-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-800 disabled:opacity-50"
                                                            >
                                                                +120d Pass
                                                            </button>
                                                            {(u.has_paid || u.is_subscribed) && (
                                                                <button
                                                                    disabled={actionMutation.isPending}
                                                                    onClick={() => actionMutation.mutate({ action: "revoke_pass", user_id: u.id })}
                                                                    className="rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-on-surface-muted hover:text-on-surface disabled:opacity-50"
                                                                >
                                                                    Revoke
                                                                </button>
                                                            )}
                                                            <button
                                                                disabled={actionMutation.isPending}
                                                                onClick={() => actionMutation.mutate({ action: "toggle_ambassador", user_id: u.id })}
                                                                className="rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-subtle disabled:opacity-50"
                                                            >
                                                                {u.is_ambassador ? "Unset Amb" : "Make Amb"}
                                                            </button>
                                                            {!isSelf && (
                                                                <button
                                                                    disabled={actionMutation.isPending}
                                                                    onClick={() => {
                                                                        if (window.confirm(`Delete user ${u.email}? This cannot be undone.`)) {
                                                                            actionMutation.mutate({ action: "delete_user", user_id: u.id })
                                                                        }
                                                                    }}
                                                                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {tab === "ambassadors" && (
                            <div className="space-y-4">
                                <form
                                    onSubmit={handlePromoteSubmit}
                                    className="rounded-2xl border border-border bg-white p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                                >
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-bold uppercase text-on-surface-muted mb-1">
                                            Add / Activate Ambassador by Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={promoteEmail}
                                            onChange={(e) => setPromoteEmail(e.target.value)}
                                            placeholder="student@example.com"
                                            className="w-full h-10 rounded-lg border border-border px-3 text-xs sm:text-sm"
                                        />
                                    </div>
                                    <div className="sm:w-44">
                                        <label className="block text-[11px] font-bold uppercase text-on-surface-muted mb-1">
                                            Custom Code (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={promoteCode}
                                            onChange={(e) => setPromoteCode(e.target.value.toUpperCase())}
                                            placeholder="e.g. AMA-10"
                                            className="w-full h-10 rounded-lg border border-border px-3 text-xs sm:text-sm uppercase font-mono"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={actionMutation.isPending}
                                        className="h-10 rounded-lg bg-brand-700 px-4 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-50 shrink-0"
                                    >
                                        Activate Ambassador
                                    </button>
                                </form>

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
                                                <th className="px-4 py-3">Payout Controls</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredAmbassadors.map((a) => {
                                                const unpaidVal = parseFloat(a.unpaid_ghs)
                                                const paidOutVal = parseFloat(a.paid_out_ghs)
                                                return (
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
                                                            GHS {unpaidVal.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-green-700">
                                                            GHS {paidOutVal.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {unpaidVal > 0 && (
                                                                    <button
                                                                        disabled={actionMutation.isPending}
                                                                        onClick={() =>
                                                                            actionMutation.mutate({
                                                                                action: "mark_commission_paid",
                                                                                ambassador_id: a.id,
                                                                            })
                                                                        }
                                                                        className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-50"
                                                                    >
                                                                        Mark Paid
                                                                    </button>
                                                                )}
                                                                {paidOutVal > 0 && (
                                                                    <button
                                                                        disabled={actionMutation.isPending}
                                                                        onClick={() =>
                                                                            actionMutation.mutate({
                                                                                action: "revert_commission_paid",
                                                                                ambassador_id: a.id,
                                                                            })
                                                                        }
                                                                        className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-on-surface-muted hover:text-on-surface disabled:opacity-50"
                                                                    >
                                                                        Mark Unpaid
                                                                    </button>
                                                                )}
                                                                <button
                                                                    disabled={actionMutation.isPending}
                                                                    onClick={() =>
                                                                        actionMutation.mutate({
                                                                            action: "toggle_ambassador",
                                                                            user_id: a.id,
                                                                        })
                                                                    }
                                                                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                                >
                                                                    Remove Amb
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {tab === "referrals" && (
                            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-surface-subtle text-on-surface-muted uppercase text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3">Referred Student</th>
                                            <th className="px-4 py-3">Ambassador</th>
                                            <th className="px-4 py-3">Date &amp; Time</th>
                                            <th className="px-4 py-3">Commission / Due</th>
                                            <th className="px-4 py-3">Payout</th>
                                            <th className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredReferrals.map((r) => (
                                            <tr key={r.student_id} className="hover:bg-surface-subtle/40">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-on-surface">{r.student_name || "—"}</div>
                                                    <div className="text-xs text-on-surface-muted">
                                                        {r.student_email} {r.student_phone ? `· ${r.student_phone}` : ""}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-on-surface">{r.ambassador_name}</div>
                                                    <div className="text-xs font-mono text-on-surface-muted">{r.referral_code}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                    <div>{formatDateTime(r.created_at || r.joined_at)}</div>
                                                    {r.paid_out_at && (
                                                        <div className="text-green-700">Paid: {formatDateTime(r.paid_out_at)}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <div className="font-bold text-brand-700">
                                                        GHS {parseFloat(r.commission_amount).toFixed(2)}
                                                    </div>
                                                    {r.payout_due_date && !r.is_paid_out && (
                                                        <div className="text-on-surface-muted">Due: {formatDateOnly(r.payout_due_date)}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.is_paid_out ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                                        {r.is_paid_out ? "PAID OUT" : "UNPAID"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <button
                                                            disabled={actionMutation.isPending}
                                                            onClick={() => actionMutation.mutate({ action: "clear_referral", student_id: r.student_id })}
                                                            className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-on-surface-muted hover:text-on-surface disabled:opacity-50"
                                                        >
                                                            Clear Ref
                                                        </button>
                                                        {parseFloat(r.commission_amount) > 0 && (
                                                            <button
                                                                disabled={actionMutation.isPending}
                                                                onClick={() => {
                                                                    if (window.confirm("Delete this commission record?")) {
                                                                        actionMutation.mutate({ action: "delete_commission", student_id: r.student_id })
                                                                    }
                                                                }}
                                                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                            >
                                                                Delete Comm
                                                            </button>
                                                        )}
                                                    </div>
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
                                            <th className="px-4 py-3">Date &amp; Time</th>
                                            <th className="px-4 py-3">Amount / Ref</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredPayments.map((p) => (
                                            <tr key={p.id} className="hover:bg-surface-subtle/40">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-on-surface">{p.student_name || "—"}</div>
                                                    <div className="text-xs text-on-surface-muted">
                                                        {p.student_email} {p.student_phone ? `· ${p.student_phone}` : ""}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDateTime(p.initiated_at)}</td>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    <div className="font-sans font-bold text-on-surface">
                                                        GHS {parseFloat(p.amount_ghs).toFixed(2)} · {p.provider}
                                                    </div>
                                                    <div className="text-on-surface-muted">{p.manual_reference || p.reference}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[10px] font-bold">
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {p.status !== "SUCCESS" && (
                                                            <button
                                                                disabled={actionMutation.isPending}
                                                                onClick={() =>
                                                                    actionMutation.mutate({
                                                                        action: "approve_payment",
                                                                        payment_id: p.id,
                                                                    })
                                                                }
                                                                className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-50"
                                                            >
                                                                Approve
                                                            </button>
                                                        )}
                                                        {p.status !== "SUCCESS" && p.status !== "FAILED" && (
                                                            <button
                                                                disabled={actionMutation.isPending}
                                                                onClick={() =>
                                                                    actionMutation.mutate({
                                                                        action: "reject_payment",
                                                                        payment_id: p.id,
                                                                    })
                                                                }
                                                                className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-on-surface-muted hover:text-on-surface disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        )}
                                                        <button
                                                            disabled={actionMutation.isPending}
                                                            onClick={() => {
                                                                if (window.confirm("Delete this payment record?")) {
                                                                    actionMutation.mutate({ action: "delete_payment", payment_id: p.id })
                                                                }
                                                            }}
                                                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
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
