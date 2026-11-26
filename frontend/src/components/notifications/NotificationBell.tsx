import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { getNotifications, markAllRead } from "../../api/notifications"

export default function NotificationBell() {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()

    const { data } = useQuery({
        queryKey: ["notifications"],
        queryFn: getNotifications,
        refetchInterval: 60000,
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

    const unread = data?.unread_count ?? 0

    return (
        <div className="relative" ref={ref}>
            <button
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
                                onClick={() => markAllMutation.mutate()}
                                className="text-xs text-brand-600 font-semibold hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {data?.broadcasts && data.broadcasts.length > 0 && (
                            <div className="border-b border-border">
                                {data.broadcasts.map((b) => (
                                    <NotificationItem
                                        key={b.id}
                                        type={b.notification_type}
                                        title={b.title}
                                        message={b.message}
                                        actionUrl={b.action_url}
                                        actionLabel={b.action_label}
                                        onClick={() => setOpen(false)}
                                    />
                                ))}
                            </div>
                        )}

                        {data?.personal && data.personal.length > 0 ? (
                            data.personal.map((n) => (
                                <NotificationItem
                                    key={n.id}
                                    type={n.notification_type}
                                    title={n.title}
                                    message={n.message}
                                    actionUrl={n.action_url}
                                    actionLabel={n.action_label}
                                    onClick={() => setOpen(false)}
                                />
                            ))
                        ) : (
                            data?.broadcasts?.length === 0 && (
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
    type, title, message, actionUrl, actionLabel, onClick,
}: {
    type: string
    title: string
    message: string
    actionUrl: string
    actionLabel: string
    onClick: () => void
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
            {actionUrl && actionLabel && (
                <Link
                    to={actionUrl.startsWith("/") || actionUrl.startsWith("http") ? actionUrl : `/${actionUrl}`}
                    onClick={onClick}
                    className="inline-block text-xs font-bold underline hover:no-underline"
                >
                    {actionLabel} →
                </Link>
            )}
        </div>
    )
}