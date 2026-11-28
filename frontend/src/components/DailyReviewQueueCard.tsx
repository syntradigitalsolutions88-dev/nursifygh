import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getDailyReviewQueue } from "../api/courses"
import { useAuth } from "../contexts/AuthContext"
import Badge from "./ui/Badge"
import Button from "./ui/Button"

interface Props {
    onOpenQuickRef: () => void
}

export default function DailyReviewQueueCard({ onOpenQuickRef }: Props) {
    const { user } = useAuth()

    const { data, isLoading } = useQuery({
        queryKey: ["daily-review-queue"],
        queryFn: () => getDailyReviewQueue(10),
        enabled: !!user,
    })

    const dueCount = data?.due_count ?? 0
    const missedCount = data?.missed_questions_count ?? 0
    const dueCardsCount = data?.due_flashcards_count ?? 0
    const streakDays = data?.streak_days ?? 0
    const topCourseId = data?.recommended_course_id
    const previewItems = data?.queue_items?.slice(0, 3) ?? []

    return (
        <div className="rounded-2xl border border-brand-200 bg-white p-5 lg:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="brand">Daily Review Queue</Badge>
                        <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                            {streakDays}-Day Streak
                        </span>
                    </div>
                    <h2 className="mt-2 text-lg lg:text-xl font-bold text-on-surface">
                        {isLoading
                            ? "Checking your due review queue..."
                            : dueCount > 0
                                ? `${dueCount} items ready for active recall (${missedCount} missed Qs · ${dueCardsCount} due flashcards)`
                                : "You're caught up! Keep your streak alive with a quick drill"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                        Previously missed questions stay in your queue until you answer them correctly.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onOpenQuickRef}
                        className="rounded-xl border border-brand-300 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-800 hover:bg-brand-100 transition-colors"
                    >
                        Ghana Quick Reference
                    </button>
                    {topCourseId ? (
                        <Link to={`/quizzes/${topCourseId}?mode=review&limit=5`}>
                            <Button size="sm">Drill Weakest (5 Qs) →</Button>
                        </Link>
                    ) : (
                        <Link to="/courses">
                            <Button size="sm">Start 5-Q Warmup →</Button>
                        </Link>
                    )}
                    {dueCardsCount > 0 && (
                        <Link to="/revision">
                            <Button size="sm" variant="secondary">
                                Review {dueCardsCount} Cards
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {previewItems.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-border pt-4">
                    {previewItems.map((item) => (
                        <Link
                            key={item.question_id}
                            to={`/quizzes/${item.course_id}?mode=review&focus_question=${item.question_id}&limit=5`}
                            className="rounded-xl border border-border bg-gray-50/70 p-3 hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-brand-700">{item.course_code}</span>
                                <span className="text-xs font-semibold text-red-600">
                                    Missed {item.times_missed}×
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-on-surface line-clamp-2">{item.question_preview}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
