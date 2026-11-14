import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import { listCourses } from "../api/courses"
import { useAuth } from "../contexts/AuthContext"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"
import EmptyState from "../components/ui/EmptyState"
import type { Course } from "../types/api"

export default function CoursesPage() {
    const { user } = useAuth()
    const [selectedSemester, setSelectedSemester] = useState<string | null>(null)
    const [search, setSearch] = useState("")

    const { data: courses, isLoading, error } = useQuery({
        queryKey: ["courses"],
        queryFn: listCourses,
        enabled: !!user?.has_active_subscription,
    })

    if (!user) return null

    if (!user.has_active_subscription) {
        return (
            <AppShell>
                <div className="max-w-2xl mx-auto rounded-2xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-10 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 mb-4">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-brand-900">Subscribe to unlock 2,113+ questions</h1>
                    <p className="mt-2 text-sm text-brand-800 max-w-md mx-auto">
                        Get instant access to all courses, mock exams, clinical logbook, and AI care plans for GHS 30 per semester.
                    </p>
                    <Link to="/subscribe" className="mt-6 inline-block">
                        <Button size="lg">Subscribe for GHS 30 →</Button>
                    </Link>
                </div>
            </AppShell>
        )
    }

    const grouped = groupBySemester(courses ?? [])
    const active = selectedSemester
        ? grouped.find((g) => g.semester === selectedSemester)
        : grouped[0]

    const filteredActiveCourses = active?.courses.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    ) ?? []

    const totalQuestions = courses?.reduce((sum, c) => sum + c.question_count, 0) ?? 0
    const courseCount = courses?.length ?? 0
    const readyCourses = courses?.filter((c) => c.question_count > 0).length ?? 0

    return (
        <AppShell>
            <div className="space-y-6 max-w-6xl mx-auto pb-10">

                {/* Header */}
                <header>
                    <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Your Curriculum</p>
                    <h1 className="mt-1 text-h1">{user.level_display} Courses</h1>
                    <p className="mt-1 text-body-sm text-on-surface-muted">{user.program_display} · {courseCount} courses available</p>
                </header>

                {/* Stats Bar */}
                {!isLoading && courses && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <StatCard label="Total Courses" value={courseCount} hint={`${readyCourses} ready · ${courseCount - readyCourses} coming soon`} />
                        <StatCard label="Total Questions" value={totalQuestions.toLocaleString()} hint="More added every week" accent />
                        <StatCard label="Your Level" value={user.level_display} hint="All courses for your semester" />
                    </div>
                )}

                {/* Loading Skeletons */}
                {isLoading && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-xl border border-border bg-white p-5 animate-pulse">
                                <div className="h-3 bg-surface-subtle rounded w-16 mb-3" />
                                <div className="h-5 bg-surface-subtle rounded w-3/4 mb-2" />
                                <div className="h-3 bg-surface-subtle rounded w-1/2 mb-4" />
                                <div className="h-8 bg-surface-subtle rounded w-24" />
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-danger-50 p-4">
                        <p className="text-sm text-danger-700">Failed to load courses. Please try again.</p>
                    </div>
                )}

                {!isLoading && courses && courses.length === 0 && (
                    <EmptyState
                        title="No courses yet"
                        description={`No courses available for ${user.level_display} ${user.program_display} yet.`}
                    />
                )}

                {!isLoading && active && (
                    <div className="space-y-5">

                        {/* Semester Tabs */}
                        <SemesterTabs
                            groups={grouped}
                            activeSemester={active.semester}
                            onSelect={setSelectedSemester}
                        />

                        {/* Search Bar */}
                        <div className="relative max-w-md">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search courses..."
                                className="w-full rounded-lg border border-border bg-white pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                            />
                        </div>

                        {/* Course Grid */}
                        {filteredActiveCourses.length === 0 ? (
                            <div className="rounded-xl border border-border bg-white p-8 text-center">
                                <p className="text-sm text-on-surface-muted">No courses match your search.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {filteredActiveCourses.map((course) => (
                                    <CourseCard key={course.id} course={course} isAdmin={user.is_superuser} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    )
}

function StatCard({ label, value, hint, accent = false }: {
    label: string
    value: number | string
    hint: string
    accent?: boolean
}) {
    return (
        <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">{label}</p>
            <p className={`mt-1 text-2xl font-black ${accent ? "text-brand-700" : "text-on-surface"}`}>{value}</p>
            <p className="text-xs text-on-surface-muted mt-0.5">{hint}</p>
        </div>
    )
}

function SemesterTabs({ groups, activeSemester, onSelect }: {
    groups: { label: string; semester: string; courses: Course[] }[]
    activeSemester: string
    onSelect: (semester: string) => void
}) {
    return (
        <div className="border-b border-border overflow-x-auto">
            <div className="flex gap-1 min-w-max">
                {groups.map((group) => {
                    const isActive = activeSemester === group.semester
                    return (
                        <button
                            key={group.semester}
                            onClick={() => onSelect(group.semester)}
                            className={`relative px-4 py-3 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive ? "text-brand-700" : "text-on-surface-muted hover:text-on-surface hover:bg-surface-subtle"
                                }`}
                        >
                            {group.label}
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-brand-100 text-brand-700" : "bg-surface-subtle text-on-surface-muted"
                                }`}>
                                {group.courses.length}
                            </span>
                            {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700" />}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function CourseCard({ course, isAdmin }: { course: Course, isAdmin?: boolean }) {
    const hasContent = course.question_count > 0
    const className = `group block rounded-xl border p-5 transition-all ${hasContent
            ? "border-border bg-white hover:border-brand-400 hover:shadow-md cursor-pointer"
            : "border-dashed border-border bg-surface-subtle/50 cursor-default"
        }`

    const inner = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold tracking-wide ${hasContent ? "text-brand-600" : "text-on-surface-muted"}`}>
                        {course.code}
                    </p>
                    <h3 className="mt-1 text-h4 truncate group-hover:text-brand-700 transition-colors">
                        {course.title}
                    </h3>
                    <p className="mt-1 text-xs text-on-surface-muted">{course.category_display}</p>

                    {isAdmin && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                {course.program_display}
                            </span>
                            <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                {course.level_display}
                            </span>
                        </div>
                    )}
                </div>
                <div className="text-right shrink-0">
                    {hasContent ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                            {course.question_count} Q
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                            Soon
                        </span>
                    )}
                </div>
            </div>

            {hasContent ? (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
                        Practice now
                    </p>
                    <svg className="h-4 w-4 text-brand-500 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </div>
            ) : (
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-on-surface-muted">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Content arriving this semester</span>
                </div>
            )}
        </>
    )

    return hasContent ? (
        <Link to={`/quizzes/${course.id}`} className={className}>{inner}</Link>
    ) : (
        <div className={className}>{inner}</div>
    )
}

function groupBySemester(courses: Course[]) {
    const map = new Map<string, { label: string; semester: string; courses: Course[] }>()

    for (const course of courses) {
        const groupKey = `${course.program_display} - ${course.level_display} (${course.semester_display})`
        if (!map.has(groupKey)) {
            map.set(groupKey, { label: groupKey, semester: groupKey, courses: [] })
        }
        map.get(groupKey)!.courses.push(course)
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
}