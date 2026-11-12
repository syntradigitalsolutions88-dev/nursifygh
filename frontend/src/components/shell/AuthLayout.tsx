import { Link } from "react-router-dom"
import Logo from "../ui/Logo"

interface AuthLayoutProps {
    children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-white flex">
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px] lg:px-12 xl:px-20 border-r border-border bg-white z-10 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                <div className="mx-auto w-full max-w-sm">
                    <div className="mb-10">
                        <Link to="/" aria-label="NursifyGH home">
                            <Logo size="md" />
                        </Link>
                    </div>

                    {children}

                    <div className="mt-12 text-center text-xs text-on-surface-muted">
                        © 2026 NursifyGH. All rights reserved.
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex flex-1 relative bg-brand-900 overflow-hidden items-center justify-center p-12">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-brand-800 blur-3xl opacity-50" />
                    <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-brand-700 blur-3xl opacity-30" />
                </div>

                <div className="relative z-10 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-medium mb-8">
                        <span className="h-2 w-2 rounded-full bg-green-400"></span>
                        Trusted by nursing students across Ghana
                    </div>

                    <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-6">
                        The smartest way to prepare for your N&MC licensing exams.
                    </h2>

                    <p className="text-brand-100 text-lg mb-10 leading-relaxed">
                        Practice questions, mock exams, and clinical tracking — all in one place.
                    </p>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
                        <div className="flex items-center gap-1 text-yellow-400 mb-3">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            ))}
                        </div>
                        <p className="text-white text-sm leading-relaxed mb-4">
                            "The mock exams are exactly like the real thing. The clinical tracker also saved me hours on my N&MC logbook."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
                                AM
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Ama Mensah</p>
                                <p className="text-xs text-brand-200">Level 300, RGN</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}