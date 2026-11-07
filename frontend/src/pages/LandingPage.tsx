import { Link } from "react-router-dom"

import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Logo from "../components/ui/Logo"
import ChatWidget from "../components/support/ChatWidget"

const features = [
    {
        title: "Past questions, decoded",
        description:
            "Hundreds of real NTC-style questions with detailed rationales — so you learn why, not just what.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
        ),
    },
    {
        title: "Timed mock exams",
        description:
            "Practice under real exam conditions. See your score, spot your weak topics, and improve.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        title: "NANDA care plans",
        description:
            "Build professional NCPs with SMART goals and evidence-based rationales. Share with your clinical instructor via WhatsApp.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
        ),
    },
]

const faqs = [
    {
        q: "Who is NursifyGH for?",
        a: "Nursing and midwifery students in Ghana at Levels 100, 200, and 300 — including those preparing for NTC licensing exams.",
    },
    {
        q: "What courses are available?",
        a: "Courses covering Fundamentals, Anatomy, Pharmacology, Medical-Surgical Nursing, Maternal & Child Health, Community Health, Mental Health, Midwifery, and more. New courses are added every semester.",
    },
    {
        q: "How much does it cost?",
        a: "GHS 30 for a full 120-day semester pass. One payment. Full access. No monthly charges.",
    },
    {
        q: "Can I pay with Mobile Money?",
        a: "Yes — we accept MTN MoMo, Vodafone Cash, and AirtelTigo Money via Paystack. Cards also work.",
    },
    {
        q: "Can my lecturer see my care plans?",
        a: "Yes. Every care plan has a Share button that generates a private link. Send it to your clinical instructor — no account needed on their end.",
    },
]

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-surface">
            {/* ---- Nav ---- */}
            <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
                <div className="container-page flex items-center justify-between py-4">
                    <Link to="/" aria-label="NursifyGH home">
                        <Logo size="md" />
                    </Link>
                    <nav className="flex items-center gap-2">
                        <Link
                            to="/login"
                            className="hidden sm:inline-flex h-10 items-center px-4 text-sm font-medium text-on-surface hover:text-brand-700 rounded-lg hover:bg-surface-subtle transition-colors"
                        >
                            Log in
                        </Link>
                        <Link to="/register">
                            <Button size="md">Start studying free</Button>
                        </Link>
                    </nav>
                </div>
            </header>

            {/* ---- Hero ---- */}
            <section className="container-page pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
                <Badge variant="brand" className="mx-auto mb-6">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                    Now accepting students for 2026/27
                </Badge>

                <h1 className="text-display text-on-surface max-w-4xl mx-auto">
                    Pass your NTC exams
                    <br />
                    <span className="text-brand-700 italic">with confidence.</span>
                </h1>

                <p className="mt-6 max-w-2xl mx-auto text-body text-on-surface-muted">
                    Past questions, timed mock exams, and professional NANDA care plans —
                    all built for Ghanaian nursing and midwifery students. Study less.
                    Score higher.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link to="/register">
                        <Button size="lg">Create your free account →</Button>
                    </Link>
                    <a
                        href="#pricing"
                        className="inline-flex h-12 items-center px-6 text-base font-medium text-on-surface hover:text-brand-700 transition-colors"
                    >
                        See pricing
                    </a>
                </div>

                <p className="mt-6 text-caption">
                    GHS 30 per semester · No card required to start
                </p>

                {/* Mock screenshot / preview */}
                <div className="mt-16 relative">
                    <div className="absolute inset-x-8 top-8 -bottom-8 rounded-2xl bg-brand-900/5 blur-2xl" />
                    <div className="relative mx-auto max-w-4xl rounded-xl border border-border bg-white shadow-xl overflow-hidden">
                        <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-3">
                            <div className="h-3 w-3 rounded-full bg-red-400" />
                            <div className="h-3 w-3 rounded-full bg-amber-400" />
                            <div className="h-3 w-3 rounded-full bg-green-400" />
                            <span className="ml-4 text-xs text-on-surface-muted">
                                nursifygh.com/dashboard
                            </span>
                        </div>
                        <div className="p-6 sm:p-10 text-left">
                            <p className="text-caption">Good morning, Ama</p>
                            <p className="mt-1 text-h2">Your Level 200 dashboard</p>
                            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-lg border border-border bg-surface p-4">
                                    <p className="text-caption">Subscription</p>
                                    <p className="mt-1 text-h3 text-success-700">Active</p>
                                    <p className="text-xs text-on-surface-muted mt-1">Until Mar 2027</p>
                                </div>
                                <div className="rounded-lg border border-border bg-surface p-4">
                                    <p className="text-caption">Quiz average</p>
                                    <p className="mt-1 text-h3 text-brand-700">74%</p>
                                    <p className="text-xs text-on-surface-muted mt-1">Across 12 attempts</p>
                                </div>
                                <div className="rounded-lg border border-border bg-surface p-4">
                                    <p className="text-caption">Care plans</p>
                                    <p className="mt-1 text-h3 text-on-surface">3</p>
                                    <p className="text-xs text-on-surface-muted mt-1">2 shared</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---- Features ---- */}
            <section className="border-t border-border bg-white">
                <div className="container-page py-20 sm:py-24">
                    <div className="text-center max-w-2xl mx-auto">
                        <p className="text-caption mb-3">What you get</p>
                        <h2 className="text-h1">Everything you need to graduate.</h2>
                        <p className="mt-3 text-body text-on-surface-muted">
                            Purpose-built for the Ghanaian nursing curriculum — not a generic
                            quiz app.
                        </p>
                    </div>

                    <div className="mt-14 grid gap-6 sm:grid-cols-3">
                        {features.map((f) => (
                            <div
                                key={f.title}
                                className="rounded-xl border border-border bg-surface p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                    {f.icon}
                                </div>
                                <h3 className="mt-5 text-h4">{f.title}</h3>
                                <p className="mt-2 text-body-sm text-on-surface-muted">
                                    {f.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- Trust ---- */}
            <section className="border-t border-border">
                <div className="container-page py-16 text-center">
                    <p className="text-caption mb-4">Built for students at</p>
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-on-surface-muted">
                        <span className="text-sm font-medium">Korle Bu NTC</span>
                        <span className="text-sm font-medium">37 Military Hospital NTC</span>
                        <span className="text-sm font-medium">Komfo Anokye NTC</span>
                        <span className="text-sm font-medium">Tamale NTC</span>
                        <span className="text-sm font-medium">Cape Coast NTC</span>
                    </div>
                </div>
            </section>

            {/* ---- Pricing ---- */}
            <section id="pricing" className="border-t border-border bg-white">
                <div className="container-page py-20 sm:py-24">
                    <div className="text-center max-w-2xl mx-auto">
                        <p className="text-caption mb-3">Simple pricing</p>
                        <h2 className="text-h1">One payment. Full semester.</h2>
                        <p className="mt-3 text-body text-on-surface-muted">
                            No subscriptions, no monthly charges. Pay once, use it for the whole
                            semester.
                        </p>
                    </div>

                    <div className="mt-14 max-w-md mx-auto">
                        <div className="rounded-2xl border-2 border-brand-700 bg-surface p-8 shadow-lg relative">
                            <Badge variant="brand" className="absolute -top-3 left-1/2 -translate-x-1/2">
                                Most students choose this
                            </Badge>

                            <div className="text-center">
                                <p className="text-h4 text-on-surface-muted">Semester Pass</p>
                                <div className="mt-6 flex items-baseline justify-center gap-1.5">
                                    <span className="text-sm font-medium text-on-surface-muted mb-1">GHS</span>
                                    <span className="text-display font-bold text-on-surface leading-none tracking-tight">30</span>
                                </div>
                            </div>

                            <ul className="mt-8 space-y-3">
                                {[
                                    "All courses across Levels 100, 200, 300",
                                    "Hundreds of past questions with rationales",
                                    "Timed mock exams and instant scoring",
                                    "NANDA care plan builder with SMART goals",
                                    "Share care plans with clinical instructors",
                                    "Community library of peer care plans",
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm">
                                        <svg
                                            className="h-5 w-5 shrink-0 text-brand-600"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="text-on-surface">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link to="/register" className="mt-8 block">
                                <Button size="lg" fullWidth>
                                    Create your account
                                </Button>
                            </Link>
                            <p className="mt-4 text-center text-xs text-on-surface-muted">
                                Register free · Pay only when you're ready
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---- FAQ ---- */}
            <section className="border-t border-border">
                <div className="container-page py-20 sm:py-24 max-w-3xl">
                    <div className="text-center mb-12">
                        <p className="text-caption mb-3">Questions</p>
                        <h2 className="text-h1">Everything you need to know.</h2>
                    </div>

                    <div className="space-y-3">
                        {faqs.map((faq) => (
                            <details
                                key={faq.q}
                                className="group rounded-lg border border-border bg-white p-5 [&_summary::-webkit-details-marker]:hidden"
                            >
                                <summary className="flex cursor-pointer items-center justify-between">
                                    <span className="text-h4">{faq.q}</span>
                                    <svg
                                        className="h-5 w-5 shrink-0 text-on-surface-muted transition-transform group-open:rotate-180"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </summary>
                                <p className="mt-3 text-body-sm text-on-surface-muted">{faq.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- Final CTA ---- */}
            <section className="border-t border-border bg-brand-900 text-white">
                <div className="container-page py-20 text-center">
                    <h2 className="text-display max-w-2xl mx-auto">
                        Ready to sharpen your nursing school?
                    </h2>
                    <p className="mt-4 text-brand-100 text-body max-w-xl mx-auto">
                        Join Ghanaian nursing students who study smarter with NursifyGH.
                    </p>
                    <Link to="/register" className="mt-8 inline-block">
                        <Button size="lg" className="bg-white !text-brand-900 hover:bg-brand-50">
                            Create your free account →
                        </Button>
                    </Link>
                </div>
            </section>

            {/* ---- Footer ---- */}
            <footer className="border-t border-border bg-surface">
                <div className="container-page py-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <Logo size="sm" />
                        <p className="text-caption">
                            © 2026 NursifyGH · Made for Ghanaian nursing students
                        </p>
                        <div className="flex gap-5 text-sm text-on-surface-muted">
                            <Link to="/login" className="hover:text-brand-700">
                                Log in
                            </Link>
                            <Link to="/register" className="hover:text-brand-700">
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* AI Chatbot — floats on every page */}
            <ChatWidget />
        </div>
    )
}