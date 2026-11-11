import { Link } from "react-router-dom"

import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Logo from "../components/ui/Logo"
import ChatWidget from "../components/support/ChatWidget"

const features = [
    {
        title: "Practice questions with rationales",
        description:
            "Real NMC-style questions with explanations for every answer. You'll see why each option is correct — not just the answer.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
        ),
    },
    {
        title: "Timed mock exams",
        description:
            "50 questions, 60 minutes. Same format as the actual NMC paper. See your score immediately after you submit.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        title: "Care plan drafting",
        description:
            "Build a NANDA care plan with AI assistance. Then transcribe it onto your official N&MC booklet. We help you draft; you submit on paper.",
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
        a: "Nursing and midwifery students in Ghana at Levels 100, 200, and 300 — including those preparing for NMC licensing exams.",
    },
    {
        q: "What courses are available?",
        a: "Fundamentals, Anatomy, Pharmacology, Medical-Surgical Nursing, Maternal & Child Health, Community Health, Mental Health, Midwifery, and more.",
    },
    {
        q: "How much does it cost?",
        a: "GHS 30 for a full 120-day semester pass. One payment. Full access. No monthly charges.",
    },
    {
        q: "Can I pay with Mobile Money?",
        a: "Yes — MTN MoMo, Telecel Cash, or AT Money. Send the payment to our MoMo number, submit the transaction ID, and we activate your account within 24 hours.",
    },
    {
        q: "Is NursifyGH an official NMC platform?",
        a: "No. NursifyGH is an independent study platform. It is not affiliated with, endorsed by, or connected to the Nursing and Midwifery Council (NMC) of Ghana. We are a study tool built by nursing students for nursing students.",
    },
]

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-surface">
            {/* ---- Disclaimer banner ---- */}
            <div className="bg-amber-50 border-b border-amber-200">
                <div className="container-page py-2 text-center">
                    <p className="text-xs text-amber-900">
                        <strong>Independent study tool.</strong> NursifyGH is not affiliated with or endorsed by the Nursing and Midwifery Council (NMC) of Ghana.
                    </p>
                </div>
            </div>

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
            <section className="container-page pt-16 pb-20 sm:pt-20 sm:pb-24 text-center">
                <Badge variant="brand" className="mx-auto mb-6">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    Free to register · GHS 30 per semester
                </Badge>

                <h1 className="text-display text-on-surface max-w-4xl mx-auto">
                    Practice NMC exam questions,
                    <br />
                    <span className="text-brand-700 italic">with the answers explained.</span>
                </h1>

                <p className="mt-6 max-w-2xl mx-auto text-body text-on-surface-muted">
                    Practice questions across all NMC subjects. Take timed mock exams.
                    Draft NANDA care plans. Built for Level 100–300 nursing and midwifery
                    students in Ghana.
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
                    Free to browse · GHS 30 unlocks the full semester
                </p>

                {/* Mock screenshot */}
                <div className="mt-16 relative">
                    <div className="absolute inset-x-8 top-8 -bottom-8 rounded-2xl bg-brand-900/5 blur-2xl" />
                    <div className="relative mx-auto max-w-4xl rounded-xl border border-border bg-white shadow-xl overflow-hidden">
                        <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-3">
                            <div className="h-3 w-3 rounded-full bg-red-400" />
                            <div className="h-3 w-3 rounded-full bg-amber-400" />
                            <div className="h-3 w-3 rounded-full bg-green-400" />
                            <span className="ml-4 text-xs text-on-surface-muted">
                                nursifygh-frontend.vercel.app/dashboard
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
                        <h2 className="text-h1">Three tools for studying.</h2>
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

            {/* ---- Pricing ---- */}
            <section id="pricing" className="border-t border-border bg-white">
                <div className="container-page py-20 sm:py-24">
                    <div className="text-center max-w-2xl mx-auto">
                        <p className="text-caption mb-3">Pricing</p>
                        <h2 className="text-h1">GHS 30 per semester.</h2>
                        <p className="mt-3 text-body text-on-surface-muted">
                            Pay once. Use it for 120 days. No monthly charges, no auto-renewal.
                        </p>
                    </div>

                    <div className="mt-14 max-w-md mx-auto">
                        <div className="rounded-2xl border-2 border-brand-700 bg-surface p-8 shadow-lg">
                            <div className="text-center">
                                <p className="text-h4 text-on-surface-muted">Semester Pass</p>
                                <div className="mt-6 flex items-baseline justify-center gap-1.5">
                                    <span className="text-sm font-medium text-on-surface-muted mb-1">GHS</span>
                                    <span className="text-display font-bold text-on-surface leading-none tracking-tight">30</span>
                                </div>
                                <p className="mt-2 text-sm text-on-surface-muted">120 days of full access</p>
                            </div>

                            <ul className="mt-8 space-y-3">
                                {[
                                    "All courses: Levels 100, 200, 300",
                                    "All practice questions with rationales",
                                    "Unlimited 60-minute mock exams",
                                    "AI-assisted NANDA care plan drafting",
                                    "N&MC-format transcription view",
                                    "Community care plan library",
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
                                Free to register · Pay when you're ready
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
                        <h2 className="text-h1">Common questions.</h2>
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
                        Ready to start practising?
                    </h2>
                    <p className="mt-4 text-brand-100 text-body max-w-xl mx-auto">
                        Create an account in under 2 minutes. Free to register. GHS 30 unlocks the full semester.
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
                            © 2026 NursifyGH · Independent study platform
                        </p>
                        <div className="flex gap-5 text-sm text-on-surface-muted">
                            <Link to="/login" className="hover:text-brand-700">Log in</Link>
                            <Link to="/register" className="hover:text-brand-700">Sign up</Link>
                        </div>
                    </div>
                    <p className="mt-6 text-xs text-on-surface-muted text-center max-w-3xl mx-auto leading-relaxed">
                        <strong>Legal notice:</strong> NursifyGH is an independent educational tool.
                        It is not affiliated with, endorsed by, or connected to the Nursing and
                        Midwifery Council (NMC) of Ghana, any nursing training college, or any
                        government body. All NMC/N&MC past questions and reference materials
                        are the property of their respective copyright holders and are used here
                        for educational purposes only. Students are responsible for verifying all
                        clinical content against their official curriculum before using it in
                        patient care.
                    </p>
                </div>
            </footer>

            <ChatWidget />
        </div>
    )
}