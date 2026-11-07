import { Link } from "react-router-dom"

import Logo from "../ui/Logo"

interface AuthLayoutProps {
    children: React.ReactNode
    title?: string
    subtitle?: string
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-surface flex flex-col">
            <header className="border-b border-border">
                <div className="container-page flex items-center justify-between py-4">
                    <Link to="/" aria-label="NursifyGH home">
                        <Logo size="md" />
                    </Link>
                    <Link
                        to="/"
                        className="text-sm font-medium text-on-surface-muted hover:text-brand-700"
                    >
                        ← Back to home
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">{children}</div>
            </main>

            <footer className="border-t border-border">
                <div className="container-page py-6 text-center text-xs text-on-surface-muted">
                    © 2026 NursifyGH · Built for Ghanaian nursing students
                </div>
            </footer>
        </div>
    )
}