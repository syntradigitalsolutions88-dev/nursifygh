import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import api from "../api/client"
import Button from "../components/ui/Button"

export default function MockExamPage() {
    const navigate = useNavigate()
    const [timeLeft, setTimeLeft] = useState(60 * 60) // 60 minutes in seconds
    const [currentQIndex, setCurrentQIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch 50 random questions
    const { data: exam, isLoading, error } = useQuery({
        queryKey: ["mock-exam"],
        queryFn: async () => {
            const res = await api.get("/academics/quizzes/mock-exam/")
            return res.data
        },
    })

    // Timer logic
    useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit()
            return
        }
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
        return () => clearInterval(timer)
    }, [timeLeft])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? "0" : ""}${s}`
    }

    const handleSelect = (questionId: string, choiceId: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: choiceId }))
    }

    const handleSubmit = async () => {
        if (isSubmitting) return // Prevent double submission
        setIsSubmitting(true)

        try {
            const res = await api.post("/academics/quizzes/mock-exam/submit/", {
                answers: answers
            })
            // Navigate to results page with the attempt ID
            navigate(`/quizzes/results/${res.data.attempt_id}`)
        } catch (err) {
            alert("Failed to submit exam. Please check your internet and try again.")
            setIsSubmitting(false)
        }
    }

    if (isLoading) return <div className="p-10 text-center">Loading your exam...</div>
    if (error || !exam) return <div className="p-10 text-center text-red-500">Failed to load exam.</div>

    const currentQuestion = exam.questions[currentQIndex]

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Focus Mode Header */}
            <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-bold text-brand-900">{exam.title}</h1>
                    <p className="text-sm text-on-surface-muted">Question {currentQIndex + 1} of {exam.total_questions}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
                        ⏱ {formatTime(timeLeft)}
                    </div>
                    <Button variant="secondary" onClick={() => navigate("/dashboard")}>Exit Exam</Button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-gray-200">
                <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${((currentQIndex + 1) / exam.total_questions) * 100}%` }}></div>
            </div>

            {/* Question Area */}
            <div className="flex-1 max-w-4xl w-full mx-auto p-6 mt-8">
                <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
                    <h2 className="text-xl font-medium text-on-surface mb-8 leading-relaxed">
                        {currentQuestion.text}
                    </h2>
                    <div className="space-y-3">
                        {currentQuestion.choices.map((choice: any) => (
                            <button
                                key={choice.id}
                                onClick={() => handleSelect(currentQuestion.id, choice.id)}
                                className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${answers[currentQuestion.id] === choice.id
                                        ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                                        : "border-border hover:border-brand-300 hover:bg-gray-50"
                                    }`}
                            >
                                <span className="font-semibold text-brand-700 mr-3">{String.fromCharCode(65 + choice.position)}.</span>
                                {choice.text}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-6">
                    <Button
                        variant="secondary"
                        disabled={currentQIndex === 0}
                        onClick={() => setCurrentQIndex((prev) => prev - 1)}
                    >
                        ← Previous
                    </Button>

                    {currentQIndex === exam.total_questions - 1 ? (
                        <Button
                            onClick={handleSubmit}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Grading..." : "Submit Exam ✓"}
                        </Button>
                    ) : (
                        <Button onClick={() => setCurrentQIndex((prev) => prev + 1)}>Next Question →</Button>
                    )}
                </div>
            </div>
        </div>
    )
}