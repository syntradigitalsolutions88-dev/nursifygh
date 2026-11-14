import { useEffect, useState } from "react"
import Logo from "./ui/Logo"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [showBanner, setShowBanner] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        // Already installed? Don't show
        if (window.matchMedia("(display-mode: standalone)").matches) return

        // Dismissed recently? Don't show for 7 days
        const dismissedAt = localStorage.getItem("pwa_banner_dismissed")
        if (dismissedAt && Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return

        const ua = window.navigator.userAgent.toLowerCase()
        const iosDevice = /iphone|ipad|ipod/.test(ua)
        setIsIOS(iosDevice)

        if (iosDevice) {
            setTimeout(() => setShowBanner(true), 3000)
            return
        }

        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setShowBanner(true)
        }
        window.addEventListener("beforeinstallprompt", handler)
        return () => window.removeEventListener("beforeinstallprompt", handler)
    }, [])

    async function handleInstall() {
        if (isIOS) {
            alert("To install: tap the Share button (⬆) at the bottom of Safari, then tap 'Add to Home Screen'.")
            return
        }
        if (!deferredPrompt) return
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === "accepted") {
            setShowBanner(false)
        }
        setDeferredPrompt(null)
    }

    function dismiss() {
        setShowBanner(false)
        localStorage.setItem("pwa_banner_dismissed", String(Date.now()))
    }

    if (!showBanner) return null

    return (
        <div className="fixed bottom-20 left-3 right-3 z-[55] md:bottom-6 md:right-6 md:left-auto md:w-96">
            <div className="rounded-2xl border border-border bg-white shadow-2xl p-4">
                <div className="flex items-start gap-3">
                    <Logo size="sm" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface">Install NursifyGH</p>
                        <p className="text-xs text-on-surface-muted mt-0.5">
                            {isIOS
                                ? "Tap Share ⬆ then 'Add to Home Screen'"
                                : "Add to your home screen for fast access"}
                        </p>
                    </div>
                    <button
                        onClick={dismiss}
                        className="text-on-surface-muted hover:text-on-surface text-xl leading-none -mt-1"
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
                <div className="mt-3 flex gap-2">
                    <button
                        onClick={handleInstall}
                        className="flex-1 rounded-lg bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 text-sm font-semibold"
                    >
                        {isIOS ? "How to install" : "Install app"}
                    </button>
                    <button
                        onClick={dismiss}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-subtle"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    )
}