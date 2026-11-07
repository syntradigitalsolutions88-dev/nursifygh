import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

import { useAuth } from "../../contexts/AuthContext"

interface Message {
    role: "user" | "ai"
    text: string
}

export default function ChatWidget() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading])

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    role: "ai",
                    text: user
                        ? "Hi! I'm your **NursifyGH academic tutor**. Ask me any nursing question, or how to use the app!"
                        : "Hi there! Welcome to **NursifyGH**. Ask me anything about how our platform works or how to sign up!"
                }
            ])
        }
    }, [user, messages.length])

    async function handleSend(e: React.FormEvent) {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMsg = input.trim()
        setInput("")
        setMessages((prev) => [...prev, { role: "user", text: userMsg }])
        setIsLoading(true)

        try {
            const response = await fetch("http://127.0.0.1:8000/api/accounts/ai-chat/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    mode: user ? "student" : "public",
                }),
            })

            const data = await response.json()

            if (data.reply) {
                setMessages((prev) => [...prev, { role: "ai", text: data.reply }])
            } else {
                throw new Error("No reply")
            }
        } catch (error) {
            setMessages((prev) => [...prev, { role: "ai", text: "Sorry, I'm having trouble connecting right now. Please try again later." }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 h-14 w-14 rounded-full bg-brand-700 text-white shadow-lg hover:bg-brand-800 flex items-center justify-center transition-transform hover:scale-105"
                aria-label="Toggle Chat"
            >
                {isOpen ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div
                    className="fixed bottom-36 right-4 lg:bottom-24 lg:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border bg-white shadow-2xl flex flex-col overflow-hidden"
                    style={{ height: "min(520px, calc(100vh - 10rem))" }}
                >
                    {/* Header — clean, no emoji, professional */}
                    <div className="shrink-0 bg-brand-700 px-4 py-3 text-white flex items-center gap-3 z-10">
                        <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold tracking-wide">
                            AI
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold">NursifyGH Assistant</p>
                            <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                <p className="text-[11px] text-brand-100">Online · {user ? "Tutor" : "Support"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages — only this scrolls */}
                    <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-surface-subtle space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-base leading-relaxed break-words ${msg.role === "user"
                                        ? "bg-brand-700 text-white rounded-br-sm whitespace-pre-wrap"
                                        : "bg-white border border-border text-on-surface rounded-bl-sm shadow-sm prose prose-sm max-w-none prose-p:my-1 prose-headings:mt-2 prose-headings:mb-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0"
                                        }`}
                                >
                                    {msg.role === "user" ? (
                                        msg.text
                                    ) : (
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm flex gap-1 items-center h-9">
                                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="shrink-0 border-t border-border p-3 bg-white flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your question..."
                            className="flex-1 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-base focus:outline-none focus:border-brand-500"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 shrink-0"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </>
    )
}