import Footer from "../components/layout/Footer"
import PublicHeader from "../components/layout/PublicHeader"

const SUPPORT_EMAIL = "syntradigitalsolutions88@gmail.com"
const SUPPORT_PHONE = "0556 025 786"
const SUPPORT_PHONE_TEL = "+233556025786"

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-surface">
            <PublicHeader />

            <main className="container-page py-12 lg:py-16 max-w-3xl">
                <h1 className="text-h1">Contact us</h1>
                <p className="mt-3 text-body text-on-surface-muted">
                    Our support team responds to every message within 24 hours. Here's how
                    to reach us.
                </p>

                <div className="mt-10 space-y-6">
                    {/* Email */}
                    <div className="rounded-xl border border-border bg-white p-6">
                        <h2 className="text-h4">Email support</h2>
                        <p className="mt-2 text-sm text-on-surface-muted">
                            The fastest way to reach us. Include your registered email address
                            and a description of your issue.
                        </p>
                        <a
                            href={`mailto:${SUPPORT_EMAIL}`}
                            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-medium text-white hover:bg-brand-800"
                        >
                            Email {SUPPORT_EMAIL}
                        </a>
                    </div>

                    {/* Phone */}
                    <div className="rounded-xl border border-border bg-white p-6">
                        <h2 className="text-h4">Call or WhatsApp</h2>
                        <p className="mt-2 text-sm text-on-surface-muted">
                            For urgent payment or account access issues, call or send a
                            WhatsApp message during working hours.
                        </p>
                        <a
                            href={`tel:${SUPPORT_PHONE_TEL}`}
                            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-white px-5 text-sm font-medium text-on-surface hover:border-brand-300"
                        >
                            {SUPPORT_PHONE}
                        </a>
                    </div>

                    {/* What to include */}
                    <div className="rounded-xl border border-border bg-white p-6">
                        <h2 className="text-h4">What to include in your message</h2>
                        <ul className="mt-3 space-y-2 text-sm text-on-surface-muted">
                            <li className="flex gap-2">
                                <span className="text-brand-600">•</span>
                                <span>Your registered email address</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-600">•</span>
                                <span>The date and time you experienced the issue</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-600">•</span>
                                <span>A description of what you were trying to do</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-600">•</span>
                                <span>Any error message you saw (screenshot if possible)</span>
                            </li>
                        </ul>
                    </div>

                    {/* Response times */}
                    <div className="rounded-xl border border-border bg-white p-6">
                        <h2 className="text-h4">Response times</h2>
                        <ul className="mt-3 space-y-2 text-sm">
                            <li className="flex justify-between">
                                <span className="text-on-surface-muted">General questions</span>
                                <span className="font-medium text-on-surface">Within 24 hours</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-on-surface-muted">Payment issues</span>
                                <span className="font-medium text-on-surface">Within 12 hours</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-on-surface-muted">Account access</span>
                                <span className="font-medium text-on-surface">Within 24 hours</span>
                            </li>
                        </ul>
                    </div>

                    {/* Quick links */}
                    <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
                        <h2 className="text-h4 text-brand-900">Before you email us</h2>
                        <p className="mt-2 text-sm text-brand-800">
                            Most questions are answered in our Help Center.
                        </p>
                        <a
                            href="/help"
                            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
                        >
                            Browse Help Center →
                        </a>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}