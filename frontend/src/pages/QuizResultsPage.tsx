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
                <div className="text-center py-20 text-gray-500 animate-pulse">
                    Loading results…
                </div>
            </AppShell>
        )
    }

    if (error || !attempt) {
        return (
            <AppShell>
                <div className="rounded-xl border border-border bg-white p-8 text-center">
                    <h1 className="text-h3 text-danger-700">Results not found</h1>
                    <Link to="/courses" className="mt-4 inline-block">
                        <Button variant="secondary">← Back to Courses</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    // 🔍 The Magic Rule: If it has 35+ questions, it was a Mock Exam
    const isMockExam = attempt.total_questions >= 35

    const scoreNum = parseFloat(attempt.score_percentage)
    const pageTitle = isMockExam ? "Level Mock Exam Results" : attempt.course_title
    const pageSubtitle = isMockExam ? "Simulated Exam" : attempt.course_code

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-8 pb-20">

                {/* Score Header Card */}
                <div className="rounded-3xl bg-gradient-to-br from-brand-900 to-brand-700 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden text-center">
                    <div className="relative z-10">
                        <p className="text-brand-200 font-bold tracking-wider uppercase text-xs sm:text-sm mb-2">{pageSubtitle}</p>
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-6">{pageTitle}</h1>

                        <div className="inline-block rounded-2xl bg-white/10 border border-white/20 p-6 sm:p-8 backdrop-blur-sm">
                            <p className="text-brand-100 text-sm font-medium mb-1">Your Score</p>
                            <h2 className="text-6xl sm:text-7xl font-black mb-2">{attempt.score_percentage}%</h2>
                            <p className="text-brand-50 text-sm">
                                <strong className="text-white">{attempt.correct_answers}</strong> out of <strong className="text-white">{attempt.total_questions}</strong> correct
                            </p>
                        </div>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link to={isMockExam ? "/dashboard" : "/courses"}>
                                <Button variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                                    {isMockExam ? "Back to Dashboard" : "Back to courses"}
                                </Button>
                            </Link>
                            <Link to={isMockExam ? "/mock-exam" : `/quizzes/${attempt.course_id}`}>
                                <Button className="bg-white text-brand-900 hover:bg-brand-50">
                                    {isMockExam ? "Take another Mock Exam" : "Try again"}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-2xl font-serif font-bold text-gray-900">Review & Rationales</h2>
                        <Badge variant={scoreNum >= 50 ? "success" : "danger"}>
                            {scoreNum >= 50 ? "Passed" : "Needs Improvement"}
                        </Badge>
                    </div>

                    {attempt.answers.map((answer, idx) => {
                        const q = answer.question
                        const isCorrect = answer.is_correct

                        return (
                            <div key={q.id} className={`rounded-2xl border-2 p-6 sm:p-8 ${isCorrect ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>

                                <div className="flex items-start gap-4 mb-6">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                                        {isCorrect ? "✓" : "✗"}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Question {idx + 1}</p>
                                        <h3 className="text-lg font-semibold text-gray-900 leading-relaxed">{q.text}</h3>
                                    </div>
                                </div>

                                <div className="space-y-3 pl-0 sm:pl-12 mb-6">
                                    {q.choices
                                        .slice()
                                        .sort((a: any, b: any) => a.position - b.position)
                                        .map((choice: any) => {
                                            const isTheCorrectAnswer = q.correct_choice_id === choice.id
                                            const isSelected = answer.selected_choice_id === choice.id

                                            let bgClass = "bg-white border-gray-200 text-gray-600"
                                            if (isTheCorrectAnswer) bgClass = "bg-green-100 border-green-400 text-green-900 font-medium"
                                            else if (isSelected && !isTheCorrectAnswer) bgClass = "bg-red-100 border-red-400 text-red-900 opacity-90"

                                            return (
                                                <div key={choice.id} className={`p-4 rounded-xl border ${bgClass} flex items-start gap-3`}>
                                                    <span className="shrink-0 font-mono text-xs opacity-50 mt-1">
                                                        {String.fromCharCode(65 + choice.position)}.
                                                    </span>
                                                    <span className="flex-1 text-sm sm:text-base">{choice.text}</span>

                                                    {isTheCorrectAnswer && <span className="text-[10px] font-bold text-green-700 bg-green-200 px-2 py-1 rounded uppercase tracking-wider mt-0.5">Correct</span>}
                                                    {isSelected && !isTheCorrectAnswer && <span className="text-[10px] font-bold text-red-700 bg-red-200 px-2 py-1 rounded uppercase tracking-wider mt-0.5">Your Answer</span>}
                                                </div>
                                            )
                                        })}
                                </div>

                                {q.rationale && (
                                    <div className="pl-0 sm:pl-12">
                                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
                                            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2">Clinical Rationale</p>
                                            <p className="text-sm text-blue-900 leading-relaxed">
                                                {q.rationale}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <button
                    onClick={() => {
                        const text = `I just scored ${attempt.score_percentage}% on ${attempt.course_title || 'a quiz'} on NursifyGH! 📚 Try beating my score: https://nursifygh-frontend.vercel.app`
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                    }}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-4 font-bold text-white hover:bg-[#20bd5a] transition-colors shadow-lg shadow-[#25D366]/20"
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Share your score on WhatsApp
                </button>
            </div>
        </AppShell>
    )
}