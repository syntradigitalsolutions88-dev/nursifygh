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

function maskStudentName(rawName?: string): string {
    const parts = (rawName || "").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "Student"
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

function getInitials(maskedName: string): string {
    const parts = maskedName.replace(/\./g, "").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "ST"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function formatProgramLabel(program?: string, programDisplay?: string): string {
    if (programDisplay) return programDisplay
    if (program === "PSYCHIATRIC") return "Psychiatric Nursing (RPN)"
    if (program === "MIDWIFERY") return "Midwifery (RM)"
    if (program === "COMMUNITY") return "Community Health (CHN)"
    if (program === "GENERAL") return "General Nursing (RGN)"
    return "All Programs"
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

    const leaderboard: LeaderboardEntry[] = (data?.leaderboard || []).map((item: LeaderboardEntry) => ({
        ...item,
        name: maskStudentName(item.name),
    }))
    const myRank: number | null = data?.my_rank ?? null
    const myScore: number = data?.my_score ?? 0

    const top3 = leaderboard.slice(0, 3)
    const rest = leaderboard.slice(3)

    const programLabel = formatProgramLabel(user?.program, user?.program_display)

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4">

                {/* Header */}
                <header className="text-center space-y-2 pt-4">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Leaderboard</h1>
                    <p className="text-gray-500 font-medium text-sm">
                        Top performers in {programLabel}
                        {user?.level_display ? ` • ${user.level_display}` : ""}
                    </p>
                </header>

                {/* Your Personal Rank Card */}
                {myRank && (
                    <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between gap-4 relative overflow-hidden">
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
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200 border-dashed px-4">
                        <p className="text-lg font-bold text-gray-700">No rankings yet.</p>
                        <p className="text-gray-500 mt-1 text-sm">Complete at least 3 quizzes to appear on the leaderboard.</p>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* TOP 3 PODIUM */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-8">
                            {/* 2nd Place */}
                            {top3[1] && (
                                <div className={`relative rounded-xl border p-3 sm:p-4 text-center shadow-sm min-w-0 ${top3[1].is_current_user ? "bg-brand-50/60 border-brand-300" : "bg-white border-gray-200"}`}>
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-100 text-gray-600 font-bold text-[10px] px-2 py-1 rounded-full border border-gray-200">2ND</div>
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-sm sm:text-base font-black text-gray-600 mb-2 sm:mb-3 mt-1 border border-gray-200">
                                        {getInitials(top3[1].name)}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                                        {top3[1].name}
                                    </h3>
                                    {top3[1].is_current_user && (
                                        <span className="inline-block mt-1 text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">You</span>
                                    )}
                                    <p className="text-xs sm:text-sm font-bold text-gray-700 mt-1">{top3[1].average_score}%</p>
                                    <p className="text-[11px] text-gray-400">{top3[1].total_quizzes} quizzes</p>
                                </div>
                            )}

                            {/* 1st Place */}
                            {top3[0] && (
                                <div className={`relative bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl border p-3.5 sm:p-5 text-center shadow-lg transform sm:-translate-y-4 min-w-0 ${top3[0].is_current_user ? "border-brand-400 ring-2 ring-brand-400/40" : "border-gray-700"}`}>
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white font-bold text-[10px] px-3 py-1 rounded-full shadow-sm">1ST</div>
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center text-base sm:text-lg font-black text-brand-400 mb-2 sm:mb-3 mt-1 border border-gray-700">
                                        {getInitials(top3[0].name)}
                                    </div>
                                    <h3 className="font-black text-white text-xs sm:text-sm truncate">
                                        {top3[0].name}
                                    </h3>
                                    {top3[0].is_current_user && (
                                        <span className="inline-block mt-1 text-[10px] bg-brand-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">You</span>
                                    )}
                                    <p className="text-xs sm:text-sm font-bold text-brand-400 mt-1">{top3[0].average_score}%</p>
                                    <p className="text-[11px] text-gray-400">{top3[0].total_quizzes} quizzes</p>
                                </div>
                            )}

                            {/* 3rd Place */}
                            {top3[2] && (
                                <div className={`relative rounded-xl border p-3 sm:p-4 text-center shadow-sm min-w-0 ${top3[2].is_current_user ? "bg-brand-50/60 border-brand-300" : "bg-white border-gray-200"}`}>
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-50 text-orange-600 font-bold text-[10px] px-2 py-1 rounded-full border border-orange-100">3RD</div>
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto bg-orange-50 rounded-full flex items-center justify-center text-sm sm:text-base font-black text-orange-600 mb-2 sm:mb-3 mt-1 border border-orange-100">
                                        {getInitials(top3[2].name)}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                                        {top3[2].name}
                                    </h3>
                                    {top3[2].is_current_user && (
                                        <span className="inline-block mt-1 text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">You</span>
                                    )}
                                    <p className="text-xs sm:text-sm font-bold text-gray-700 mt-1">{top3[2].average_score}%</p>
                                    <p className="text-[11px] text-gray-400">{top3[2].total_quizzes} quizzes</p>
                                </div>
                            )}
                        </div>

                        {/* THE REST OF THE LIST */}
                        {rest.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {rest.map((entry) => (
                                    <div
                                        key={entry.rank}
                                        className={`flex items-center justify-between gap-3 p-4 border-b border-gray-100 last:border-0 transition-colors ${entry.is_current_user ? "bg-brand-50/50" : "hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={`w-6 shrink-0 text-center font-bold text-sm ${entry.is_current_user ? "text-brand-700" : "text-gray-400"}`}>
                                                {entry.rank}
                                            </span>
                                            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${entry.is_current_user ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                                                {getInitials(entry.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-semibold text-sm truncate ${entry.is_current_user ? "text-brand-900" : "text-gray-900"}`}>
                                                    {entry.name}
                                                    {entry.is_current_user && (
                                                        <span className="ml-2 text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider align-middle">
                                                            You
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500 font-medium">{entry.total_quizzes} quizzes</p>
                                            </div>
                                        </div>
                                        <div className={`shrink-0 font-bold text-sm ${entry.is_current_user ? "text-brand-700" : "text-gray-700"}`}>
                                            {entry.average_score}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    )
}
