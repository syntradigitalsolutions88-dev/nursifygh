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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚠️</span>
                <div>
                    <p className="text-sm font-bold text-amber-900">Your weakest areas</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                        Practice these courses to improve your score
                    </p>
                </div>
            </div>
            <div className="space-y-2">
                {areas.map((area) => (
                    <Link
                        key={area.course_id}
                        to={`/quizzes/${area.course_id}`}
                        className="flex items-center justify-between rounded-lg bg-white border border-amber-200 p-3 hover:border-amber-400 transition-colors"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-on-surface truncate">
                                {area.course_code}
                            </p>
                            <p className="text-xs text-on-surface-muted truncate">
                                {area.course_title}
                            </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-bold text-amber-700">
                                {area.accuracy}%
                            </p>
                            <p className="text-xs text-on-surface-muted">
                                {area.correct}/{area.total}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
