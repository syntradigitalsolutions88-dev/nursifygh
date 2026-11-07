import Footer from "../components/layout/Footer"
import PublicHeader from "../components/layout/PublicHeader"

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-surface">
            <PublicHeader />
            <main className="container-page py-12 lg:py-16 max-w-3xl">
                <h1 className="text-h1">Privacy Policy</h1>
                <p className="mt-2 text-body-sm text-on-surface-muted">
                    Last updated: November 2026
                </p>

                <div className="mt-10 prose prose-sm max-w-none text-on-surface space-y-6">
                    <section>
                        <h2 className="text-h3">What we collect</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            When you create a NursifyGH account, we collect:
                        </p>
                        <ul className="mt-3 space-y-1 text-body-sm text-on-surface-muted list-disc pl-6">
                            <li>Your email address (used for login and account recovery)</li>
                            <li>Your full name</li>
                            <li>Your phone number (used for Mobile Money payments)</li>
                            <li>Your academic level and nursing program</li>
                            <li>Your institution name</li>
                            <li>Your password (stored as a secure hash — we never see the original)</li>
                        </ul>
                        <p className="text-body-sm text-on-surface-muted mt-3">
                            When you use the platform, we also collect:
                        </p>
                        <ul className="mt-3 space-y-1 text-body-sm text-on-surface-muted list-disc pl-6">
                            <li>Your quiz attempts, scores, and answers</li>
                            <li>Care plans you create (including SMART goals and interventions)</li>
                            <li>Payment references from Paystack (not your card or MoMo details)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-h3">How we use your data</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            We use your data to:
                        </p>
                        <ul className="mt-3 space-y-1 text-body-sm text-on-surface-muted list-disc pl-6">
                            <li>Operate your account and deliver content</li>
                            <li>Process subscription payments</li>
                            <li>Show you courses matched to your level and program</li>
                            <li>Display your quiz history and care plans to you</li>
                            <li>Allow you to share care plans with instructors via secure links</li>
                        </ul>
                        <p className="text-body-sm text-on-surface-muted mt-3">
                            <strong>We never sell your data.</strong> We do not share your
                            information with third parties except where required to provide
                            the service (e.g., Paystack for payments).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-h3">Third-party services</h2>
                        <ul className="mt-3 space-y-1 text-body-sm text-on-surface-muted list-disc pl-6">
                            <li><strong>Paystack</strong> — processes Mobile Money and card payments. Paystack is PCI-DSS Level 1 certified and handles all card and MoMo data.</li>
                            <li><strong>Hosting provider</strong> — stores our databases and serves the application.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-h3">Your rights</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            You can request a copy of your data, update your profile, or delete
                            your account at any time by emailing{" "}
                            <a href="mailto:syntradigitalsolutions88@gmail.com" className="text-brand-700 hover:underline">
                                syntradigitalsolutions88@gmail.com
                            </a>
                            .
                        </p>
                    </section>

                    <section>
                        <h2 className="text-h3">Contact</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            Questions about privacy? Email{" "}
                            <a href="mailto:syntradigitalsolutions88@gmail.com" className="text-brand-700 hover:underline">
                                syntradigitalsolutions88@gmail.com
                            </a>{" "}
                            or call{" "}
                            <a href="tel:+233556025786" className="text-brand-700 hover:underline">
                                0556 025 786
                            </a>
                            .
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    )
}