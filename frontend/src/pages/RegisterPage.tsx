import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AxiosError } from "axios"

import { useAuth } from "../contexts/AuthContext"
import type { StudentLevel } from "../types/api"

type FieldErrors = Record<string, string[]>

export default function RegisterPage() {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({
        email: "",
        full_name: "",
        phone_number: "",
        level: "100" as "100" | "200" | "300",
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
        setError(null)
        setFieldErrors({})
        setSubmitting(true)
        try {
            await register({
                email: form.email,
                full_name: form.full_name,
                phone_number: form.phone_number,
                level: Number(form.level) as StudentLevel,
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

    function fieldError(name: keyof typeof form): string | null {
        const list = fieldErrors[name]
        return list && list.length > 0 ? list.join(" ") : null
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="card max-w-md w-full">
                <h1 className="text-2xl font-bold text-brand-700">Create your account</h1>
                <p className="mt-1 text-sm text-gray-500">
                    For nursing &amp; midwifery students in Ghana.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            className="input mt-1"
                            placeholder="you@example.com"
                        />
                        {fieldError("email") && (
                            <p className="mt-1 text-xs text-red-600">{fieldError("email")}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                            Full name
                        </label>
                        <input
                            id="full_name"
                            type="text"
                            required
                            autoComplete="name"
                            value={form.full_name}
                            onChange={(e) => set("full_name", e.target.value)}
                            className="input mt-1"
                            placeholder="Ama Mensah"
                        />
                        {fieldError("full_name") && (
                            <p className="mt-1 text-xs text-red-600">{fieldError("full_name")}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                            Phone number
                        </label>
                        <input
                            id="phone_number"
                            type="tel"
                            required
                            autoComplete="tel"
                            value={form.phone_number}
                            onChange={(e) => set("phone_number", e.target.value)}
                            className="input mt-1"
                            placeholder="0244123456"
                        />
                        {fieldError("phone_number") && (
                            <p className="mt-1 text-xs text-red-600">{fieldError("phone_number")}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                            Academic level
                        </label>
                        <select
                            id="level"
                            value={form.level}
                            onChange={(e) => set("level", e.target.value as "100" | "200" | "300")}
                            className="input mt-1"
                        >
                            <option value="100">Level 100</option>
                            <option value="200">Level 200</option>
                            <option value="300">Level 300</option>
                        </select>
                        {fieldError("level") && (
                            <p className="mt-1 text-xs text-red-600">{fieldError("level")}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
                            Institution
                        </label>
                        <input
                            id="institution"
                            type="text"
                            value={form.institution}
                            onChange={(e) => set("institution", e.target.value)}
                            className="input mt-1"
                            placeholder="Korle Bu Nursing Training College"
                        />
                        {fieldError("institution") && (
                            <p className="mt-1 text-xs text-red-600">{fieldError("institution")}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={form.password}
                            onChange={(e) => set("password", e.target.value)}
                            className="input mt-1"
                            placeholder="At least 8 characters"
                        />
                        {fieldError("password") && (
                            <p className="mt-1 text-xs text-red-600">{fieldError("password")}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">
                            Confirm password
                        </label>
                        <input
                            id="password_confirm"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={form.password_confirm}
                            onChange={(e) => set("password_confirm", e.target.value)}
                            className="input mt-1"
                            placeholder="Repeat password"
                        />
                        {fieldError("password_confirm") && (
                            <p className="mt-1 text-xs text-red-600">{fieldError("password_confirm")}</p>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={submitting} className="btn-primary w-full">
                        {submitting ? "Creating account…" : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link to="/login" className="text-brand-600 hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}