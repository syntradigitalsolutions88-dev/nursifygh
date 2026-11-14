import { useQuery } from "@tanstack/react-query"
import { api } from "../api/client"
import { useAuth } from "../contexts/AuthContext"
import AppShell from "../components/shell/AppShell"

interface LeaderboardEntry {
    rank: number
    name: string
    average_score: number
    total_quizzes: number
    is_current_user: boolean
}

export default function LeaderboardPage() {
    const { user } = useAuth()
    const { data, isLoading } = useQuery({
        queryKey: ["leaderboard"],
        queryFn: async () => {
            const res = await api.get("/academics/leaderboard/")
            return res.data
        }
    })

    return (
        <AppShell>
            <div className="max-w-3xl mx-auto space-y-8">
                <header className="text-center space-y-2">
                    <h1 className="text-h2 text-brand-900">Hall of Fame 🏆</h1>
                    <p className="text-body text-on-surface-muted">
                        Top students in {user?.program_display} - {user?.level_display}
                    </p>
                </header>

                {isLoading ? (
                    <div className="text-center py-12">Loading rankings…</div>
                ) : (
                    <div className="space-y-6">
                        {data?.my_rank && (
                            <div className="rounded-2xl bg-brand-700 p-6 text-white shadow-lg flex items-center justify-between">
                                <div>
                                    <p className="text-brand-100 text-sm font-medium">Your Rank</p>
                                    <p className="text-4xl font-bold mt-1">#{data.my_rank}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-brand-100 text-sm font-medium">Average Score</p>
                                    <p className="text-3xl font-bold mt-1">{data.my_score}%</p>
                                </div>
                            </div>
                        )}

                        <div className="rounded-xl border border-border bg-white overflow-hidden">
                            {data?.leaderboard.map((entry: LeaderboardEntry) => (
                                <div
                                    key={entry.rank}
                                    className={`flex items-center justify-between p-4 border-b border-border last:border-0 ${entry.is_current_user ? "bg-brand-50" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${entry.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                                entry.rank === 2 ? "bg-gray-200 text-gray-700" :
                                                    entry.rank === 3 ? "bg-orange-100 text-orange-700" :
                                                        "bg-surface-subtle text-on-surface-muted"
                                            }`}>
                                            {entry.rank}
                                        </div>
                                        <div>
                                            <p className={`font-medium ${entry.is_current_user ? "text-brand-700" : "text-on-surface"}`}>
                                                {entry.name} {entry.is_current_user && "(You)"}
                                            </p>
                                            <p className="text-xs text-on-surface-muted">{entry.total_quizzes} quizzes taken</p>
                                        </div>
                                    </div>
                                    <div className="font-bold text-brand-700">
                                        {entry.average_score}%
                                    </div>
                                </div>
                            ))}

                            {data?.leaderboard.length === 0 && (
                                <div className="p-8 text-center text-on-surface-muted">
                                    No rankings yet. Take at least 3 quizzes to appear on the leaderboard!
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}