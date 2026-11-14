import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { getQuizAttempt } from "../api/courses"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"

export default function QuizResultsPage() {
    const { attemptId } = useParams<{ attemptId: string }>()

    const { data: attempt, isLoading, error } = useQuery({
        queryKey: ["quiz-attempt", attemptId],
        queryFn: () => getQuizAttempt(attemptId!),
        enabled: !!attemptId,
    })

    if (isLoading) {
        return (
            <AppShell>
                <div className="text-center py-12">
                    <p className="text-on-surface-muted">Loading results…</p>
                </div>
            </AppShell>
        )
    }

    if (error || !attempt) {
        return (
            <AppShell>
                <div className="rounded-xl border border-border bg-white p-8 text-center">
                    <h1 className="text-h3 text-danger-700">Results not found</h1>
                </div>
            </AppShell>
        )
    }

    // 🔍 The Magic Rule: If it has 35+ questions, it was a Mock Exam
    const isMockExam = attempt.total_questions >= 35

    const scoreNum = parseFloat(attempt.score_percentage)
    const scoreBg =
        scoreNum >= 70
            ? "bg-success-50 border-green-200"
            : scoreNum >= 40
                ? "bg-warning-50 border-amber-200"
                : "bg-danger-50 border-red-200"
    const scoreColor =
        scoreNum >= 70
            ? "text-success-700"
            : scoreNum >= 40
                ? "text-warning-700"
                : "text-danger-700"

    const pageTitle = isMockExam ? "Level Mock Exam Results" : attempt.course_title
    const pageSubtitle = isMockExam ? "Simulated Exam" : attempt.course_code

    return (
        <AppShell>
            <div className="max-w-3xl space-y-6">
                <div>
                    <p className="text-caption text-brand-600">{pageSubtitle}</p>
                    <h1 className="mt-2 text-h1">{pageTitle}</h1>
                </div>

                <div className={`rounded-xl border-2 ${scoreBg} p-8 text-center`}>
                    <p className="text-caption">Your score</p>
                    <p className={`mt-2 text-5xl font-bold ${scoreColor}`}>
                        {attempt.score_percentage}%
                    </p>
                    <p className="mt-2 text-body-sm text-on-surface-muted">
                        {attempt.correct_answers} of {attempt.total_questions} correct
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="text-h3">Review</h2>

                    {attempt.answers.map((answer, idx) => {
                        const q = answer.question
                        return (
                            <div key={q.id} className="rounded-xl border border-border bg-white p-6">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-h4 flex-1">
                                        {idx + 1}. {q.text}
                                    </h3>
                                    <Badge variant={answer.is_correct ? "success" : "danger"}>
                                        {answer.is_correct ? "Correct" : "Incorrect"}
                                    </Badge>
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
                                                    className={`rounded-lg border p-3 text-body-sm ${isCorrect
                                                        ? "border-green-300 bg-success-50"
                                                        : isSelected
                                                            ? "border-red-300 bg-danger-50"
                                                            : "border-border"
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="shrink-0 font-mono text-xs text-on-surface-muted">
                                                            {String.fromCharCode(65 + choice.position)}.
                                                        </span>
                                                        <span className="flex-1 text-on-surface">{choice.text}</span>
                                                        {isCorrect && (
                                                            <span className="text-xs font-medium text-success-700">✓ correct</span>
                                                        )}
                                                        {isSelected && !isCorrect && (
                                                            <span className="text-xs font-medium text-danger-700">✗ your answer</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>

                                {q.rationale && (
                                    <div className="mt-4 rounded-lg bg-brand-50 p-3">
                                        <p className="text-xs font-semibold text-brand-700">Rationale</p>
                                        <p className="mt-1 text-xs text-brand-800">{q.rationale}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <button
                    onClick={() => {
                        const text = `I just scored ${attempt.score_percentage}% on ${attempt.course_title || 'a quiz'} on NursifyGH! 📚 Try beating my score: https://nursifygh.com`
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                    }}
                    className="mt-8 mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-bold text-white hover:bg-[#20bd5a] transition-colors"
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Share your score on WhatsApp
                </button>

                <div className="flex justify-between">
                    <Link to={isMockExam ? "/dashboard" : "/courses"}>
                        <Button variant="secondary">
                            {isMockExam ? "Back to Dashboard" : "Back to courses"}
                        </Button>
                    </Link>
                    <Link to={isMockExam ? "/mock-exam" : `/quizzes/${attempt.course_id}`}>
                        <Button>{isMockExam ? "Take another Mock Exam" : "Try again"}</Button>
                    </Link>
                </div>
            </div>
        </AppShell>
    )
}