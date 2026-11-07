import { Link } from "react-router-dom"

import Button from "../ui/Button"
import Logo from "../ui/Logo"
import { useAuth } from "../../contexts/AuthContext"
import ChatWidget from "../support/ChatWidget" // ← NEW

/**
 * Header used on public pages (Help Center, Contact, About, Privacy, Terms).
 * When logged in, shows a "Dashboard" link; when logged out, "Log in" + "Sign up".
 */
export default function PublicHeader() {
    const { user } = useAuth()

    return (
        <>
            <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
                <div className="container-page flex items-center justify-between py-4">
                    <Link to="/" aria-label="NursifyGH home">
                        <Logo size="md" />
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm">
                        <Link to="/help" className="text-on-surface-muted hover:text-brand-700">
                            Help Center
                        </Link>
                        <Link to="/about" className="text-on-surface-muted hover:text-brand-700">
                            About
                        </Link>
                        <Link to="/contact" className="text-on-surface-muted hover:text-brand-700">
                            Contact
                        </Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <Link to="/dashboard">
                                <Button size="md">Go to dashboard</Button>
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="hidden sm:inline-flex h-10 items-center px-4 text-sm font-medium text-on-surface hover:text-brand-700"
                                >
                                    Log in
                                </Link>
                                <Link to="/register">
                                    <Button size="md">Start studying free</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Renders the floating chat bubble on all public pages */}
            <ChatWidget />
        </>
    )
}