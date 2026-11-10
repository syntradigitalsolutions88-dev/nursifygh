import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/client"
import Button from "./ui/Button"
import { useAuth } from "../contexts/AuthContext"

const STEPS = [
    {
        title: "Welcome to NursifyGH",
        description:
            "The all-in-one study companion for Ghanaian nursing students. Let's take 60 seconds to show you around.",
        icon: "🎓",
        path: "/dashboard",
    },
    {
        title: "Your Dashboard",
        description:
            "Track your exam readiness score, study streak, and recent quiz activity. This is your home base.",
        icon: "📊",
        path: "/dashboard",
    },
    {
        title: "148 NMC Courses",
        description:
            "Practice 1,000+ questions across all four departments (RGN, RPN, RM, CHN). Every course is free to browse.",
        icon: "📚",
        path: "/courses",
    },
    {
        title: "Mock Exam Simulator",
        description:
            "Take a 60-minute, 50-question exam under real conditions. Auto-graded with instant feedback.",
        icon: "⏱️",
        path: "/mock-exam",
    },
    {
        title: "AI Care Plans",
        description:
            "Describe any clinical scenario → the AI drafts a complete N&MC-format NCP with NANDA codes, 3 goals, and 3 interventions.",
        icon: "🤖",
        path: "/careplans",
    },
    {
        title: "Clinical Tracker",
        description:
            "Log every procedure you perform with hospital, ward, and supervisor. Ready to transcribe into your N&MC booklet.",
        icon: "🩺",
        path: "/clinicals",
    },
    {
        title: "You're all set!",
        description:
            "Start with your first course or subscribe to unlock everything. Have questions? Use the chat widget anytime.",
        icon: "✅",
        path: "/dashboard",
    },
]

export default function OnboardingTour() {
    const { user, refreshUser } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState(0)
    const navigate = useNavigate()

    useEffect(() => {
        if (user && !user.has_seen_tour) {
            // Show tour on next tick after page renders
            const t = setTimeout(() => setIsOpen(true), 800)
            return () => clearTimeout(t)
        }
    }, [user])

    if (!isOpen || !user) return null

    const current = STEPS[step]
    const isLast = step === STEPS.length - 1
    const progress = ((step + 1) / STEPS.length) * 100

    async function finishTour() {
        try {
            await api.patch("/accounts/me/", { has_seen_tour: true })
            await refreshUser()
        } catch {
            /* non-fatal */
        }
        setIsOpen(false)
    }

    function next() {
        if (isLast) return finishTour()
        setStep((s) => s + 1)
    }

    function prev() {
        if (step > 0) setStep((s) => s - 1)
    }

    function skip() {
        finishTour()
    }

    function goToStep() {
        navigate(current.path)
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-gray-200">
                    <div
                        className="h-full bg-brand-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="text-center">
                        <div className="text-5xl mb-4">{current.icon}</div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                            Step {step + 1} of {STEPS.length}
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                            {current.title}
                        </h2>
                        <p className="text-sm text-gray-700 leading-relaxed mb-4">
                            {current.description}
                        </p>

                        <button
                            onClick={goToStep}
                            className="text-xs font-medium text-brand-700 hover:underline"
                        >
                            Visit this page →
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={skip}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                        Skip tour
                    </button>

                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <Button variant="secondary" size="sm" onClick={prev}>
                                ← Back
                            </Button>
                        )}
                        <Button size="sm" onClick={next}>
                            {isLast ? "Get started →" : "Next →"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}