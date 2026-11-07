import AppShell from "../components/shell/AppShell"

const SUPPORT_EMAIL = "syntradigitalsolutions88@gmail.com"
const SUPPORT_PHONE = "0556 025 786"
const SUPPORT_PHONE_TEL = "+233556025786"

/**
 * Contact page rendered inside the app shell (for logged-in users).
 */
export default function AppContactPage() {
    return (
        <AppShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-h1">Contact support</h1>
                    <p className="mt-2 text-body-sm text-on-surface-muted">
                        Our support team responds to every message within 24 hours.
                    </p>
                </div>

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
            </div>
        </AppShell>
    )
}