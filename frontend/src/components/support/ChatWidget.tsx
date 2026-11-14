import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

import { useAuth } from "../../contexts/AuthContext"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"

interface Message {
    role: "user" | "ai"
    text: string
    id: string
}

const SUGGESTED_PROMPTS = [
    "What are the priority interventions for a patient with severe pre-eclampsia?",
    "Explain the mechanism of action of Metformin.",
    "Test my NMC knowledge on Maternal Health.",
    "How do I use the Clinical Logbook?",
]

export default function ChatWidget() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading])

    // Initialize with greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    role: "ai",
                    id: "initial",
                    text: user
                        ? "Greetings. I am your **NursifyGH Chief Clinical Examiner**. I can assist you with advanced pathophysiology, NMC exam preparation, drug calculations, and NANDA care plans. How may I assist you today?"
                        : "Welcome to **NursifyGH**. I am here to help you understand our platform, pricing, or how to sign up. Ask me anything."
                }
            ])
        }
    }, [user, messages.length])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Speech-to-text setup
    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert("Voice input is not supported in your browser.")
            return
        }
        const recognition = new SpeechRecognition()
        recognition.lang = "en-GB"
        recognition.interimResults = false
        recognition.maxAlternatives = 1

        recognition.onstart = () => setIsListening(true)
        recognition.onresult = (event: any) => {
            const speechResult = event.results[0][0].transcript
            setInput((prev) => prev + (prev ? " " : "") + speechResult)
            setIsListening(false)
        }
        recognition.onerror = () => setIsListening(false)
        recognition.onend = () => setIsListening(false)
        recognition.start()
    }

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return

        const userMsg = text.trim()
        setInput("")
        setMessages((prev) => [...prev, { role: "user", text: userMsg, id: Date.now().toString() }])
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
                setMessages((prev) => [...prev, { role: "ai", text: data.reply, id: Date.now().toString() }])
            } else {
                throw new Error("No reply")
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: "I apologise, but I am experiencing a temporary loss of connection. Please try again shortly.",
                    id: Date.now().toString()
                }
            ])
        } finally {
            setIsLoading(false)
        }
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault()
        sendMessage(input)
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const clearChat = () => {
        if (confirm("Are you sure you want to clear this conversation?")) {
            setMessages([])
        }
    }

    return (
        <>
            {/* Chat Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 h-14 w-14 rounded-full bg-brand-700 text-white shadow-xl hover:bg-brand-800 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
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
                    className="fixed bottom-36 right-4 lg:bottom-24 lg:right-6 z-50 w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-border bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
                    style={{ height: "min(600px, calc(100vh - 10rem))" }}
                >
                    {/* Header */}
                    <div className="shrink-0 bg-gradient-to-r from-brand-900 via-brand-800 to-brand-900 px-4 py-3 text-white flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold tracking-wide shadow-inner">
                                AI
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold">Chief Clinical Examiner</p>
                                <div className="flex items-center gap-1.5">
                                    <span className={`h-2 w-2 rounded-full ${isLoading ? "bg-amber-400 animate-pulse" : "bg-green-400"}`} />
                                    <p className="text-[11px] text-brand-100 font-medium">
                                        {isLoading ? "Thinking..." : "Online · NMC Expert"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={clearChat}
                            className="p-2 text-brand-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Clear conversation"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-surface-subtle space-y-5">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>

                                {/* Message Bubble */}
                                <div
                                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed break-words shadow-sm ${msg.role === "user"
                                            ? "bg-brand-700 text-white rounded-br-sm whitespace-pre-wrap"
                                            : "bg-white border border-border text-gray-800 rounded-bl-sm"
                                        }`}
                                >
                                    {msg.role === "user" ? (
                                        msg.text
                                    ) : (
                                        <div className="
                                            [&_p]:mb-3 [&_p:last-child]:mb-0 
                                            [&_strong]:font-bold [&_strong]:text-gray-900
                                            [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-3 [&_ul]:space-y-1
                                            [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-3 [&_ol]:space-y-1
                                            [&_li]:pl-1 [&_li]:marker:text-brand-600
                                            [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-1 [&_h1]:mt-4 [&_h2]:mt-3 [&_h3]:mt-2 [&_h1]:text-gray-900 [&_h2]:text-gray-900 [&_h3]:text-gray-900
                                            [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-sm [&_code]:font-mono [&_code]:text-brand-800
                                        ">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {/* Actions (Only for AI messages) */}
                                {msg.role === "ai" && msg.id !== "initial" && (
                                    <button
                                        onClick={() => copyToClipboard(msg.text, msg.id)}
                                        className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-brand-600 transition-colors"
                                    >
                                        {copiedId === msg.id ? (
                                            <>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                Copy answer
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Suggested Prompts (Only shows when chat is fresh) */}
                        {messages.length === 1 && !isLoading && (
                            <div className="pt-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Try asking:</p>
                                <div className="flex flex-col gap-2">
                                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(prompt)}
                                            className="text-left text-sm bg-white border border-border rounded-xl px-3 py-2.5 text-gray-700 hover:border-brand-400 hover:text-brand-700 transition-colors shadow-sm"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1.5 items-center h-11">
                                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="shrink-0 border-t border-border p-3 bg-white">
                        <div className="flex items-end gap-2">

                            {/* Voice Input Button */}
                            <button
                                type="button"
                                onClick={startListening}
                                className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${isListening ? "bg-red-100 text-red-600 animate-pulse" : "bg-surface-subtle text-gray-500 hover:text-brand-600"
                                    }`}
                                title="Voice input"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>

                            {/* Text Input */}
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a clinical question..."
                                className="flex-1 rounded-xl border border-border bg-surface-subtle px-3.5 py-2.5 text-[15px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                            />

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-40 transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                            AI can make mistakes. Always verify clinical answers.
                        </p>
                    </form>
                </div>
            )}
        </>
    )
}