import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

import { useAuth } from "../../contexts/AuthContext"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"

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
                        ? "Hello. I am your **NursifyGH Academic Tutor**. I can help you with clinical concepts, NMC exam questions, NANDA care plans, or how to use the platform. How may I assist you today?"
                        : "Welcome to **NursifyGH**. I am here to help you understand our platform, pricing, or how to sign up. Ask me anything."
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
            const response = await fetch(`${API_BASE}/accounts/ai-chat/`, {
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
            setMessages((prev) => [...prev, { role: "ai", text: "I apologise, but I am having trouble connecting right now. Please try again shortly." }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
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

            {isOpen && (
                <div
                    className="fixed bottom-36 right-4 lg:bottom-24 lg:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border bg-white shadow-2xl flex flex-col overflow-hidden"
                    style={{ height: "min(520px, calc(100vh - 10rem))" }}
                >
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

                    <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-surface-subtle space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-base leading-relaxed break-words ${
                                        msg.role === "user"
                                            ? "bg-brand-700 text-white rounded-br-sm whitespace-pre-wrap"
                                            : "bg-white border border-border text-on-surface rounded-bl-sm shadow-sm"
                                    }`}
                                >
                                    {msg.role === "user" ? (
                                        msg.text
                                    ) : (
                                        <div className="
                                            [&_p]:mb-2 [&_p:last-child]:mb-0 
                                            [&_strong]:font-semibold [&_strong]:text-gray-900
                                            [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2
                                            [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2
                                            [&_li]:mb-1 [&_li]:pl-1
                                            [&_h1]:text-lg [&_h2]:text-md [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:mb-2 [&_h2]:mb-1 [&_h3]:mb-1 [&_h1]:mt-3 [&_h2]:mt-2 [&_h3]:mt-2
                                            [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                                        ">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        </div>
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