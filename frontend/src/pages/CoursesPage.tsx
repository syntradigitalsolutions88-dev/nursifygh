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
  const [selectedSemester, setSelectedSemester] = useState("ALL")
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
          <h1 className="text-2xl font-bold text-brand-900">
            Subscribe to unlock 2,113+ questions
          </h1>
          <p className="mt-2 text-sm text-brand-800 max-w-md mx-auto">
            Get instant access to all courses, mock exams, clinical logbook, and AI care plans for GHS 30 per semester.
          </p>
          <Link to="/subscribe" className="mt-6 inline-block">
            <Button size="lg">Subscribe for GHS 30 -&gt;</Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const grouped = groupBySemester(courses ?? [])
  const q = search.trim().toLowerCase()
  const visibleGroups = q
    ? grouped
        .map((g) => ({
          ...g,
          courses: g.courses.filter(
            (c) =>
              c.title.toLowerCase().includes(q) ||
              c.code.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.courses.length > 0)
    : selectedSemester === "ALL"
      ? grouped
      : grouped.filter((g) => g.semester === selectedSemester)

  const totalQuestions = courses?.reduce((sum, c) => sum + c.question_count, 0) ?? 0
  const courseCount = courses?.length ?? 0
  const readyCourses = courses?.filter((c) => c.question_count > 0).length ?? 0

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto pb-10 w-full min-w-0 overflow-x-hidden">
        <header>
          <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            Your Curriculum
          </p>
          <h1 className="mt-1 text-h1">{user.level_display} Courses</h1>
          <p className="mt-1 text-body-sm text-on-surface-muted">
            {user.program_display} · {courseCount} courses available
          </p>
        </header>

        {!isLoading && courses && (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Total Courses"
              value={courseCount}
              hint={`${readyCourses} ready · ${courseCount - readyCourses} coming soon`}
            />
            <StatCard
              label="Total Questions"
              value={totalQuestions.toLocaleString()}
              hint="More added every week"
              accent
            />
            <StatCard
              label="Your Level"
              value={user.level_display}
              hint="All courses for your level"
            />
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-white p-5 animate-pulse h-28" />
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

        {!isLoading && grouped.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-border overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                <button
                  type="button"
                  onClick={() => setSelectedSemester("ALL")}
                  className={`relative px-4 py-3 rounded-t-lg text-sm font-medium whitespace-nowrap ${
                    selectedSemester === "ALL"
                      ? "text-brand-700"
                      : "text-on-surface-muted hover:text-on-surface"
                  }`}
                >
                  All Semesters
                  <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                    {courseCount}
                  </span>
                </button>
                {grouped.map((g) => (
                  <button
                    key={g.semester}
                    type="button"
                    onClick={() => setSelectedSemester(g.semester)}
                    className={`relative px-4 py-3 rounded-t-lg text-sm font-medium whitespace-nowrap ${
                      selectedSemester === g.semester
                        ? "text-brand-700"
                        : "text-on-surface-muted hover:text-on-surface"
                    }`}
                  >
                    {g.label}
                    <span className="ml-2 rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-bold text-on-surface-muted">
                      {g.courses.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses across semesters..."
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm"
              />
            </div>

            {visibleGroups.length === 0 ? (
              <div className="rounded-xl border border-border bg-white p-8 text-center">
                <p className="text-sm text-on-surface-muted">No courses match your search.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {visibleGroups.map((group) => (
                  <section key={group.semester} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <h2 className="text-base font-bold text-on-surface">{group.label}</h2>
                      <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full shrink-0">
                        {group.courses.length} courses · {group.courses.reduce((s, c) => s + c.question_count, 0).toLocaleString()} Questions
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {group.courses.map((course) => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          isAdmin={Boolean((user as { is_superuser?: boolean }).is_superuser)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string
  value: number | string
  hint: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent ? "text-brand-700" : "text-on-surface"}`}>
        {value}
      </p>
      <p className="text-xs text-on-surface-muted mt-0.5">{hint}</p>
    </div>
  )
}

function CourseCard({ course, isAdmin }: { course: Course; isAdmin?: boolean }) {
  const hasContent = course.question_count > 0
  const className = `group block w-full min-w-0 rounded-xl border p-4 sm:p-5 transition-all ${
    hasContent
      ? "border-border bg-white hover:border-brand-400 hover:shadow-md cursor-pointer"
      : "border-dashed border-border bg-surface-subtle/50 cursor-default"
  }`

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-bold tracking-wide ${hasContent ? "text-brand-600" : "text-on-surface-muted"}`}>
          {course.code}
        </span>
        {hasContent ? (
          <span className="inline-flex items-center rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-bold text-brand-700">
            {course.question_count} Questions
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            Soon
          </span>
        )}
      </div>

      <h3 className="mt-1.5 text-h4 line-clamp-2 group-hover:text-brand-700 transition-colors">
        {course.title}
      </h3>
      <p className="mt-1 text-xs text-on-surface-muted">{course.category_display}</p>

      {isAdmin && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">
            {course.program_display}
          </span>
          <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">
            {course.level_display}
          </span>
        </div>
      )}

      {hasContent ? (
        <p className="mt-4 text-xs font-semibold text-brand-600 group-hover:text-brand-700">
          Practice now -&gt;
        </p>
      ) : (
        <p className="mt-4 text-xs font-medium text-on-surface-muted">
          Content arriving this semester
        </p>
      )}
    </>
  )

  return hasContent ? (
    <Link to={`/quizzes/${course.id}`} className={className}>
      {inner}
    </Link>
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
