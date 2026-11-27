import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { getNotifications, markRead, markAllRead } from "../../api/notifications"

const DISMISSED_KEY = "dismissed_broadcasts"

function getDismissedBroadcasts(): string[] {
    try {
        return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")
    } catch {
        return []
    }
}

function saveDismissedBroadcasts(ids: string[]) {
    try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids))
        window.dispatchEvent(new Event("nursify:broadcasts-updated"))
    } catch {}
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false)
    const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedBroadcasts)
    const ref = useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()

    const { data } = useQuery({
        queryKey: ["notifications"],
        queryFn: getNotifications,
        refetchInterval: 60000,
    })

    useEffect(() => {
        const sync = () => setDismissedIds(getDismissedBroadcasts())
        window.addEventListener("nursify:broadcasts-updated", sync)
        window.addEventListener("storage", sync)
        return () => {
            window.removeEventListener("nursify:broadcasts-updated", sync)
            window.removeEventListener("storage", sync)
        }
    }, [])

    const markOneMutation = useMutation({
        mutationFn: markRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    })

    const markAllMutation = useMutation({
        mutationFn: markAllRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    })

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    const unreadBroadcasts = (data?.broadcasts || []).filter(
        (b) => !dismissedIds.includes(String(b.id))
    )
    const unreadPersonal = data?.personal || []
    const unread = unreadBroadcasts.length + unreadPersonal.length

    function handleMarkBroadcastRead(id: string) {
        const sid = String(id)
        if (!dismissedIds.includes(sid)) {
            const next = [...dismissedIds, sid]
            setDismissedIds(next)
            saveDismissedBroadcasts(next)
        }
    }

    function handleMarkAllRead() {
        const allBroadcastIds = (data?.broadcasts || []).map((b) => String(b.id))
        if (allBroadcastIds.length > 0) {
            const merged = Array.from(new Set([...dismissedIds, ...allBroadcastIds]))
            setDismissedIds(merged)
            saveDismissedBroadcasts(merged)
        }
        markAllMutation.mutate()
    }

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`relative h-9 w-9 rounded-full flex items-center justify-center transition-colors ${unread > 0 ? "bg-brand-50 text-brand-700 ring-2 ring-brand-200" : "text-on-surface-muted hover:bg-surface-subtle hover:text-on-surface"}`}
                aria-label="Notifications"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="fixed inset-x-3 top-16 z-50 w-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80 rounded-xl border border-border bg-white shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-subtle">
                        <p className="text-sm font-bold text-on-surface">Notifications</p>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                disabled={markAllMutation.isPending}
                                className="text-xs text-brand-600 font-semibold hover:underline disabled:opacity-50"
                            >
                                {markAllMutation.isPending ? "Marking..." : "Mark all read"}
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {unreadBroadcasts.length > 0 && (
                            <div className="border-b border-border">
                                {unreadBroadcasts.map((b) => (
                                    <NotificationItem
                                        key={b.id}
                                        type={b.notification_type}
                                        title={b.title}
                                        message={b.message}
                                        actionUrl={b.action_url}
                                        actionLabel={b.action_label}
                                        onNavigate={() => {
                                            handleMarkBroadcastRead(b.id)
                                            setOpen(false)
                                        }}
                                        onMarkRead={() => handleMarkBroadcastRead(b.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {unreadPersonal.length > 0 ? (
                            unreadPersonal.map((n) => (
                                <NotificationItem
                                    key={n.id}
                                    type={n.notification_type}
                                    title={n.title}
                                    message={n.message}
                                    actionUrl={n.action_url}
                                    actionLabel={n.action_label}
                                    onNavigate={() => {
                                        markOneMutation.mutate(n.id)
                                        setOpen(false)
                                    }}
                                    onMarkRead={() => markOneMutation.mutate(n.id)}
                                />
                            ))
                        ) : (
                            unreadBroadcasts.length === 0 && (
                                <div className="py-12 text-center text-sm text-on-surface-muted">
                                    You're all caught up! 🎉
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function NotificationItem({
    type, title, message, actionUrl, actionLabel, onNavigate, onMarkRead,
}: {
    type: string
    title: string
    message: string
    actionUrl: string
    actionLabel: string
    onNavigate: () => void
    onMarkRead: () => void
}) {
    const colors: Record<string, string> = {
        INFO: "bg-blue-50 border-blue-200 text-blue-800",
        SUCCESS: "bg-green-50 border-green-200 text-green-800",
        WARNING: "bg-amber-50 border-amber-200 text-amber-800",
        FEATURE: "bg-purple-50 border-purple-200 text-purple-800",
        EXAM: "bg-red-50 border-red-200 text-red-800",
    }
    return (
        <div className={`px-4 py-3 border-b border-border last:border-b-0 ${colors[type] || colors.INFO}`}>
            <p className="text-sm font-bold mb-1">{title}</p>
            <p className="text-xs leading-relaxed mb-2">{message}</p>
            <div className="flex items-center justify-between gap-2">
                {actionUrl && actionLabel ? (
                    <Link
                        to={actionUrl.startsWith("/") || actionUrl.startsWith("http") ? actionUrl : `/${actionUrl}`}
                        onClick={onNavigate}
                        className="inline-block text-xs font-bold underline hover:no-underline"
                    >
                        {actionLabel} →
                    </Link>
                ) : (
                    <span />
                )}
                <button
                    type="button"
                    onClick={onMarkRead}
                    className="text-[11px] font-semibold opacity-80 hover:opacity-100 underline"
                >
                    Mark as read
                </button>
            </div>
        </div>
    )
}
