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

    const { data: courses, isLoading, error } = useQuery({
        queryKey: ["courses"],
        queryFn: listCourses,
        enabled: !!user?.has_active_subscription,
    })

    if (!user) return null

    if (!user.has_active_subscription) {
        return (
            <AppShell>
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-8 text-center">
                    <h1 className="text-h2 text-brand-900">Subscription required</h1>
                    <p className="mt-2 text-body-sm text-brand-800">
                        You need an active semester pass to access courses and quizzes.
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

    const totalQuestions = courses?.reduce((sum, c) => sum + c.question_count, 0) ?? 0
    const courseCount = courses?.length ?? 0
    const readyCourses = courses?.filter((c) => c.question_count > 0).length ?? 0

    return (
        <AppShell>
            <div className="space-y-8">
                <header>
                    <p className="text-caption text-brand-700 font-medium">Your Curriculum</p>
                    <h1 className="mt-1 text-h2">{user.level_display} Courses</h1>
                    <p className="mt-1 text-body text-on-surface-muted">{user.program_display}</p>
                </header>

                {!isLoading && courses && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <StatCard label="Total courses" value={courseCount} hint={`${readyCourses} ready · ${courseCount - readyCourses} coming soon`} />
                        <StatCard label="Total questions" value={totalQuestions} hint="More added every week" accent />
                        <StatCard label="Your level" value={user.level_display} hint="All courses for your semester" />
                    </div>
                )}

                {isLoading && (
                    <div className="rounded-xl border border-border bg-white p-8 text-center">
                        <p className="text-on-surface-muted">Loading courses…</p>
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-danger-50 p-4">
                        <p className="text-sm text-danger-700">Failed to load courses.</p>
                    </div>
                )}

                {!isLoading && courses && courses.length === 0 && (
                    <EmptyState
                        title="No courses yet"
                        description={`No courses available for ${user.level_display} ${user.program_display} yet.`}
                    />
                )}

                {!isLoading && active && (
                    <div className="space-y-6">
                        <SemesterTabs
                            groups={grouped}
                            activeSemester={active.semester}
                            onSelect={setSelectedSemester}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            {active.courses.map((course) => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>
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
            <p className="text-caption">{label}</p>
            <p className={`mt-1 text-h3 ${accent ? "text-brand-700" : "text-on-surface"}`}>{value}</p>
            <p className="text-xs text-on-surface-muted">{hint}</p>
        </div>
    )
}

function SemesterTabs({ groups, activeSemester, onSelect }: {
    groups: { label: string; semester: string; courses: Course[] }[]
    activeSemester: string
    onSelect: (semester: string) => void
}) {
    return (
        <div className="border-b border-border">
            <div className="flex gap-1 overflow-x-auto">
                {groups.map((group) => {
                    const isActive = activeSemester === group.semester
                    return (
                        <button
                            key={group.semester}
                            onClick={() => onSelect(group.semester)}
                            className={`relative px-4 py-3 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                isActive ? "text-brand-700" : "text-on-surface-muted hover:text-on-surface hover:bg-surface-subtle"
                            }`}
                        >
                            {group.label}
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                                isActive ? "bg-brand-100 text-brand-700" : "bg-surface-subtle text-on-surface-muted"
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

function CourseCard({ course }: { course: Course }) {
    const hasContent = course.question_count > 0
    const className = `group rounded-xl border p-5 transition-all ${
        hasContent
            ? "border-border bg-white hover:border-brand-300 hover:shadow-sm cursor-pointer"
            : "border-dashed border-border bg-surface-subtle cursor-default"
    }`

    const inner = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium tracking-wide ${hasContent ? "text-brand-600" : "text-on-surface-muted"}`}>
                        {course.code}
                    </p>
                    <h3 className="mt-1 text-h4 truncate">{course.title}</h3>
                    <p className="mt-1 text-xs text-on-surface-muted">{course.category_display}</p>
                </div>
                <div className="text-right shrink-0">
                    {hasContent ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                            {course.question_count} q
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700">
                            Soon
                        </span>
                    )}
                </div>
            </div>

            {hasContent ? (
                <p className="mt-4 text-xs text-on-surface-muted group-hover:text-brand-600 transition-colors">
                    Practice now →
                </p>
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
        if (!map.has(course.semester)) {
            map.set(course.semester, { label: course.semester_display, semester: course.semester, courses: [] })
        }
        map.get(course.semester)!.courses.push(course)
    }
    return Array.from(map.values()).sort((a, b) => a.semester.localeCompare(b.semester))
}
