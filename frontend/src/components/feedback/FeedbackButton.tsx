import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { submitFeedback } from "../../api/feedback"

export default function FeedbackButton() {
    const [open, setOpen] = useState(false)
    const [type, setType] = useState("SUGGESTION")
    const [subject, setSubject] = useState("")
    const [message, setMessage] = useState("")
    const [success, setSuccess] = useState(false)

    const mutation = useMutation({
        mutationFn: submitFeedback,
        onSuccess: () => {
            setSuccess(true)
            setTimeout(() => {
                setOpen(false)
                setSuccess(false)
                setSubject("")
                setMessage("")
                setType("SUGGESTION")
            }, 2000)
        },
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        mutation.mutate({
            feedback_type: type,
            subject: subject.trim(),
            message: message.trim(),
            page_url: window.location.pathname,
        })
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-40 right-4 lg:bottom-24 lg:right-8 z-40 h-12 w-12 rounded-full bg-white border border-border text-brand-700 shadow-lg hover:bg-brand-50 hover:border-brand-300 flex items-center justify-center transition-all hover:scale-105 print:hidden"
                aria-label="Send feedback"
                title="Send feedback"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-brand-700 to-brand-800 text-white">
                            <h2 className="text-lg font-bold">Send us feedback</h2>
                            <p className="text-xs text-brand-100 mt-0.5">We read every message personally.</p>
                        </div>

                        {success ? (
                            <div className="p-12 text-center">
                                <div className="inline-flex h-16 w-16 rounded-full bg-green-100 text-green-600 items-center justify-center mb-4">
                                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Thank you!</h3>
                                <p className="text-sm text-gray-600">We'll review your feedback within 24 hours.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                        What type of feedback?
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { value: "SUGGESTION", label: "💡 Suggestion" },
                                            { value: "BUG", label: "🐛 Bug" },
                                            { value: "QUESTION", label: "❓ Question" },
                                            { value: "COMPLAINT", label: "😤 Complaint" },
                                            { value: "PRAISE", label: "👍 Praise" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setType(opt.value)}
                                                className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${type === opt.value
                                                        ? "border-brand-500 bg-brand-50 text-brand-800"
                                                        : "border-gray-200 bg-white text-gray-700 hover:border-brand-300"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Brief summary"
                                        maxLength={200}
                                        required
                                        minLength={5}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Tell us what's on your mind..."
                                        rows={5}
                                        required
                                        minLength={10}
                                        maxLength={2000}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={mutation.isPending}
                                        className="flex-1 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-50"
                                    >
                                        {mutation.isPending ? "Sending..." : "Send feedback"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}