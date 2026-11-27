import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getNotifications } from "../../api/notifications"

export default function UnreadBroadcastBanner() {
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem("dismissed_broadcasts") || "[]")
        } catch {
            return []
        }
    })

    useEffect(() => {
        const sync = () => {
            try {
                setDismissedIds(JSON.parse(localStorage.getItem("dismissed_broadcasts") || "[]"))
            } catch {}
        }
        window.addEventListener("nursify:broadcasts-updated", sync)
        window.addEventListener("storage", sync)
        return () => {
            window.removeEventListener("nursify:broadcasts-updated", sync)
            window.removeEventListener("storage", sync)
        }
    }, [])

    const { data } = useQuery({
        queryKey: ["notifications"],
        queryFn: getNotifications,
        refetchInterval: 60000,
    })

    const broadcasts = data?.broadcasts || []
    const activeBanner = broadcasts.find((b: any) => !dismissedIds.includes(String(b.id)))

    if (!activeBanner) return null

    const rawUrl = (activeBanner.action_url || "").trim()
    const safeUrl = rawUrl
        ? rawUrl.startsWith("/") || rawUrl.startsWith("http")
            ? rawUrl
            : `/${rawUrl}`
        : ""

    function dismiss(id: string) {
        const next = [...dismissedIds, String(id)]
        setDismissedIds(next)
        try {
            localStorage.setItem("dismissed_broadcasts", JSON.stringify(next))
            window.dispatchEvent(new Event("nursify:broadcasts-updated"))
        } catch {}
    }

    return (
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-700 text-white px-4 py-2.5 shadow-sm print:hidden">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className="shrink-0 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Update
                    </span>
                    <div className="min-w-0 text-xs sm:text-sm">
                        <span className="font-bold mr-1.5">{activeBanner.title}:</span>
                        <span className="text-white/95 line-clamp-2 sm:line-clamp-1">{activeBanner.message}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {safeUrl && activeBanner.action_label && (
                        <Link
                            to={safeUrl}
                            onClick={() => dismiss(activeBanner.id)}
                            className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-brand-800 hover:bg-brand-50 transition-colors whitespace-nowrap"
                        >
                            {activeBanner.action_label} →
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={() => dismiss(activeBanner.id)}
                        aria-label="Dismiss announcement"
                        className="rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
