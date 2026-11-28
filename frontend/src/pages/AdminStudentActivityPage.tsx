import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import AppShell from "../components/shell/AppShell"
import api from "../api/client"

interface LoginRow {
  id: number
  user_name: string
  user_email: string
  program: string
  ip_address: string
  logged_in_at: string | null
}

interface ActionRow {
  id: number
  user_name: string
  user_email: string
  program: string
  action_type: string
  summary: string
  created_at: string | null
}

interface ActivityPayload {
  total_students: number
  filtered_students_count: number
  program_breakdown: { program: string; count: number }[]
  nac_nap_courses: {
    code: string
    title: string
    program: string
    level: number
    semester: string
    question_count: number
  }[]
  nac_nap_total_questions: number
  students: {
    id: number
    full_name: string
    email: string
    phone_number: string
    program: string
    level: number
    institution: string
    is_active: boolean
    last_login: string | null
    date_joined: string
  }[]
  recent_attempts: {
    id: number
    student_name: string
    student_email: string
    program: string
    level: number
    course_code: string
    course_title: string
    score: number | string | null
    created_at: string | null
  }[]
  login_history?: LoginRow[]
  user_actions?: ActionRow[]
}

export default function AdminStudentActivityPage() {
  const [data, setData] = useState<ActivityPayload | null>(null)
  const [program, setProgram] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadActivity(nextProgram = program, nextQuery = query) {
    setLoading(true)
    setError("")
    try {
      const res = await api.get("/accounts/admin/student-activity/", {
        params: {
          ...(nextProgram ? { program: nextProgram } : {}),
          ...(nextQuery.trim() ? { q: nextQuery.trim() } : {}),
        },
      })
      setData(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.error || "Failed to load student activity.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivity()
  }, [])

  const logins = data?.login_history || []
  const actions = data?.user_actions || []

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Activity &amp; Login Tracker</h1>
            <p className="text-sm text-slate-600">
              Monitor user logins, what students do across the platform, quizzes, and NAC/NAP tracks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin-control" className="px-3 py-2 text-sm font-semibold rounded-lg bg-brand-700 text-white hover:bg-brand-800">
              Control Center
            </Link>
            <Link to="/admin-commissions" className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50">
              Commissions &amp; Payouts
            </Link>
            <Link to="/admin-notifications" className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50">
              Notifications &amp; Feedback
            </Link>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadActivity(program, query)
          }}
          className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-slate-200"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student name, email, phone, or college..."
            className="flex-1 min-w-[220px] px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={program}
            onChange={(e) => {
              const val = e.target.value
              setProgram(val)
              loadActivity(val, query)
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Programs</option>
            <option value="GENERAL">RGN (General)</option>
            <option value="MIDWIFERY">RM (Midwifery)</option>
            <option value="PSYCHIATRIC">RPN (Psychiatric)</option>
            <option value="COMMUNITY">CHN (Community Health)</option>
            <option value="NAC">NAC (Nurse Assistant Clinical)</option>
            <option value="NAP">NAP (Nurse Assistant Preventive)</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-semibold">
            Filter
          </button>
        </form>

        {error && <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        {loading && !data ? (
          <div className="p-6 text-sm text-slate-500">Loading student activity...</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-medium text-slate-500 uppercase">Registered Students</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{data.total_students}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-medium text-slate-500 uppercase">Recorded Logins</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{logins.length}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-medium text-slate-500 uppercase">User Actions</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{actions.length}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-medium text-slate-500 uppercase">NAC &amp; NAP Questions</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{data.nac_nap_total_questions}</div>
              </div>
            </div>

            {/* Login History */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">
                Recent User Logins
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Program</th>
                      <th className="py-2.5 px-4">IP Address</th>
                      <th className="py-2.5 px-4">Logged In At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logins.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-slate-900">{l.user_name}</div>
                          <div className="text-xs text-slate-500">{l.user_email}</div>
                        </td>
                        <td className="py-2.5 px-4">{l.program || "-"}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">{l.ip_address || "-"}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          {l.logged_in_at ? new Date(l.logged_in_at).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                    {logins.length === 0 && (
                      <tr><td colSpan={4} className="py-4 px-4 text-slate-500">No login events recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* What Users Do */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">
                What Users Do (Activity Log)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Details</th>
                      <th className="py-2.5 px-4">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {actions.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-slate-900">{a.user_name}</div>
                          <div className="text-xs text-slate-500">{a.program || "-"}</div>
                        </td>
                        <td className="py-2.5 px-4 text-xs font-semibold text-brand-800">{a.action_type}</td>
                        <td className="py-2.5 px-4 text-slate-800">{a.summary}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          {a.created_at ? new Date(a.created_at).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                    {actions.length === 0 && (
                      <tr><td colSpan={4} className="py-4 px-4 text-slate-500">No user actions recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Registered Students */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">
                Registered Students ({data.filtered_students_count})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Program</th>
                      <th className="py-2.5 px-4">Level</th>
                      <th className="py-2.5 px-4">Institution</th>
                      <th className="py-2.5 px-4">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.students.map((st) => (
                      <tr key={st.id}>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-slate-900">{st.full_name}</div>
                          <div className="text-xs text-slate-500">{st.email}</div>
                        </td>
                        <td className="py-2.5 px-4">{st.program || "-"}</td>
                        <td className="py-2.5 px-4">{st.level ? `L${st.level}` : "-"}</td>
                        <td className="py-2.5 px-4">{st.institution || "-"}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">
                          {st.last_login ? new Date(st.last_login).toLocaleString() : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Quiz Attempts */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">
                Recent Quiz Attempts
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Program</th>
                      <th className="py-2.5 px-4">Course</th>
                      <th className="py-2.5 px-4">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recent_attempts.map((att) => (
                      <tr key={att.id}>
                        <td className="py-2.5 px-4">{att.student_name}</td>
                        <td className="py-2.5 px-4">{att.program || "-"}</td>
                        <td className="py-2.5 px-4">{att.course_code ? `${att.course_code} — ${att.course_title}` : "-"}</td>
                        <td className="py-2.5 px-4">{att.score ?? "-"}</td>
                      </tr>
                    ))}
                    {data.recent_attempts.length === 0 && (
                      <tr><td colSpan={4} className="py-4 px-4 text-slate-500">No quiz attempts found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  )
}
