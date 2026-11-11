import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import api from "../api/client"
import AppShell from "../components/shell/AppShell"
import Button from "../components/ui/Button"

interface Submission {
    id: string
    text: string
    course_code: string
    course_title: string
    review_status: "PENDING" | "APPROVED" | "REJECTED"
    review_note: string
    created_at: string
}

export default function MySubmissionsPage() {
    const { data: submissions, isLoading } = useQuery({
        queryKey: ["my-submissions"],
        queryFn: async () => {
            const res = await api.get<Submission[]>("/academics/my-submissions/")
            return res.data
        },
    })

    const pending = submissions?.filter((s) => s.review_status === "PENDING") ?? []
    const approved = submissions?.filter((s) => s.review_status === "APPROVED") ?? []
    const rejected = submissions?.filter((s) => s.review_status === "REJECTED") ?? []

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
                <div>
                    <h1 className="text-2xl font-bold text-on-surface">My Submissions</h1>
                    <p className="text-sm text-on-surface-muted mt-1">
                        Questions you've uploaded from past papers. They appear in quizzes
                        only after review by our team.
                    </p>
                </div>

                {isLoading && (
                    <div className="rounded-xl border border-border bg-white p-8 text-center">
                        <p className="text-on-surface-muted">Loading…</p>
                    </div>
                )}

                {!isLoading && submissions && submissions.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center">
                        <p className="text-sm font-medium text-on-surface">No submissions yet.</p>
                        <p className="text-xs text-on-surface-muted mt-1">
                            Upload a past paper from any course to add questions.
                        </p>
                        <Link to="/courses" className="mt-4 inline-block">
                            <Button>Browse courses</Button>
                        </Link>
                    </div>
                )}

                {pending.length > 0 && (
                    <Section title="⏳ Pending review" count={pending.length}>
                        {pending.map((s) => <SubmissionRow key={s.id} submission={s} />)}
                    </Section>
                )}

                {approved.length > 0 && (
                    <Section title="✅ Approved" count={approved.length}>
                        {approved.map((s) => <SubmissionRow key={s.id} submission={s} />)}
                    </Section>
                )}

                {rejected.length > 0 && (
                    <Section title="❌ Rejected" count={rejected.length}>
                        {rejected.map((s) => <SubmissionRow key={s.id} submission={s} />)}
                    </Section>
                )}
            </div>
        </AppShell>
    )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-sm font-semibold text-on-surface mb-3">{title} · {count}</h2>
            <div className="space-y-2">{children}</div>
        </section>
    )
}

function SubmissionRow({ submission }: { submission: Submission }) {
    return (
        <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-sm text-on-surface font-medium line-clamp-2">{submission.text}</p>
            <p className="text-xs text-on-surface-muted mt-1">
                {submission.course_code} · {submission.course_title} ·{" "}
                {new Date(submission.created_at).toLocaleDateString("en-GB")}
            </p>
            {submission.review_note && (
                <p className="mt-2 text-xs text-amber-800 bg-amber-50 rounded p-2">
                    <strong>Reviewer note:</strong> {submission.review_note}
                </p>
            )}
        </div>
    )
}