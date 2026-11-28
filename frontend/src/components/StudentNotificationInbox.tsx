import { useEffect, useState } from "react"
import api from "../api/client"

export interface StoredNotification {
    id: string
    title: string
    message: string
    category: "announcement" | "study" | "system"
    createdAt: string
    read: boolean
    kept: boolean
}

const STORAGE_KEY = "nursify_student_stored_notifications_v1"

const DEFAULT_NOTIFICATIONS: StoredNotification[] = [
    {
        id: "welcome-inbox-1",
        title: "Welcome to Your NursifyGH Message Inbox",
        message:
            "All platform announcements, exam updates, and study reminders are stored here automatically. You can leave important messages in your inbox or remove any message whenever you want.",
        category: "system",
        createdAt: "Pinned",
        read: false,
        kept: true,
    },
]

export default function StudentNotificationInbox() {
    const [items, setItems] = useState<StoredNotification[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) return parsed
            }
        } catch {
            // ignore parse errors
        }
        return DEFAULT_NOTIFICATIONS
    })

    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [filter, setFilter] = useState<"all" | "unread" | "kept">("all")

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        } catch {
            // ignore storage errors
        }
    }, [items])

    useEffect(() => {
        let cancelled = false

        async function syncServerNotifications() {
            const candidatePaths = [
                "/notifications/",
                "/academics/notifications/",
                "/accounts/notifications/",
            ]

            for (const path of candidatePaths) {
                try {
                    const res = await api.get(path)
                    const list = Array.isArray(res.data)
                        ? res.data
                        : Array.isArray(res.data?.results)
                        ? res.data.results
                        : null

                    if (list && !cancelled) {
                        setItems((prev) => {
                            const existingIds = new Set(prev.map((x) => x.id))
                            const incoming: StoredNotification[] = []

                            for (const raw of list) {
                                const sid = `srv-${raw.id ?? raw.pk ?? raw.title ?? Math.random()}`
                                if (existingIds.has(sid)) continue
                                incoming.push({
                                    id: sid,
                                    title: String(raw.title || raw.subject || "Platform Notice"),
                                    message: String(raw.message || raw.body || raw.content || ""),
                                    category: "announcement",
                                    createdAt: raw.created_at
                                        ? new Date(raw.created_at).toLocaleDateString("en-GB", {
                                              day: "numeric",
                                              month: "short",
                                          })
                                        : "New",
                                    read: Boolean(raw.is_read),
                                    kept: false,
                                })
                            }

                            return incoming.length > 0 ? [...incoming, ...prev] : prev
                        })
                        break
                    }
                } catch {
                    // try next endpoint silently
                }
            }
        }

        syncServerNotifications()
        return () => {
            cancelled = true
        }
    }, [])

    function handleLeaveInInbox(id: string) {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, read: true, kept: true } : item
            )
        )
    }

    function handleToggleOpen(id: string) {
        setExpandedId((prev) => (prev === id ? null : id))
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, read: true } : item))
        )
    }

    function handleRemove(id: string) {
        setItems((prev) => prev.filter((item) => item.id !== id))
        if (expandedId === id) setExpandedId(null)
    }

    function handleRemoveUnkeptRead() {
        setItems((prev) => prev.filter((item) => !item.read || item.kept))
    }

    const unreadCount = items.filter((i) => !i.read).length
    const visibleItems = items.filter((i) => {
        if (filter === "unread") return !i.read
        if (filter === "kept") return i.kept
        return true
    })

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700 font-bold text-sm">
                        🔔
                    </span>
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                            <span>Notifications &amp; Stored Messages</span>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                    {unreadCount} New
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-slate-500">
                            Messages stay saved here until you choose to remove them
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {(["all", "unread", "kept"] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setFilter(tab)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                                filter === tab
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            {tab === "kept" ? "Left / Saved" : tab}
                        </button>
                    ))}
                </div>
            </div>

            {visibleItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-center text-xs text-slate-600">
                    No messages in this view. Your saved notifications remain stored safely here.
                </div>
            ) : (
                <div className="space-y-2">
                    {visibleItems.map((item) => {
                        const isOpen = expandedId === item.id
                        return (
                            <div
                                key={item.id}
                                className={`rounded-xl border p-3.5 transition-all ${
                                    !item.read
                                        ? "border-brand-300 bg-brand-50/40"
                                        : item.kept
                                        ? "border-emerald-200 bg-emerald-50/30"
                                        : "border-slate-200 bg-slate-50/60"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleOpen(item.id)}
                                        className="text-left flex-1 min-w-0"
                                    >
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {!item.read && (
                                                <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" />
                                            )}
                                            <span className="text-sm font-bold text-slate-900">
                                                {item.title}
                                            </span>
                                            {item.kept && (
                                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                                    Kept in Inbox
                                                </span>
                                            )}
                                            <span className="text-[11px] text-slate-500">
                                                • {item.createdAt}
                                            </span>
                                        </div>
                                        <p
                                            className={`text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed ${
                                                isOpen ? "" : "line-clamp-2"
                                            }`}
                                        >
                                            {item.message}
                                        </p>
                                    </button>
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleOpen(item.id)}
                                        className="text-xs font-bold text-brand-700 hover:underline"
                                    >
                                        {isOpen ? "Collapse" : "Read Full Message"}
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleLeaveInInbox(item.id)}
                                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                                item.kept
                                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                            }`}
                                        >
                                            {item.kept ? "Left in Inbox ✓" : "Leave It"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleRemove(item.id)}
                                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {items.some((i) => i.read && !i.kept) && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleRemoveUnkeptRead}
                        className="text-xs font-semibold text-slate-500 hover:text-red-700"
                    >
                        Remove read messages (keep saved ones)
                    </button>
                </div>
            )}
        </section>
    )
}
