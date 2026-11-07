import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AxiosError } from "axios"

import AuthLayout from "../components/shell/AuthLayout"
import Alert from "../components/ui/Alert"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import { useAuth } from "../contexts/AuthContext"
import type { NursingProgram, StudentLevel } from "../types/api"

type FieldErrors = Record<string, string[]>

export default function RegisterPage() {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({
        email: "",
        full_name: "",
        phone_number: "",
        level: "100" as "100" | "200" | "300",
        program: "GENERAL" as NursingProgram,
        institution: "",
        password: "",
        password_confirm: "",
    })
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [submitting, setSubmitting] = useState(false)

    function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
        setForm((f) => ({ ...f, [key]: value }))
    }

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (submitting) return

        setError(null)
        setFieldErrors({})
        setSubmitting(true)
        try {
            await register({
                email: form.email,
                full_name: form.full_name,
                phone_number: form.phone_number,
                level: Number(form.level) as StudentLevel,
                program: form.program,
                institution: form.institution,
                password: form.password,
                password_confirm: form.password_confirm,
            })
            navigate("/dashboard", { replace: true })
        } catch (err) {
            if (err instanceof AxiosError) {
                if (err.response?.status === 400) {
                    const data = err.response.data
                    if (typeof data === "object" && data !== null) {
                        setFieldErrors(data as FieldErrors)
                    } else {
                        setError("Please check the form and try again.")
                    }
                } else {
                    setError("Registration failed. Please try again.")
                }
            } else {
                setError("Network error. Is the backend running?")
            }
        } finally {
            setSubmitting(false)
        }
    }

    function fieldError(name: keyof typeof form): string | undefined {
        const list = fieldErrors[name]
        return list && list.length > 0 ? list.join(" ") : undefined
    }

    return (
        <AuthLayout>
            <div className="rounded-xl border border-border bg-white p-6 sm:p-8 shadow-sm">
                <h1 className="text-h2 text-brand-700">Create your account</h1>
                <p className="mt-1.5 text-body-sm text-on-surface-muted">
                    For nursing &amp; midwifery students in Ghana.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="you@example.com"
                        error={fieldError("email")}
                        disabled={submitting}
                    />
                    <Input
                        label="Full name"
                        type="text"
                        required
                        autoComplete="name"
                        value={form.full_name}
                        onChange={(e) => set("full_name", e.target.value)}
                        placeholder="Ama Mensah"
                        error={fieldError("full_name")}
                        disabled={submitting}
                    />
                    <Input
                        label="Phone number"
                        type="tel"
                        required
                        autoComplete="tel"
                        value={form.phone_number}
                        onChange={(e) => set("phone_number", e.target.value)}
                        placeholder="0244123456"
                        helper="Used for Mobile Money and account recovery"
                        error={fieldError("phone_number")}
                        disabled={submitting}
                    />

                    <div>
                        <label
                            htmlFor="program"
                            className="block text-sm font-medium text-on-surface mb-1.5"
                        >
                            Nursing program
                        </label>
                        <select
                            id="program"
                            value={form.program}
                            onChange={(e) => set("program", e.target.value as NursingProgram)}
                            disabled={submitting}
                            className="block w-full h-11 rounded-lg border border-border bg-white px-3.5 text-sm text-on-surface focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
                        >
                            <option value="GENERAL">General Nursing (RGN)</option>
                            <option value="MIDWIFERY">Midwifery (RM)</option>
                            <option value="PSYCHIATRIC">Psychiatric Nursing (RPN)</option>
                            <option value="COMMUNITY">Community Health Nursing (CHN)</option>
                        </select>
                        {fieldError("program") && (
                            <p className="mt-1.5 text-sm text-danger-700">
                                {fieldError("program")}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="level"
                            className="block text-sm font-medium text-on-surface mb-1.5"
                        >
                            Academic level
                        </label>
                        <select
                            id="level"
                            value={form.level}
                            onChange={(e) => set("level", e.target.value as "100" | "200" | "300")}
                            disabled={submitting}
                            className="block w-full h-11 rounded-lg border border-border bg-white px-3.5 text-sm text-on-surface focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
                        >
                            <option value="100">Level 100</option>
                            <option value="200">Level 200</option>
                            <option value="300">Level 300</option>
                        </select>
                        {fieldError("level") && (
                            <p className="mt-1.5 text-sm text-danger-700">
                                {fieldError("level")}
                            </p>
                        )}
                    </div>

                    <Input
                        label="Institution"
                        type="text"
                        value={form.institution}
                        onChange={(e) => set("institution", e.target.value)}
                        placeholder="Korle Bu Nursing Training College"
                        error={fieldError("institution")}
                        disabled={submitting}
                    />

                    <Input
                        label="Password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        placeholder="At least 8 characters"
                        error={fieldError("password")}
                        disabled={submitting}
                    />
                    <Input
                        label="Confirm password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={form.password_confirm}
                        onChange={(e) => set("password_confirm", e.target.value)}
                        placeholder="Repeat password"
                        error={fieldError("password_confirm")}
                        disabled={submitting}
                    />

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Button type="submit" fullWidth loading={submitting} size="lg" disabled={submitting}>
                        {submitting ? "Creating account…" : "Create account"}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-on-surface-muted">
                    Already have an account?{" "}
                    <Link to="/login" className="font-medium text-brand-700 hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
        </AuthLayout>
    )
}