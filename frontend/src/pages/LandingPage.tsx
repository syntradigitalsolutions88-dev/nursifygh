import { Link } from "react-router-dom"

import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Logo from "../components/ui/Logo"
import ChatWidget from "../components/support/ChatWidget"

const features = [
    {
        title: "NMC-Style Questions",
        description: "Practice real exam questions with detailed rationales for every option. You'll understand why an answer is correct.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
        ),
    },
    {
        title: "Timed Mock Exams",
        description: "Simulate the real N&MC paper. 50 questions, 60 minutes, instant scoring, and a breakdown of your weakest areas.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        title: "Clinical Logbook Tracker",
        description: "Log your procedures, hospitals, and supervisors. Tailored specifically to your program (RGN, RM, RPN, CHN) for easy N&MC transcription.",
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
        <div className="min-h-screen bg-white">
            <div className="bg-brand-950 border-b border-brand-900">
                <div className="container-page py-2 text-center">
                    <p className="text-[11px] font-medium text-brand-200 uppercase tracking-wide">
                        Independent study tool. Not affiliated with or endorsed by the Nursing and Midwifery Council (NMC) of Ghana.
                    </p>
                </div>
            </div>

            <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-40">
                <div className="container-page flex items-center justify-between py-4">
                    <Link to="/" aria-label="NursifyGH home">
                        <Logo size="md" />
                    </Link>
                    <nav className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="hidden sm:inline-flex h-10 items-center px-4 text-sm font-semibold text-on-surface-muted hover:text-brand-700 transition-colors"
                        >
                            Log in
                        </Link>
                        <Link to="/register">
                            <Button size="md" className="shadow-md shadow-brand-500/20">Get Started</Button>
                        </Link>
                    </nav>
                </div>
            </header>

            <section className="relative overflow-hidden bg-brand-950 pt-24 pb-32">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-800/30 blur-3xl" />
                    <div className="absolute top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-600/20 blur-3xl" />
                </div>

                <div className="container-page relative z-10 text-center">
                    <Badge variant="brand" className="mx-auto mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        Trusted by students at Korle Bu, Komfo Anokye, and 37 Military Hospital
                    </Badge>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight max-w-4xl mx-auto leading-[1.1]">
                        Ace your N&MC exams with <span className="text-brand-400">confidence.</span>
                    </h1>

                    <p className="mt-6 max-w-2xl mx-auto text-lg text-brand-100/80 leading-relaxed">
                        Practice thousands of NMC-style questions, simulate the real licensing exam, and track your clinical logbook. Built exclusively for Ghanaian nursing and midwifery students.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/register">
                            <Button size="lg" className="!bg-brand-500 hover:!bg-brand-400 !text-brand-950 font-bold px-8 h-14 text-base shadow-lg shadow-brand-500/25">
                                Start studying for free
                            </Button>
                        </Link>
                        <a
                            href="#pricing"
                            className="inline-flex h-14 items-center px-6 text-base font-semibold text-white hover:text-brand-300 transition-colors"
                        >
                            See pricing →
                        </a>
                    </div>

                    <div className="mt-20 relative mx-auto max-w-5xl">
                        <div className="absolute inset-x-12 top-12 -bottom-12 rounded-3xl bg-brand-500/20 blur-3xl" />
                        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm shadow-2xl">
                            <div className="rounded-xl overflow-hidden bg-white ring-1 ring-white/10">
                                <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-3">
                                    <div className="h-3 w-3 rounded-full bg-red-400" />
                                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                                    <div className="h-3 w-3 rounded-full bg-green-400" />
                                    <span className="ml-4 text-xs font-medium text-on-surface-muted">
                                        app.nursifygh.com/dashboard
                                    </span>
                                </div>
                                <div className="p-6 sm:p-10 text-left bg-white">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Good morning, Ama</p>
                                            <p className="mt-1 text-2xl font-bold text-gray-900">Your Level 300 Dashboard</p>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">A</div>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-xl border border-border bg-surface p-5">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Readiness</p>
                                            <p className="mt-2 text-3xl font-black text-brand-700">74%</p>
                                            <div className="mt-3 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-brand-500 rounded-full w-[74%]"></div></div>
                                        </div>
                                        <div className="rounded-xl border border-border bg-surface p-5">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Average Score</p>
                                            <p className="mt-2 text-3xl font-black text-brand-700">68%</p>
                                            <p className="text-xs text-gray-400 mt-2">Across 12 attempts</p>
                                        </div>
                                        <div className="rounded-xl border border-border bg-surface p-5">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clinical Logs</p>
                                            <p className="mt-2 text-3xl font-black text-gray-900">142</p>
                                            <p className="text-xs text-gray-400 mt-2">Ready for N&MC submission</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-gray-50">
                <div className="container-page">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Everything you need to pass.</h2>
                        <p className="mt-4 text-lg text-gray-600">
                            We built the tools we wished we had when we were in nursing school.
                        </p>
                    </div>

                    <div className="grid gap-8 sm:grid-cols-3">
                        {features.map((f) => (
                            <div key={f.title} className="rounded-2xl border border-border bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 mb-6">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{f.title}</h3>
                                <p className="mt-3 text-base text-gray-600 leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="pricing" className="py-24 bg-white relative">
                <div className="container-page">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Simple, student-friendly pricing.</h2>
                        <p className="mt-4 text-lg text-gray-600">One payment. Full access for the entire semester. No hidden fees.</p>
                    </div>

                    <div className="max-w-md mx-auto">
                        <div className="rounded-3xl border-2 border-brand-600 bg-white p-8 shadow-2xl shadow-brand-500/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">MOST POPULAR</div>
                            <div className="text-center pb-8 border-b border-gray-100">
                                <p className="text-sm font-bold text-brand-600 uppercase tracking-widest">Semester Pass</p>
                                <div className="mt-4 flex items-baseline justify-center gap-1">
                                    <span className="text-xl font-semibold text-gray-500">GHS</span>
                                    <span className="text-6xl font-black text-gray-900 tracking-tighter">30</span>
                                </div>
                                <p className="mt-2 text-sm font-medium text-gray-500">One-time payment · 120 days access</p>
                            </div>

                            <ul className="mt-8 space-y-4">
                                {[
                                    "All courses: Levels 100, 200, 300",
                                    "Thousands of NMC-style questions",
                                    "Detailed rationales for every answer",
                                    "Unlimited 60-minute mock exams",
                                    "Program-specific Clinical Logbook",
                                    "AI-assisted NANDA Care Plans",
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-3 text-sm font-medium text-gray-700">
                                        <div className="rounded-full bg-brand-100 p-1 mt-0.5">
                                            <svg className="h-3 w-3 text-brand-700" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <Link to="/register" className="mt-8 block">
                                <Button size="lg" fullWidth className="h-14 text-base shadow-lg shadow-brand-500/25">
                                    Get Started Now
                                </Button>
                            </Link>
                            <p className="mt-4 text-center text-xs font-medium text-gray-400">
                                Free to register · Pay when you're ready to study
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-gray-50 border-t border-gray-100">
                <div className="container-page max-w-3xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Frequently asked questions</h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq) => (
                            <details
                                key={faq.q}
                                className="group rounded-xl border border-border bg-white p-6 shadow-sm [&_summary::-webkit-details-marker]:hidden"
                            >
                                <summary className="flex cursor-pointer items-center justify-between gap-4">
                                    <span className="text-base font-bold text-gray-900">{faq.q}</span>
                                    <svg className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </summary>
                                <p className="mt-4 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="bg-brand-950 pt-16 pb-8">
                <div className="container-page">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-12 border-b border-brand-900">
                        <Logo size="md" showWordmark={true} className="brightness-0 invert" />
                        <div className="flex gap-6 text-sm font-medium text-brand-200">
                            <Link to="/login" className="hover:text-white transition-colors">Log in</Link>
                            <Link to="/register" className="hover:text-white transition-colors">Sign up</Link>
                        </div>
                    </div>
                    <div className="pt-8 text-center md:text-left">
                        <p className="text-xs text-brand-400 max-w-4xl leading-relaxed">
                            <strong className="text-brand-200">Legal notice:</strong> NursifyGH is an independent educational tool.
                            It is not affiliated with, endorsed by, or connected to the Nursing and
                            Midwifery Council (NMC) of Ghana, any nursing training college, or any
                            government body. All NMC/N&MC past questions and reference materials
                            are the property of their respective copyright holders and are used here
                            for educational purposes only. Students are responsible for verifying all
                            clinical content against their official curriculum before using it in
                            patient care.
                        </p>
                        <p className="mt-4 text-xs text-brand-500">
                            © 2026 NursifyGH. Built for Ghanaian nursing students.
                        </p>
                    </div>
                </div>
            </footer>

            <ChatWidget />
        </div>
    )
}
