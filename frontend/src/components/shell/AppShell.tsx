import { useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"

import { useAuth } from "../../contexts/AuthContext"
import Avatar from "../ui/Avatar"
import Badge from "../ui/Badge"
import Logo from "../ui/Logo"
import ChatWidget from "../support/ChatWidget"
import OnboardingTour from "../OnboardingTour"

interface NavItem {
    label: string
    to: string
    icon: React.ReactNode
    end?: boolean
}

function DashboardIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
    )
}

function CoursesIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
    )
}

function ClinicalsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
    )
}

function CarePlansIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
    )
}

function LibraryIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
        </svg>
    )
}

function SubmissionsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    )
}

function ProfileIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    )
}

function HelpIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
    )
}

function SubscribeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
    )
}

const navItems: NavItem[] = [
    { label: "Dashboard", to: "/dashboard", icon: <DashboardIcon />, end: true },
    { label: "Courses", to: "/courses", icon: <CoursesIcon /> },
    { label: "Clinicals", to: "/clinicals", icon: <ClinicalsIcon /> },
    { label: "Care Plans", to: "/careplans", icon: <CarePlansIcon /> },
    { label: "Library", to: "/library", icon: <LibraryIcon /> },
    { label: "My Submissions", to: "/my-submissions", icon: <SubmissionsIcon /> },
    { label: "Profile", to: "/profile", icon: <ProfileIcon /> },
    { label: "Help & Support", to: "/support", icon: <HelpIcon /> },
]

const mobileNavItems: NavItem[] = [
    { label: "Home", to: "/dashboard", icon: <DashboardIcon />, end: true },
    { label: "Courses", to: "/courses", icon: <CoursesIcon /> },
    { label: "Clinicals", to: "/clinicals", icon: <ClinicalsIcon /> },
    { label: "Plans", to: "/careplans", icon: <CarePlansIcon /> },
    { label: "Library", to: "/library", icon: <LibraryIcon /> },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [profileOpen, setProfileOpen] = useState(false)

    if (!user) return null

    const currentNav = navItems.find((item) =>
        item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to),
    )

    function handleLogout() {
        logout()
        navigate("/", { replace: true })
    }

    return (
        <div className="min-h-screen bg-surface">
            <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 border-r border-border bg-surface-subtle z-20">
                <div className="px-5 py-5 border-b border-border">
                    <Link to="/dashboard" aria-label="Dashboard">
                        <Logo size="md" />
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                                    ? "bg-brand-50 text-brand-800"
                                    : "text-on-surface-muted hover:text-on-surface hover:bg-surface-inset"
                                }`
                            }
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="px-3 pb-3">
                    {user.has_active_subscription ? (
                        <div className="rounded-lg border border-border bg-white p-3">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                                <p className="text-xs font-medium text-on-surface">Subscribed</p>
                            </div>
                            <p className="mt-1 text-xs text-on-surface-muted">
                                {user.subscription_expires_at
                                    ? `Active until ${new Date(user.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                    : "Active"}
                            </p>
                        </div>
                    ) : (
                        <Link to="/subscribe" className="block rounded-lg border border-brand-200 bg-brand-50 p-3 hover:bg-brand-100 transition-colors">
                            <p className="text-xs font-semibold text-brand-800">Unlock everything</p>
                            <p className="mt-1 text-xs text-brand-700">GHS 30 / semester</p>
                            <p className="mt-2 text-xs font-medium text-brand-600">Subscribe →</p>
                        </Link>
                    )}
                </div>

                <div className="border-t border-border px-3 py-3">
                    <div className="flex items-center gap-2">
                        <Avatar name={user.full_name} size="sm" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-on-surface">{user.full_name}</p>
                            <p className="truncate text-xs text-on-surface-muted">{user.level_display}</p>
                        </div>
                        <button onClick={handleLogout} className="rounded p-1 text-on-surface-muted hover:bg-surface-inset hover:text-on-surface" aria-label="Log out" title="Log out">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            <div className="lg:pl-60">
                <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-border">
                    <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-4">
                        <div className="lg:hidden">
                            <Link to="/dashboard" aria-label="Dashboard">
                                <Logo size="sm" />
                            </Link>
                        </div>
                        <div className="hidden lg:flex items-center gap-2.5">
                            {currentNav ? (
                                <>
                                    <span className="text-brand-600">{currentNav.icon}</span>
                                    <p className="text-caption text-on-surface-muted">{currentNav.label}</p>
                                </>
                            ) : (
                                <p className="text-caption text-on-surface-muted">NursifyGH</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 relative">
                            {!user.has_active_subscription && (
                                <Link to="/subscribe" className="hidden sm:block">
                                    <Badge variant="brand">
                                        <SubscribeIcon />
                                        <span className="ml-1">Subscribe</span>
                                    </Badge>
                                </Link>
                            )}
                            <Link to="/support" className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-muted hover:bg-surface-subtle hover:text-on-surface" aria-label="Help & Support" title="Help & Support">
                                <HelpIcon />
                            </Link>
                            <button onClick={() => setProfileOpen(!profileOpen)} className="relative" aria-label="User menu">
                                <Avatar name={user.full_name} size="sm" />
                            </button>
                            {profileOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                                    <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-border bg-white shadow-lg py-1">
                                        <div className="px-4 py-3 border-b border-border">
                                            <p className="text-sm font-medium text-on-surface truncate">{user.full_name}</p>
                                            <p className="text-xs text-on-surface-muted truncate">{user.email}</p>
                                        </div>
                                        <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-subtle" onClick={() => setProfileOpen(false)}>Profile</Link>
                                        <Link to="/my-submissions" className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-subtle" onClick={() => setProfileOpen(false)}>My Submissions</Link>
                                        <Link to="/support" className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-subtle" onClick={() => setProfileOpen(false)}>Help &amp; Support</Link>
                                        <button onClick={handleLogout} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-danger-700 hover:bg-surface-subtle">Log out</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="pb-20 lg:pb-0">
                    <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8">{children}</div>
                </main>
            </div>

            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-white">
                <div className="flex">
                    {mobileNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${isActive ? "text-brand-700" : "text-on-surface-muted hover:text-on-surface"}`
                            }
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            <ChatWidget />
            <OnboardingTour />
        </div>
    )
}