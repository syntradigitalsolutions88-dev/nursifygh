import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import api from "../api/client"

interface WeakArea {
    course_id: string
    course_code: string
    course_title: string
    accuracy: number
    correct: number
    total: number
}

export default function WeakAreasCard() {
    const { data: areas, isLoading } = useQuery({
        queryKey: ["weak-areas"],
        queryFn: async () => {
            const res = await api.get<WeakArea[]>("/academics/weak-areas/")
            return res.data
        },
    })

    if (isLoading) return null
    if (!areas || areas.length === 0) return null

    return (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-border px-6 py-5 flex items-center justify-between bg-surface-subtle/30">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-on-surface">Focus Areas</h2>
                        <p className="text-xs text-on-surface-muted mt-0.5">
                            Improve your score by reviewing these courses
                        </p>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-border">
                {areas.map((area) => (
                    <Link
                        key={area.course_id}
                        to={`/quizzes/${area.course_id}`}
                        className="group flex items-center justify-between p-5 hover:bg-surface-subtle/50 transition-colors"
                    >
                        <div className="min-w-0 flex-1 pr-6">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-on-surface truncate group-hover:text-brand-700 transition-colors">
                                    {area.course_code}
                                </span>
                                <span className="text-xs font-medium text-on-surface-muted truncate">
                                    • {area.course_title}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-2 flex items-center gap-3">
                                <div className="h-1.5 w-full max-w-[200px] bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${area.accuracy < 40 ? 'bg-red-400' :
                                            area.accuracy < 60 ? 'bg-amber-400' :
                                                'bg-brand-500'
                                            }`}
                                        style={{ width: `${area.accuracy}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-on-surface-muted">
                                    {area.correct} / {area.total} correct
                                </span>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-4">
                            <div className="text-right">
                                <p className={`text-lg font-black ${area.accuracy < 40 ? 'text-red-500' :
                                    area.accuracy < 60 ? 'text-amber-500' :
                                        'text-brand-600'
                                    }`}>
                                    {area.accuracy}%
                                </p>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}