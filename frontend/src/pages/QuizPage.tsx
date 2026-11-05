import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { getCourse, submitQuiz } from "../api/courses"
import type { QuizAnswerInput } from "../types/api"

export default function QuizPage() {
    const { courseId } = useParams<{ courseId: string }>()
    const navigate = useNavigate()

    const { data: course, isLoading, error } = useQuery({
        queryKey: ["course", courseId],
        queryFn: () => getCourse(courseId!),
        enabled: !!courseId,
    })

    // Map of question_id -> choice_id (null if unanswered)
    const [answers, setAnswers] = useState<Record<string, string | null>>({})
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    function selectChoice(questionId: string, choiceId: string) {
        setAnswers((prev) => ({ ...prev, [questionId]: choiceId }))
    }

    async function onSubmit() {
        if (!course) return
        setSubmitError(null)
        setSubmitting(true)
        try {
            const payload: QuizAnswerInput[] = course.questions.map((q) => ({
                question_id: q.id,
                choice_id: answers[q.id] ?? null,
            }))
            const attempt = await submitQuiz({
                course_id: course.id,
                answers: payload,
            })
            navigate(`/quizzes/results/${attempt.id}`, { replace: true })
        } catch {
            setSubmitError("Failed to submit quiz. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading quiz…</p>
            </div>
        )
    }

    if (error || !course) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="card max-w-md w-full text-center">
                    <h1 className="text-xl font-bold text-red-700">Course not found</h1>
                    <Link to="/courses" className="btn-secondary mt-4 inline-block">
                        Back to courses
                    </Link>
                </div>
            </div>
        )
    }

    const answeredCount = Object.values(answers).filter(Boolean).length
    const totalCount = course.questions.length

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <Link to="/courses" className="text-sm text-brand-600 hover:underline">
                        ← Back to courses
                    </Link>
                    <h1 className="mt-2 text-xl font-bold text-gray-900">
                        {course.code} — {course.title}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {answeredCount} of {totalCount} answered
                    </p>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                {course.questions.map((question, idx) => (
                    <div key={question.id} className="card">
                        <div className="flex items-start justify-between">
                            <h2 className="text-base font-semibold text-gray-900">
                                {idx + 1}. {question.text}
                            </h2>
                        </div>
                        <div className="mt-4 space-y-2">
                            {question.choices
                                .slice()
                                .sort((a, b) => a.position - b.position)
                                .map((choice) => {
                                    const selected = answers[question.id] === choice.id
                                    return (
                                        <label
                                            key={choice.id}
                                            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${selected
                                                    ? "border-brand-500 bg-brand-50"
                                                    : "border-gray-200 hover:border-gray-300"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name={question.id}
                                                checked={selected}
                                                onChange={() => selectChoice(question.id, choice.id)}
                                                className="mt-0.5"
                                            />
                                            <span className="text-sm text-gray-800">{choice.text}</span>
                                        </label>
                                    )
                                })}
                        </div>
                    </div>
                ))}

                {submitError && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {submitError}
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={onSubmit}
                        disabled={submitting || answeredCount === 0}
                        className="btn-primary"
                    >
                        {submitting ? "Submitting…" : "Submit quiz"}
                    </button>
                </div>
            </main>
        </div>
    )
}