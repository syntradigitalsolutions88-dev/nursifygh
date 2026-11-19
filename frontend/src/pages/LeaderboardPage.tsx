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

    const top3 = leaderboard.slice(0, 3)
    const rest = leaderboard.slice(3)

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4">

                {/* Header */}
                <header className="text-center space-y-2 pt-6">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Leaderboard</h1>
                    <p className="text-gray-500 font-medium text-sm">
                        Top performers in {user?.program_display} • {user?.level_display}
                    </p>
                </header>

                {/* Your Personal Rank Card */}
                {myRank && (
                    <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 opacity-20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="relative z-10">
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Your Standing</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black">#{myRank}</span>
                                <span className="text-gray-400 text-sm">of {leaderboard.length} ranked</span>
                            </div>
                        </div>
                        <div className="relative z-10 text-right">
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Avg. Score</p>
                            <p className="text-4xl font-black text-brand-400">{myScore}%</p>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-20 text-gray-400 font-medium">Loading rankings...</div>
                ) : isError ? (
                    <div className="text-center py-12 bg-red-50 text-red-600 rounded-xl border border-red-200">
                        Failed to load leaderboard.
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                        <p className="text-lg font-bold text-gray-700">No rankings yet.</p>
                        <p className="text-gray-500 mt-1 text-sm">Take at least 3 quizzes to secure your spot.</p>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* TOP 3 PODIUM */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-8">
                            {/* 2nd Place */}
                            {top3[1] && (
                                <div className="relative bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-100 text-gray-600 font-bold text-[10px] px-2 py-1 rounded-full border border-gray-200">2ND</div>
                                    <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-xl font-bold text-gray-400 mb-3 mt-1 border border-gray-100">2</div>
                                    <h3 className="font-bold text-gray-900 text-sm truncate">{top3[1].name}</h3>
                                    <p className="text-xs font-semibold text-gray-500 mt-1">{top3[1].average_score}%</p>
                                </div>
                            )}

                            {/* 1st Place */}
                            {top3[0] && (
                                <div className="relative bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-5 text-center shadow-lg transform sm:-translate-y-4">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white font-bold text-[10px] px-3 py-1 rounded-full shadow-sm">1ST</div>
                                    <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center text-2xl font-black text-brand-400 mb-3 mt-1 border border-gray-700">1</div>
                                    <h3 className="font-black text-white text-sm truncate">{top3[0].name}</h3>
                                    <p className="text-xs font-bold text-brand-400 mt-1">{top3[0].average_score}%</p>
                                </div>
                            )}

                            {/* 3rd Place */}
                            {top3[2] && (
                                <div className="relative bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-50 text-orange-600 font-bold text-[10px] px-2 py-1 rounded-full border border-orange-100">3RD</div>
                                    <div className="w-12 h-12 mx-auto bg-orange-50 rounded-full flex items-center justify-center text-xl font-bold text-orange-400 mb-3 mt-1 border border-orange-100">3</div>
                                    <h3 className="font-bold text-gray-900 text-sm truncate">{top3[2].name}</h3>
                                    <p className="text-xs font-semibold text-gray-500 mt-1">{top3[2].average_score}%</p>
                                </div>
                            )}
                        </div>

                        {/* THE REST OF THE LIST */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {rest.map((entry) => (
                                <div
                                    key={entry.rank}
                                    className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-0 transition-colors ${entry.is_current_user ? "bg-brand-50/50" : "hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`w-6 text-center font-bold text-sm ${entry.is_current_user ? "text-brand-700" : "text-gray-400"}`}>
                                            {entry.rank}
                                        </span>
                                        <div>
                                            <p className={`font-semibold text-sm ${entry.is_current_user ? "text-brand-900" : "text-gray-900"}`}>
                                                {entry.name} {entry.is_current_user && <span className="ml-2 text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">{entry.total_quizzes} quizzes</p>
                                        </div>
                                    </div>
                                    <div className={`font-bold text-sm ${entry.is_current_user ? "text-brand-700" : "text-gray-700"}`}>
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