import { useEffect, useRef, useState } from "react"
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
            "All platform announcements, exam updates, and study reminders are stored here automatically. Leave important messages in your inbox or remove any message whenever you want.",
        category: "system",
        createdAt: "Pinned",
        read: false,
        kept: true,
    },
]

export default function StudentNotificationInbox() {
    const containerRef = useRef<HTMLElement | null>(null)
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

    const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [filter, setFilter] = useState<"all" | "unread" | "kept">("all")

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        } catch {
            // ignore storage errors
        }
    }, [items])

    // Allow tapping the top-right navbar bell icon to open/scroll to this inbox
    useEffect(() => {
        function handleNavBellClick(e: MouseEvent) {
            const target = e.target as HTMLElement | null
            const btn = target?.closest("header button, nav button")
            if (!btn) return
            const label = (btn.getAttribute("aria-label") || btn.getAttribute("title") || btn.textContent || "").toLowerCase()
            const hasBellSvg = Boolean(btn.querySelector("svg")) && !btn.textContent?.trim()
            if (label.includes("notif") || label.includes("bell") || hasBellSvg) {
                setIsInboxOpen(true)
                setTimeout(() => {
                    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                }, 60)
            }
        }
        document.addEventListener("click", handleNavBellClick)
        return () => document.removeEventListener("click", handleNavBellClick)
    }, [])

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

    function handleToggleOpenMessage(id: string) {
        setExpandedId((prev) => (prev === id ? null : id))
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, read: true } : item))
        )
    }

    function handleRemove(id: string) {
        setItems((prev) => prev.filter((item) => item.id !== id))
        if (expandedId === id) setExpandedId(null)
    }

    const unreadCount = items.filter((i) => !i.read).length
    const latestItem = items[0]
    const visibleItems = items.filter((i) => {
        if (filter === "unread") return !i.read
        if (filter === "kept") return i.kept
        return true
    })

    return (
        <section
            ref={containerRef}
            className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
        >
            {/* Compact 1-Row Header Bar */}
            <button
                type="button"
                onClick={() => setIsInboxOpen((prev) => !prev)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left hover:bg-slate-50/80 transition-colors"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 text-xs font-bold">
                        🔔
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">
                                Messages ({items.length})
                            </span>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-brand-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                            {latestItem
                                ? latestItem.title
                                : "No stored messages right now"}
                        </p>
                    </div>
                </div>

                <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                    {isInboxOpen ? "Hide" : "Open"}
                </span>
            </button>

            {/* Expandable Message List */}
            {isInboxOpen && (
                <div className="border-t border-slate-100 p-3 space-y-2.5 bg-slate-50/40">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                            {(["all", "unread", "kept"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setFilter(tab)}
                                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize transition-colors ${
                                        filter === tab
                                            ? "bg-slate-900 text-white"
                                            : "bg-white border border-slate-200 text-slate-700"
                                    }`}
                                >
                                    {tab === "kept" ? "Left / Saved" : tab}
                                </button>
                            ))}
                        </div>
                        <span className="text-[11px] text-slate-500">
                            Stored until removed
                        </span>
                    </div>

                    {visibleItems.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-2">
                            No messages in this filter.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {visibleItems.map((item) => {
                                const isOpen = expandedId === item.id
                                return (
                                    <div
                                        key={item.id}
                                        className={`rounded-lg border p-2.5 bg-white ${
                                            !item.read
                                                ? "border-brand-300"
                                                : item.kept
                                                ? "border-emerald-200"
                                                : "border-slate-200"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleToggleOpenMessage(item.id)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-slate-900 truncate">
                                                    {!item.read && "• "}
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] text-slate-400 shrink-0">
                                                    {item.kept ? "Kept • " : ""}
                                                    {item.createdAt}
                                                </span>
                                            </div>
                                            <p
                                                className={`text-xs text-slate-600 mt-1 leading-relaxed ${
                                                    isOpen ? "" : "line-clamp-1"
                                                }`}
                                            >
                                                {item.message}
                                            </p>
                                        </button>

                                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleOpenMessage(item.id)}
                                                className="text-[11px] font-bold text-brand-700 hover:underline"
                                            >
                                                {isOpen ? "Less" : "Read"}
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLeaveInInbox(item.id)}
                                                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                                                        item.kept
                                                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    {item.kept ? "Left ✓" : "Leave It"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(item.id)}
                                                    className="rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
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
                </div>
            )}
        </section>
    )
}
