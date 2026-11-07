import { Link } from "react-router-dom"

import Footer from "../components/layout/Footer"
import PublicHeader from "../components/layout/PublicHeader"
import Button from "../components/ui/Button"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-surface">
            <PublicHeader />
            <main className="container-page py-12 lg:py-16 max-w-3xl">
                <h1 className="text-h1">About NursifyGH</h1>
                <p className="mt-3 text-body text-on-surface-muted">
                    A study platform built specifically for Ghanaian nursing and midwifery
                    students. No more scattered WhatsApp PDFs, no more unclear answers.
                    Just structured, curriculum-aligned content with explanations.
                </p>

                <section className="mt-12">
                    <h2 className="text-h2">Why we built this</h2>
                    <p className="mt-3 text-body-sm text-on-surface-muted">
                        Ghanaian nursing students currently rely on word-of-mouth past
                        papers, photocopied handouts, and outdated PDFs. There's no
                        centralized, curated, exam-aligned study resource. Learning happens
                        through WhatsApp groups, but nothing is structured for a full
                        semester.
                    </p>
                    <p className="mt-3 text-body-sm text-on-surface-muted">
                        NursifyGH changes that. It mirrors the NMC-mandated diploma
                        curriculum for RGN, RM, RPN, and CHN programs, with practice
                        questions modeled on the exact exams students sit for. Every
                        question includes a rationale explaining the answer — because
                        knowing "the answer is B" doesn't help you pass the next question.
                    </p>
                </section>

                <section className="mt-12">
                    <h2 className="text-h2">What we offer</h2>
                    <ul className="mt-3 space-y-3 text-body-sm text-on-surface-muted">
                        <li className="flex gap-3">
                            <span className="text-brand-600 text-lg">→</span>
                            <div>
                                <strong className="text-on-surface">NMC-aligned courses</strong>{" "}
                                — every course in the NMC diploma curriculum for your level and
                                program.
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-brand-600 text-lg">→</span>
                            <div>
                                <strong className="text-on-surface">
                                    Practice questions with rationales
                                </strong>{" "}
                                — hundreds of exam-style questions, every one with a written
                                explanation.
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-brand-600 text-lg">→</span>
                            <div>
                                <strong className="text-on-surface">
                                    NANDA care plan builder
                                </strong>{" "}
                                — build structured NCPs with SMART goals and enforced rationales.
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-brand-600 text-lg">→</span>
                            <div>
                                <strong className="text-on-surface">
                                    Share with your clinical instructor
                                </strong>{" "}
                                — generate a private link your instructor can open without an
                                account.
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-brand-600 text-lg">→</span>
                            <div>
                                <strong className="text-on-surface">
                                    Community care plan library
                                </strong>{" "}
                                — learn from care plans other students have shared publicly.
                            </div>
                        </li>
                    </ul>
                </section>

                <section className="mt-12">
                    <h2 className="text-h2">Pricing</h2>
                    <p className="mt-3 text-body-sm text-on-surface-muted">
                        A single <strong>semester pass</strong> costs{" "}
                        <strong className="text-on-surface">GHS 30</strong> for{" "}
                        <strong className="text-on-surface">120 days</strong> of full
                        access. One payment, no monthly charges. Pay with MTN MoMo, Vodafone
                        Cash, AirtelTigo Money, or card.
                    </p>
                </section>

                <section className="mt-12">
                    <h2 className="text-h2">Who we are</h2>
                    <p className="mt-3 text-body-sm text-on-surface-muted">
                        NursifyGH is built by a small team of developers and nursing
                        educators in Ghana. We're not a big corporation — we're students and
                        former students who understand the exact pain points of nursing
                        education in Ghana.
                    </p>
                </section>

                <section className="mt-12">
                    <h2 className="text-h2">Get in touch</h2>
                    <p className="mt-3 text-body-sm text-on-surface-muted">
                        Questions, feedback, or partnership ideas? We'd love to hear from
                        you.
                    </p>
                    <div className="mt-4 space-y-2 text-body-sm">
                        <p className="text-on-surface-muted">
                            <strong className="text-on-surface">Email:</strong>{" "}
                            <a
                                href="mailto:syntradigitalsolutions88@gmail.com"
                                className="text-brand-700 hover:underline"
                            >
                                syntradigitalsolutions88@gmail.com
                            </a>
                        </p>
                        <p className="text-on-surface-muted">
                            <strong className="text-on-surface">Phone:</strong>{" "}
                            <a
                                href="tel:+233556025786"
                                className="text-brand-700 hover:underline"
                            >
                                0556 025 786
                            </a>
                        </p>
                    </div>
                    <Link to="/contact" className="mt-6 inline-block">
                        <Button>Contact support</Button>
                    </Link>
                </section>
            </main>
            <Footer />
        </div>
    )
}