import { useState, useEffect } from "react"

interface PwaInstallPromptProps {
    variant?: "dashboard" | "floating"
}

export default function PwaInstallPrompt({ variant = "dashboard" }: PwaInstallPromptProps) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isIOS, setIsIOS] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)
    const [showIOSModal, setShowIOSModal] = useState(false)

    useEffect(() => {
        // 1. Check if installed
        const isAppInstalled = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone
        setIsStandalone(isAppInstalled)

        // 2. Check iOS
        const userAgent = window.navigator.userAgent.toLowerCase()
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(isIOSDevice)

        // 3. Listen for native prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }, [])

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSModal(true)
            return
        }

        if (!deferredPrompt) {
            alert("To install, click the menu button in your browser and select 'Install App' or 'Add to Home Screen'.")
            return
        }

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === "accepted") setDeferredPrompt(null)
    }

    if (isStandalone) return null

    return (
        <>
            {/* Dashboard Card Variant */}
            {variant === "dashboard" && (
                <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-50 to-white border border-brand-100 p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-900 text-sm sm:text-base">Install NursifyGH</h3>
                            <p className="text-xs text-brand-700/70 sm:text-sm mt-0.5">Add to your home screen for fast access.</p>
                        </div>
                    </div>
                    <button onClick={handleInstallClick} className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition">
                        Install
                    </button>
                </div>
            )}

            {/* Floating Banner Variant (For Landing Page) */}
            {variant === "floating" && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-900 p-4 shadow-2xl border border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-brand-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Install NursifyGH</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Study faster on your phone.</p>
                            </div>
                        </div>
                        <button onClick={handleInstallClick} className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-400 transition">
                            Install
                        </button>
                    </div>
                </div>
            )}

            {/* iOS Modal (Shared by both variants) */}
            {showIOSModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4 sm:p-0">
                    <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl text-center relative">
                        <button onClick={() => setShowIOSModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
                        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Install on iPhone</h3>
                        <p className="text-sm text-gray-500 mb-6">Apple requires you to add this to your home screen manually. Follow these steps:</p>
                        <div className="space-y-4 text-left">
                            <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-xs text-brand-700">1</span>
                                <p className="text-sm text-gray-700">Open this page in <strong>Safari</strong>.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-xs text-brand-700">2</span>
                                <p className="text-sm text-gray-700">Tap the <strong>Share</strong> button at the bottom.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-xs text-brand-700">3</span>
                                <p className="text-sm text-gray-700">Scroll down and tap <strong>"Add to Home Screen"</strong>.</p>
                            </div>
                        </div>
                        <button onClick={() => setShowIOSModal(false)} className="mt-8 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800">Got it</button>
                    </div>
                </div>
            )}
        </>
    )
}