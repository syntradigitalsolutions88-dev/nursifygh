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
    const { data, isLoading, isError } = useQuery({
        queryKey: ["leaderboard"],
        queryFn: async () => {
            const res = await api.get("/academics/leaderboard/")
            return res.data
        },
        retry: 1,
    })

    const leaderboard: LeaderboardEntry[] = data?.leaderboard || []
    const myRank = data?.my_rank || null
    const myScore = data?.my_score || 0

    // Split top 3 for the podium and the rest for the list
    const top3 = leaderboard.slice(0, 3)
    const rest = leaderboard.slice(3)

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-8 pb-12">

                {/* Header */}
                <header className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-3 bg-yellow-100 rounded-full mb-2">
                        <span className="text-3xl">🏆</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Hall of Fame</h1>
                    <p className="text-gray-500 font-medium">
                        Top performing students in {user?.program_display} • {user?.level_display}
                    </p>
                </header>

                {/* Your Personal Rank Card */}
                {myRank && (
                    <div className="bg-gradient-to-r from-brand-900 to-brand-700 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                        <div className="relative z-10">
                            <p className="text-brand-200 text-sm font-semibold uppercase tracking-wider mb-1">Your Current Standing</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black">#{myRank}</span>
                                <span className="text-brand-100 text-sm">out of {leaderboard.length} ranked</span>
                            </div>
                        </div>
                        <div className="relative z-10 text-right">
                            <p className="text-brand-200 text-sm font-semibold mb-1">Avg. Score</p>
                            <p className="text-4xl font-black">{myScore}%</p>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-20 text-brand-600 font-medium animate-pulse">Loading rankings...</div>
                ) : isError ? (
                    <div className="text-center py-12 bg-red-50 text-red-600 rounded-xl border border-red-200">
                        Failed to load leaderboard. Please check your connection.
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                        <p className="text-lg font-bold text-gray-700">No rankings yet.</p>
                        <p className="text-gray-500 mt-1">Take at least 3 quizzes to secure your spot on the podium!</p>
                    </div>
                ) : (
                    <div className="space-y-8">

                        {/* TOP 3 PODIUM */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-8">
                            {/* 2nd Place */}
                            {top3[1] && (
                                <div className="order-2 md:order-1 relative bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-200 text-gray-700 font-black text-xs px-3 py-1 rounded-full border-2 border-white shadow-sm">2ND</div>
                                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-2xl mb-3 mt-2">🥈</div>
                                    <h3 className="font-bold text-gray-900 truncate">{top3[1].name}</h3>
                                    <p className="text-sm font-medium text-gray-500">{top3[1].average_score}% Avg</p>
                                    <p className="text-xs text-gray-400 mt-1">{top3[1].total_quizzes} quizzes</p>
                                </div>
                            )}

                            {/* 1st Place */}
                            {top3[0] && (
                                <div className="order-1 md:order-2 relative bg-gradient-to-b from-yellow-50 to-white rounded-2xl border-2 border-yellow-400 p-8 text-center shadow-lg transform md:-translate-y-4">
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-black text-xs px-4 py-1.5 rounded-full border-2 border-white shadow-sm">1ST PLACE</div>
                                    <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center text-4xl mb-4 mt-2 ring-4 ring-yellow-100/50">👑</div>
                                    <h3 className="font-black text-lg text-gray-900 truncate">{top3[0].name}</h3>
                                    <p className="text-brand-700 font-bold text-lg">{top3[0].average_score}% Avg</p>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">{top3[0].total_quizzes} quizzes</p>
                                </div>
                            )}

                            {/* 3rd Place */}
                            {top3[2] && (
                                <div className="order-3 relative bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-200 text-orange-800 font-black text-xs px-3 py-1 rounded-full border-2 border-white shadow-sm">3RD</div>
                                    <div className="w-16 h-16 mx-auto bg-orange-50 rounded-full flex items-center justify-center text-2xl mb-3 mt-2">🥉</div>
                                    <h3 className="font-bold text-gray-900 truncate">{top3[2].name}</h3>
                                    <p className="text-sm font-medium text-gray-500">{top3[2].average_score}% Avg</p>
                                    <p className="text-xs text-gray-400 mt-1">{top3[2].total_quizzes} quizzes</p>
                                </div>
                            )}
                        </div>

                        {/* THE REST OF THE LIST */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <span>Rank & Student</span>
                                <span>Average Score</span>
                            </div>
                            {rest.map((entry) => (
                                <div
                                    key={entry.rank}
                                    className={`flex items-center justify-between p-4 px-6 border-b border-gray-100 last:border-0 transition-colors ${entry.is_current_user ? "bg-brand-50/60" : "hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`w-8 text-center font-bold text-sm ${entry.is_current_user ? "text-brand-700" : "text-gray-400"}`}>
                                            #{entry.rank}
                                        </span>
                                        <div>
                                            <p className={`font-semibold text-sm ${entry.is_current_user ? "text-brand-800" : "text-gray-800"}`}>
                                                {entry.name} {entry.is_current_user && <span className="ml-1 text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded-full uppercase">You</span>}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">{entry.total_quizzes} quizzes taken</p>
                                        </div>
                                    </div>
                                    <div className={`font-black ${entry.is_current_user ? "text-brand-700" : "text-gray-700"}`}>
                                        {entry.average_score}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    )
}