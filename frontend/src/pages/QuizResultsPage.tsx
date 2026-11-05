import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { getQuizAttempt } from "../api/courses"

export default function QuizResultsPage() {
    const { attemptId } = useParams<{ attemptId: string }>()

    const { data: attempt, isLoading, error } = useQuery({
        queryKey: ["quiz-attempt", attemptId],
        queryFn: () => getQuizAttempt(attemptId!),
        enabled: !!attemptId,
    })

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading results…</p>
            </div>
        )
    }

    if (error || !attempt) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="card max-w-md w-full text-center">
                    <h1 className="text-xl font-bold text-red-700">Results not found</h1>
                    <Link to="/courses" className="btn-secondary mt-4 inline-block">
                        Back to courses
                    </Link>
                </div>
            </div>
        )
    }

    const scoreNum = parseFloat(attempt.score_percentage)
    const scoreColor =
        scoreNum >= 70 ? "text-green-700" : scoreNum >= 40 ? "text-amber-700" : "text-red-700"
    const scoreBg =
        scoreNum >= 70 ? "bg-green-50 ring-green-100" : scoreNum >= 40 ? "bg-amber-50 ring-amber-100" : "bg-red-50 ring-red-100"

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <Link to="/courses" className="text-sm text-brand-600 hover:underline">
                        ← Back to courses
                    </Link>
                    <h1 className="mt-2 text-xl font-bold text-gray-900">
                        {attempt.course_code} — {attempt.course_title}
                    </h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                <div className={`card ring-2 ${scoreBg}`}>
                    <p className="text-sm text-gray-500">Your score</p>
                    <p className={`mt-2 text-5xl font-bold ${scoreColor}`}>
                        {attempt.score_percentage}%
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                        {attempt.correct_answers} of {attempt.total_questions} correct
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Review</h2>

                    {attempt.answers.map((answer, idx) => {
                        const q = answer.question
                        return (
                            <div key={q.id} className="card">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {idx + 1}. {q.text}
                                    </h3>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${answer.is_correct
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {answer.is_correct ? "Correct" : "Incorrect"}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2">
                                    {q.choices
                                        .slice()
                                        .sort((a, b) => a.position - b.position)
                                        .map((choice) => {
                                            const isCorrect = q.correct_choice_id === choice.id
                                            const isSelected = answer.selected_choice_id === choice.id
                                            return (
                                                <div
                                                    key={choice.id}
                                                    className={`rounded-lg border p-3 text-sm ${isCorrect
                                                        ? "border-green-300 bg-green-50"
                                                        : isSelected
                                                            ? "border-red-300 bg-red-50"
                                                            : "border-gray-200"
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="shrink-0 font-mono text-xs text-gray-500">
                                                            {String.fromCharCode(65 + choice.position)}.
                                                        </span>
                                                        <span className="flex-1 text-gray-800">
                                                            {choice.text}
                                                        </span>
                                                        {isCorrect && (
                                                            <span className="text-xs font-medium text-green-700">
                                                                ✓ correct
                                                            </span>
                                                        )}
                                                        {isSelected && !isCorrect && (
                                                            <span className="text-xs font-medium text-red-700">
                                                                ✗ your answer
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>

                                {q.rationale && (
                                    <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
                                        <p className="font-medium">Rationale</p>
                                        <p className="mt-1 text-brand-800">{q.rationale}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="flex justify-between">
                    <Link to="/courses" className="btn-secondary">
                        Back to courses
                    </Link>
                    <Link to={`/quizzes/${attempt.course_id}`} className="btn-primary">
                        Try again
                    </Link>
                </div>
            </main>
        </div>
    )
}