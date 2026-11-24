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
    institution?: string
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
    trashed_users?: AdminUserRow[]
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
    if (!iso) return quickPreset === "today" && !hasCustom
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
    const [tab, setTab] = useState<"users" | "ambassadors" | "referrals" | "payments" | "trash">("users")
    const [search, setSearch] = useState("")
    const [quickDate, setQuickDate] = useState<"all" | "today" | "month" | "year">("all")
    const [filterYear, setFilterYear] = useState("")
    const [filterMonth, setFilterMonth] = useState("")
    const [exactDate, setExactDate] = useState("")
    const [unpaidOnly, setUnpaidOnly] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)
    const [promoteEmail, setPromoteEmail] = useState("")
    const [promoteCode, setPromoteCode] = useState("")
    const [aiPrompt, setAiPrompt] = useState("")
    const [aiReply, setAiReply] = useState<string | null>(null)

    const [manualGroupFilter, setManualGroupFilter] = useState<"all" | "paid" | "trial">("all")
    const [manualSelectedUserId, setManualSelectedUserId] = useState<string>("")
    const [manualSubject, setManualSubject] = useState("Payment Confirmed — Account Activated")
    const [manualMessage, setManualMessage] = useState(
        "Hello! Your payment on NursifyGH has been confirmed and your study account is now active. You can log in and start studying right away."
    )
    const [manualCopiedNote, setManualCopiedNote] = useState<string | null>(null)

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
                delete_user: "Moved user to Trash. You can restore or permanently delete them in the Trash tab.",
                restore_user: "Restored user account from Trash.",
                permanent_delete_user: "Permanently deleted user account.",
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


    function handleAdminAiCommand(rawQuery?: string) {
        const qText = String(rawQuery ?? aiPrompt ?? "").trim()
        if (!data) {
            setAiReply("Dashboard data is still loading. Click Refresh Data if needed.")
            return
        }
        const lower = qText.toLowerCase()
        const isSameLocalDay = (iso?: string | null) => {
            if (!iso) return false
            const d = new Date(iso)
            if (Number.isNaN(d.getTime())) return false
            const now = new Date()
            return (
                d.getFullYear() === now.getFullYear() &&
                d.getMonth() === now.getMonth() &&
                d.getDate() === now.getDate()
            )
        }

        const totalUsers = data.users.length
        const paidUsersList = data.users.filter((u) => u.has_paid || u.is_subscribed)
        const trialUsersList = data.users.filter((u) => !(u.has_paid || u.is_subscribed))
        const conversionRate = totalUsers > 0 ? ((paidUsersList.length / totalUsers) * 100).toFixed(1) : "0.0"
        const referralRate = totalUsers > 0 ? ((data.referrals.length / totalUsers) * 100).toFixed(1) : "0.0"
        const unpaidTotal = parseFloat(data.summary.unpaid_ghs || "0") || 0
        const paidOutTotal = parseFloat(data.summary.paid_out_ghs || "0") || 0
        const pendingPaymentsList = data.payments.filter((p) => p.status !== "SUCCESS" && p.status !== "FAILED")
        const unpaidAmbs = data.ambassadors.filter((a) => parseFloat(a.unpaid_ghs || "0") > 0)

        const schoolCounts: Record<string, number> = {}
        data.users.forEach((u) => {
            const sc = (u.institution || "Unspecified School").trim()
            schoolCounts[sc] = (schoolCounts[sc] || 0) + 1
        })
        const topSchools = Object.entries(schoolCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([sc, cnt]) => `${sc} (${cnt})`)

        const topAmbs = [...data.ambassadors]
            .sort((a, b) => (b.total_referrals || 0) - (a.total_referrals || 0))
            .slice(0, 4)
            .map((a) => `${a.full_name || a.email} [${a.referral_code || "no code"}: ${a.total_referrals || 0} refs, GHS ${parseFloat(a.unpaid_ghs || "0").toFixed(2)} unpaid]`)

        if (lower === "help" || lower.includes("what can you do") || lower.includes("commands")) {
            setAiReply(
                `🤖 Admin AI Capabilities: I can inspect live platform metrics (${totalUsers} users, ${paidUsersList.length} paid, ${trialUsersList.length} trial, ${pendingPaymentsList.length} pending payments, GHS ${unpaidTotal.toFixed(2)} unpaid commissions), locate specific students/schools/codes, and give business management feedback, growth ideas, ambassador strategy, and operational recommendations. Ask me anything in plain English!`
            )
            return
        }

        if (lower.includes("subscrib") || lower.includes("paid user") || lower.includes("who paid") || lower.includes("active pass")) {
            setTab("users")
            setAiReply(
                paidUsersList.length > 0
                    ? `Paid / Subscribed Users (${paidUsersList.length} of ${totalUsers}, ${conversionRate}% conversion): ` +
                      paidUsersList
                          .map((u) => `${u.full_name || u.email} (${u.institution || "School not set"}${u.referral_code ? `, code ${u.referral_code}` : ""})`)
                          .join(" · ")
                    : "No paid/subscribed users found yet."
            )
            return
        }

        if (lower.includes("trial") || lower.includes("unpaid user") || lower.includes("free user") || lower.includes("not paid")) {
            setTab("users")
            setAiReply(
                trialUsersList.length > 0
                    ? `Trial / Unpaid Users (${trialUsersList.length} of ${totalUsers}): ` +
                      trialUsersList
                          .map((u) => `${u.full_name || u.email} (${u.institution || "School not set"}, joined ${formatDateTime(u.date_joined)})`)
                          .join(" · ")
                    : "All current users have paid/active access."
            )
            return
        }

        if (
            lower.includes("advis") || lower.includes("idea") || lower.includes("improv") ||
            lower.includes("analy") || lower.includes("evaluat") || lower.includes("grow") ||
            lower.includes("manage") || lower.includes("strateg") || lower.includes("insight") ||
            lower.includes("feedback") || lower.includes("how are we") || lower.includes("fix") ||
            lower.includes("market") || lower.includes("revenue") || lower.includes("business") ||
            lower.includes("ambassador")
        ) {
            setAiReply(
                `📌 Business Evaluation & Management Feedback:
` +
                `• Snapshot: ${totalUsers} total users | ${paidUsersList.length} paid (${conversionRate}% conversion) | ${trialUsersList.length} trial/unpaid | ${data.referrals.length} referrals (${referralRate}%).
` +
                `• Money & Approvals: GHS ${unpaidTotal.toFixed(2)} unpaid across ${unpaidAmbs.length} ambassador(s) | GHS ${paidOutTotal.toFixed(2)} paid out | ${pendingPaymentsList.length} pending payment(s).
` +
                `• Top Schools: ${topSchools.join(", ") || "None yet"}.
` +
                `• Top Ambassadors: ${topAmbs.join(" · ") || "None yet"}.
` +
                `• Management & Operations Feedback: Keep payment verification fast so students get immediate access; clear GHS ${unpaidTotal.toFixed(2)} owed payouts on a predictable schedule to build ambassador trust; periodically clean up duplicate or test accounts so conversion and user counts stay accurate.
` +
                `• Growth & Product Ideas: (1) Convert the ${trialUsersList.length} trial users with short WhatsApp/in-app reminders before trial expiry highlighting licensing exam readiness; (2) Reward top referrers with milestone bonuses or featured campus spots; (3) Offer structured study plans, care-plan walkthroughs, and timed mock tests so students see clear exam value before paying.`
            )
            return
        }

        if (!lower || lower.includes("summary") || lower.includes("overview") || lower.includes("everything")) {
            setAiReply(
                `Dashboard Summary: ${totalUsers} total users (${paidUsersList.length} paid / ${conversionRate}%, ${trialUsersList.length} trial), ` +
                `${data.summary.total_referrals} referrals across ${data.summary.ambassador_count} ambassadors. ` +
                `Commissions: GHS ${unpaidTotal.toFixed(2)} unpaid (${unpaidAmbs.length} ambassador(s) to pay), ` +
                `GHS ${paidOutTotal.toFixed(2)} paid out. Pending/review payments: ${pendingPaymentsList.length}.`
            )
            return
        }

        if (lower.includes("unpaid") || lower.includes("payout") || lower.includes("who to pay") || lower.includes("pay out")) {
            setTab("ambassadors")
            setUnpaidOnly(true)
            const oweList = unpaidAmbs.map(
                (a) => `${a.full_name || a.email} (${a.phone_number || "no phone"}): GHS ${parseFloat(a.unpaid_ghs || "0").toFixed(2)}`
            )
            setAiReply(
                oweList.length > 0
                    ? `Switched to Ambassadors & Payouts (Unpaid Only). Owed payouts: ${oweList.join(" · ")}.`
                    : `Switched to Ambassadors & Payouts. All commissions are currently settled (GHS 0.00 unpaid).`
            )
            return
        }

        if (lower.includes("pending") || lower.includes("payment") || lower.includes("approve")) {
            setTab("payments")
            setAiReply(
                pendingPaymentsList.length > 0
                    ? `Switched to Payments. ${pendingPaymentsList.length} payment(s) need attention: ${pendingPaymentsList.map((p) => `${p.student_name || p.student_email} (GHS ${parseFloat(p.amount_ghs || "0").toFixed(2)}, ${p.status})`).join(" · ")}.`
                    : `Switched to Payments. There are no pending or awaiting-review payments right now.`
            )
            return
        }

        if (lower.includes("who just paid") || lower.includes("recent payment") || lower.includes("paid today")) {
            setSearch("")
            setUnpaidOnly(false)
            setTab("payments")
            const recentPaid = data.payments.filter((p) => p.status === "SUCCESS").slice(0, 5)
            setAiReply(
                recentPaid.length > 0
                    ? `Switched to Payments (cleared search). Recent approved payments: ${recentPaid.map((p) => `${p.student_name || p.student_email} (GHS ${parseFloat(p.amount_ghs || "0").toFixed(2)}, ${formatDateTime(p.initiated_at)})`).join(" · ")}.`
                    : `Switched to Payments (cleared search). No approved payments found yet.`
            )
            return
        }

        if (lower.includes("today") || lower.includes("joined") || lower.includes("who just joined")) {
            setSearch("")
            setUnpaidOnly(false)
            setTab("users")
            const todayUsers = data.users.filter((u) => isSameLocalDay(u.date_joined))
            setAiReply(
                todayUsers.length > 0
                    ? `Today's Users (${todayUsers.length}): ${todayUsers.map((u) => `${u.full_name || u.email} (${u.institution || "School not set"}, ${formatDateTime(u.date_joined)})`).join(" · ")}.`
                    : `No new users joined today yet across ${totalUsers} total users.`
            )
            return
        }

        const matchedUsers = data.users.filter(
            (u) =>
                (u.full_name || "").toLowerCase().includes(lower) ||
                (u.email || "").toLowerCase().includes(lower) ||
                (u.phone_number || "").toLowerCase().includes(lower) ||
                (u.institution || "").toLowerCase().includes(lower) ||
                (u.referral_code || "").toLowerCase().includes(lower)
        )
        const matchedAmbs = data.ambassadors.filter(
            (a) =>
                (a.full_name || "").toLowerCase().includes(lower) ||
                (a.email || "").toLowerCase().includes(lower) ||
                (a.referral_code || "").toLowerCase().includes(lower)
        )

        if (matchedUsers.length > 0 || matchedAmbs.length > 0) {
            setAiReply(
                `Search for "${qText}": ${matchedUsers.length} user match(es), ${matchedAmbs.length} ambassador match(es). ` +
                (matchedUsers.length > 0
                    ? `Users: ${matchedUsers.slice(0, 6).map((u) => `${u.full_name || u.email} (${u.has_paid || u.is_subscribed ? "Paid" : "Trial"}, ${u.institution || "School not set"})`).join(" · ")}. `
                    : "") +
                (matchedAmbs.length > 0
                    ? `Ambassadors: ${matchedAmbs.slice(0, 5).map((a) => `${a.full_name || a.email} [Code: ${a.referral_code}, Unpaid: GHS ${parseFloat(a.unpaid_ghs || "0").toFixed(2)}]`).join(" · ")}.`
                    : "")
            )
            return
        }

        setAiReply(
            `💬 Admin AI Feedback on "${qText}": No exact user/code match for "${qText}", so here is a live management view: ` +
            `You have ${totalUsers} users (${paidUsersList.length} paid / ${conversionRate}% conversion, ${trialUsersList.length} trial), ` +
            `${pendingPaymentsList.length} pending payment(s), and GHS ${unpaidTotal.toFixed(2)} in unpaid commissions. ` +
            `Try asking for "feedback", "growth ideas", "who subscribed", "trial users", "who to pay", or a student/school/code name.`
        )
    }
    function normalizeGhPhoneForWa(rawPhone?: string | null): string {
        if (!rawPhone) return ""
        const digits = String(rawPhone).replace(/\D/g, "")
        if (!digits) return ""
        if (digits.startsWith("0") && digits.length === 10) return "233" + digits.slice(1)
        if (digits.length === 9) return "233" + digits
        return digits
    }

    function applyManualPreset(presetKey: "welcome" | "payment" | "technical" | "renewal") {
        const usersList = data?.users || []
        const chosen = usersList.find((u) => String(u.id) === manualSelectedUserId) || usersList[0]
        const firstName = (chosen?.full_name || "Student").trim().split(/\s+/)[0] || "Student"

        if (presetKey === "welcome") {
            setManualSubject(`Welcome to NursifyGH, ${firstName}`)
            setManualMessage(
                `Hi ${firstName}, welcome to NursifyGH! Your student account is ready. Log in to practice past questions, flashcards, and study notes.`
            )
        } else if (presetKey === "payment") {
            setManualSubject("Payment Confirmed — NursifyGH Account Active")
            setManualMessage(
                `Hi ${firstName}, your payment has been confirmed and your NursifyGH account is now active. You can log in and continue studying.`
            )
        } else if (presetKey === "technical") {
            setManualSubject("Technical Notice — NursifyGH Support")
            setManualMessage(
                `Hi ${firstName}, we are addressing a brief technical issue on NursifyGH so your study access stays smooth. Thank you for your patience.`
            )
        } else {
            setManualSubject("NursifyGH Access Renewal Reminder")
            setManualMessage(
                `Hi ${firstName}, this is a quick reminder to renew your NursifyGH study pass so you keep uninterrupted access.`
            )
        }
        setManualCopiedNote(null)
    }

    async function copyTextToClipboard(text: string, label: string) {
        try {
            await navigator.clipboard.writeText(text)
            setManualCopiedNote(`${label} copied!`)
        } catch {
            setManualCopiedNote(`Could not auto-copy ${label}. Select and copy manually.`)
        }
    }

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
            u.referred_by.toLowerCase().includes(q) ||
            (u.institution || "").toLowerCase().includes(q)
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
                    <a href="https://nursifygh-api.onrender.com/admin/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 self-start sm:self-auto">Django Admin ↗</a>
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

                {/* Strictly Admin-Only AI Assistant (never exposed to students/users) */}
                {isStaff && (
                    <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-800">
                                    Admin-Only AI Assistant
                                </p>
                                <p className="text-xs text-on-surface-muted">
                                    Ask for summaries, jump to unpaid payouts or pending payments, or search users &amp; codes
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 min-w-[140px]">
                                <button
                                    type="button"
                                    onClick={() => handleAdminAiCommand("summary")}
                                    className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100"
                                >
                                    Dashboard Summary
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAdminAiCommand("unpaid payouts")}
                                    className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100"
                                >
                                    Who to Pay
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAdminAiCommand("pending payments")}
                                    className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100"
                                >
                                    Pending Payments
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAdminAiCommand("who subscribed")}
                                    className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100"
                                >
                                    Paid / Subscribed
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAdminAiCommand("advisor business ideas analysis")}
                                    className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100"
                                >
                                    AI Advisor &amp; Ideas
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAdminAiCommand("today")}
                                    className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100"
                                >
                                    Today&apos;s Users
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        handleAdminAiCommand()
                                    }
                                }}
                                placeholder="e.g. Who has unpaid payouts? or Find SYNTRA-20 or pending payments"
                                className="min-h-[46px] w-full flex-1 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => handleAdminAiCommand()}
                                className="min-h-[46px] w-full sm:w-auto rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800 shrink-0"
                            >
                                Ask Admin AI
                            </button>
                        </div>

                        {aiReply && (
                            <div className="rounded-2xl border border-brand-300 bg-white p-4 text-sm sm:text-base text-on-surface flex flex-col sm:flex-row sm:items-start justify-between gap-3 break-words">
                                <span className="leading-relaxed break-words whitespace-pre-line flex-1">{aiReply}</span>
                                <button
                                    type="button"
                                    onClick={() => setAiReply(null)}
                                    className="text-xs font-bold text-brand-700 hover:underline shrink-0"
                                >
                                    Close
                                </button>
                            </div>
                        )}

                        <div className="mt-3 rounded-2xl border border-brand-200 bg-white p-4 space-y-3">
                            {(() => {
                                const allUsers = data?.users || []
                                const filteredUsers = allUsers.filter((u) => {
                                    if (manualGroupFilter === "paid") return Boolean(u.has_paid || u.is_subscribed)
                                    if (manualGroupFilter === "trial") return !u.has_paid && !u.is_subscribed
                                    return true
                                })
                                const selectedUser =
                                    filteredUsers.find((u) => String(u.id) === manualSelectedUserId) ||
                                    allUsers.find((u) => String(u.id) === manualSelectedUserId) ||
                                    filteredUsers[0] ||
                                    null

                                const waDigits = normalizeGhPhoneForWa(selectedUser?.phone_number)
                                const smsDigits = (selectedUser?.phone_number || "").replace(/[^\d+]/g, "")
                                const recipientEmail = (selectedUser?.email || "").trim()
                                const waHref = waDigits
                                    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(manualMessage)}`
                                    : `https://wa.me/?text=${encodeURIComponent(manualMessage)}`
                                const mailHref = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(manualSubject)}&body=${encodeURIComponent(manualMessage)}`
                                const smsHref = smsDigits
                                    ? `sms:${smsDigits}?body=${encodeURIComponent(manualMessage)}`
                                    : `sms:?body=${encodeURIComponent(manualMessage)}`
                                const groupEmails = filteredUsers
                                    .map((u) => (u.email || "").trim())
                                    .filter(Boolean)
                                    .join(", ")

                                return (
                                    <>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                                                    Free Manual Outreach Launcher (WhatsApp · Email · SMS)
                                                </div>
                                                <p className="text-xs text-on-surface-muted">
                                                    Pick a ready-to-use message and launch WhatsApp, Email, or SMS directly—no paid domain or SMS API needed.
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => applyManualPreset("welcome")}
                                                    className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-100"
                                                >
                                                    Registration
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyManualPreset("payment")}
                                                    className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-800 hover:bg-brand-100"
                                                >
                                                    Payment &amp; Activated
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyManualPreset("technical")}
                                                    className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                                                >
                                                    Technical Issue
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyManualPreset("renewal")}
                                                    className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-900 hover:bg-sky-100"
                                                >
                                                    Renewal Reminder
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            <select
                                                value={manualGroupFilter}
                                                onChange={(e) => {
                                                    setManualGroupFilter(e.target.value as "all" | "paid" | "trial")
                                                    setManualSelectedUserId("")
                                                }}
                                                className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-on-surface"
                                            >
                                                <option value="all">All Users ({allUsers.length})</option>
                                                <option value="paid">
                                                    Paid Users ({allUsers.filter((u) => u.has_paid || u.is_subscribed).length})
                                                </option>
                                                <option value="trial">
                                                    Trial / Unpaid ({allUsers.filter((u) => !u.has_paid && !u.is_subscribed).length})
                                                </option>
                                            </select>

                                            <select
                                                value={selectedUser ? String(selectedUser.id) : ""}
                                                onChange={(e) => setManualSelectedUserId(e.target.value)}
                                                className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-on-surface sm:col-span-2"
                                            >
                                                {filteredUsers.length === 0 ? (
                                                    <option value="">No users in selected group</option>
                                                ) : (
                                                    filteredUsers.map((u) => (
                                                        <option key={u.id} value={String(u.id)}>
                                                            {u.full_name || "Unnamed"} — {u.phone_number || "No phone"} · {u.email}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <input
                                                type="text"
                                                value={manualSubject}
                                                onChange={(e) => setManualSubject(e.target.value)}
                                                placeholder="Email subject"
                                                className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-on-surface"
                                            />
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 flex items-center justify-between gap-2">
                                                <span className="truncate">
                                                    {selectedUser
                                                        ? `${selectedUser.full_name || "User"} · ${selectedUser.phone_number || "No phone"}`
                                                        : "No user selected"}
                                                </span>
                                                {groupEmails && (
                                                    <button
                                                        type="button"
                                                        onClick={() => copyTextToClipboard(groupEmails, `${filteredUsers.length} group emails`)}
                                                        className="text-[11px] font-bold text-brand-700 hover:underline shrink-0"
                                                    >
                                                        Copy Group Emails
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <textarea
                                            rows={2}
                                            value={manualMessage}
                                            onChange={(e) => setManualMessage(e.target.value)}
                                            placeholder="Ready-to-send message text..."
                                            className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-xs text-on-surface"
                                        />

                                        <div className="flex flex-wrap items-center gap-2">
                                            <a
                                                href={waHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                            >
                                                WhatsApp {waDigits ? `(${waDigits})` : ""} ↗
                                            </a>
                                            <a
                                                href={mailHref}
                                                className="inline-flex items-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                                            >
                                                Email ↗
                                            </a>
                                            <a
                                                href={smsHref}
                                                className="inline-flex items-center rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-bold text-on-surface hover:bg-surface-subtle"
                                            >
                                                SMS ↗
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => copyTextToClipboard(manualMessage, "Message")}
                                                className="inline-flex items-center rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-800 hover:bg-brand-100"
                                            >
                                                Copy Message
                                            </button>
                                            {manualCopiedNote && (
                                                <span className="text-xs font-semibold text-brand-700">{manualCopiedNote}</span>
                                            )}
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
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
                                    ["trash", `Trash (${(data.trashed_users || []).length})`],
                                ] as const
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setTab(key)}
                                    className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
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
                                                        <div className="text-on-surface-muted">{u.institution || "School not set"}</div>
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
                                                        <div className="flex flex-wrap gap-1.5 min-w-[140px]">
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
                                                                        if (window.confirm(`Move ${u.email} to Trash? You can restore them or delete permanently from the Trash tab.`)) {
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
                                                    <div className="flex flex-wrap gap-1.5 min-w-[140px]">
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

                        {tab === "trash" && (
                            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-surface-subtle text-on-surface-muted uppercase text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3">Trashed User</th>
                                            <th className="px-4 py-3">Program / School</th>
                                            <th className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {(data.trashed_users || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-6 text-center text-on-surface-muted">
                                                    Trash is empty. Deleted users appear here so you can restore or delete permanently.
                                                </td>
                                            </tr>
                                        ) : (
                                            (data.trashed_users || []).map((tu) => (
                                                <tr key={tu.id} className="hover:bg-surface-subtle/40">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-on-surface">{tu.full_name || "—"}</div>
                                                        <div className="text-xs text-on-surface-muted">
                                                            {tu.email} {tu.phone_number ? `· ${tu.phone_number}` : ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <div>{tu.program || "—"} {tu.level ? `· L${tu.level}` : ""}</div>
                                                        <div className="text-on-surface-muted">{tu.institution || "School not set"}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                                            <button
                                                                disabled={actionMutation.isPending}
                                                                onClick={() => actionMutation.mutate({ action: "restore_user", user_id: tu.id })}
                                                                className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-50"
                                                            >
                                                                Restore
                                                            </button>
                                                            <button
                                                                disabled={actionMutation.isPending}
                                                                onClick={() => {
                                                                    if (window.confirm(`Permanently delete ${tu.email}? This cannot be undone.`)) {
                                                                        actionMutation.mutate({ action: "permanent_delete_user", user_id: tu.id })
                                                                    }
                                                                }}
                                                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                            >
                                                                Delete Forever
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
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
                                                    <div className="flex flex-wrap gap-1.5 min-w-[140px]">
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
