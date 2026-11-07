import Footer from "../components/layout/Footer"
import PublicHeader from "../components/layout/PublicHeader"

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-surface">
            <PublicHeader />
            <main className="container-page py-12 lg:py-16 max-w-3xl">
                <h1 className="text-h1">Terms of Service</h1>
                <p className="mt-2 text-body-sm text-on-surface-muted">
                    Last updated: November 2026
                </p>

                <div className="mt-10 prose prose-sm max-w-none text-on-surface space-y-6">
                    <section>
                        <h2 className="text-h3">1. Acceptance of terms</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            By creating a NursifyGH account, you agree to these terms. If you
                            do not agree, do not use the platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-h3">2. Who can use NursifyGH</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            NursifyGH is intended for nursing and midwifery students enrolled
                            at Ghanaian training colleges or universities. You must be at
                            least 16 years old to create an account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-h3">3. Subscription</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            A <strong>semester pass</strong> costs <strong>GHS 30</strong> and
                            grants 120 days of access to courses, quizzes, and care plan
                            features. Passes are non-refundable once activated. Renewal is
                            available any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-h3">4. Acceptable use</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            You agree not to:
                        </p>
                        <ul className="mt-3 space-y-1 text-body-sm text-on-surface-muted list-disc pl-6">
                            <li>Share your account credentials with others</li>
                            <li>Scrape, copy, or redistribute NursifyGH content</li>
                            <li>Use the platform for any illegal purpose</li>
                            <li>Attempt to gain unauthorized access to other accounts</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-h3">5. Content and accuracy</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            NursifyGH content is created for study purposes and may contain
                            errors. Always verify clinical information against current NMC
                            guidelines, your institution's curriculum, and clinical
                            supervision before applying it in patient care.
                        </p>
                        <p className="text-body-sm text-on-surface-muted mt-3">
                            <strong>NursifyGH is a study tool, not a clinical decision-support
                                system.</strong> We are not liable for clinical outcomes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-h3">6. Account suspension</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            We may suspend or delete accounts that violate these terms,
                            without notice or refund.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-h3">7. Contact</h2>
                        <p className="text-body-sm text-on-surface-muted mt-2">
                            Questions? Email{" "}
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