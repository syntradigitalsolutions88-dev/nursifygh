import { Link } from "react-router-dom"

import Logo from "../ui/Logo"

const SUPPORT_EMAIL = "syntradigitalsolutions88@gmail.com"

export default function Footer() {
    return (
        <footer className="border-t border-border bg-surface-subtle">
            <div className="container-page py-10">
                <div className="grid gap-8 md:grid-cols-4">
                    <div className="md:col-span-2">
                        <Logo size="md" />
                        <p className="mt-4 max-w-sm text-sm text-on-surface-muted">
                            The study platform built for Ghanaian nursing and midwifery
                            students. Practice past questions, build NANDA care plans, and
                            share them with your clinical instructors.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-caption mb-3">Product</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/" className="text-on-surface-muted hover:text-brand-700">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/register" className="text-on-surface-muted hover:text-brand-700">
                                    Create account
                                </Link>
                            </li>
                            <li>
                                <Link to="/login" className="text-on-surface-muted hover:text-brand-700">
                                    Log in
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-caption mb-3">Support</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/help" className="text-on-surface-muted hover:text-brand-700">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="text-on-surface-muted hover:text-brand-700">
                                    Contact us
                                </Link>
                            </li>
                            <li>
                                <a
                                    href={`mailto:${SUPPORT_EMAIL}`}
                                    className="text-on-surface-muted hover:text-brand-700 break-all"
                                >
                                    {SUPPORT_EMAIL}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 border-t border-border pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-muted">
                        <p>© {new Date().getFullYear()} NursifyGH. All rights reserved.</p>
                        <div className="flex gap-4">
                            <Link to="/privacy" className="hover:text-brand-700">
                                Privacy
                            </Link>
                            <Link to="/terms" className="hover:text-brand-700">
                                Terms
                            </Link>
                            <Link to="/about" className="hover:text-brand-700">
                                About
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}