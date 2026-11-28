import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import AppShell from "../components/shell/AppShell"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import api from "../api/client"

type DepartmentId = "RGN" | "RM" | "RPN" | "CHN" | "NAC" | "NAP"

interface DepartmentTool {
    id: string
    label: string
    hint: string
    promptPrefix: string
}

interface DepartmentConfig {
    id: DepartmentId
    shortName: string
    fullName: string
    badgeText: string
    bannerGradient: string
    accentBorder: string
    accentBg: string
    accentText: string
    tagline: string
    placeholder: string
    tools: DepartmentTool[]
    sampleQuestions: string[]
}

interface TutorMessage {
    id: string
    role: "user" | "tutor"
    content: string
    imageUrl?: string
    framework?: string
    deptBadge?: string
    topicHint?: string
}

interface SavedPearl {
    id: string
    department: DepartmentId
    title: string
    content: string
    savedAt: string
}

const DEPARTMENTS: Record<DepartmentId, DepartmentConfig> = {
    RGN: {
        id: "RGN",
        shortName: "RGN",
        fullName: "General Nursing",
        badgeText: "RGN • Medical-Surgical & General Care",
        bannerGradient: "from-[#064e3b] via-[#065f46] to-[#0f766e]",
        accentBorder: "border-emerald-700",
        accentBg: "bg-emerald-50",
        accentText: "text-emerald-900",
        tagline: "Talk through ward cases, med-surg pathophysiology, NANDA care plans, IV calculations & N&MC exam prep.",
        placeholder: "Say hello, share what you're struggling with, or ask any RGN question...",
        tools: [
            {
                id: "rgn-medsurg",
                label: "Med-Surg ABCDE Breakdown",
                hint: "Pathophysiology, red flags & bedside priorities",
                promptPrefix: "As an RGN General Nursing clinical tutor in Ghana, give a structured pathophysiology and ABCDE bedside priority breakdown for:",
            },
            {
                id: "rgn-ncp",
                label: "NANDA Care Plan",
                hint: "PES diagnosis, SMART goals & rationales",
                promptPrefix: "Build a complete RGN NANDA-I nursing care plan (Assessment cues, PES diagnosis, SMART goals, and interventions with rationales) for:",
            },
            {
                id: "rgn-pharma",
                label: "Drug & IV Calculation",
                hint: "Mechanism, ward dosing, toxicity & drip rate",
                promptPrefix: "Provide an RGN pharmacology & dosage safety guide (mechanism, reconstitution/drip calculation, monitoring & antidote) for:",
            },
            {
                id: "rgn-drill",
                label: "RGN Licensure Drill (3 MCQs)",
                hint: "Application & analysis exam questions",
                promptPrefix: "Create 3 Ghanaian N&MC RGN licensure-style multiple-choice questions (A–D) with correct answers and clinical rationales on:",
            },
        ],
        sampleQuestions: [
            "Acute decompensated heart failure & furosemide nursing priorities",
            "Diabetic ketoacidosis (DKA) step-by-step fluid & insulin management",
            "Blood transfusion reaction signs & immediate ward actions",
            "Calculate IV flow rate: 1,000 mL Normal Saline over 8 hours (20 gtt/mL)",
        ],
    },
    RM: {
        id: "RM",
        shortName: "RM",
        fullName: "Midwifery",
        badgeText: "RM • Obstetric, Maternal & Neonatal Care",
        bannerGradient: "from-[#881337] via-[#9f1239] to-[#be185d]",
        accentBorder: "border-rose-700",
        accentBg: "bg-rose-50",
        accentText: "text-rose-900",
        tagline: "Discuss obstetric emergencies, partograph interpretation, MgSO4 & PPH protocols, and newborn care.",
        placeholder: "Say hello, share a labour ward question, or ask any Midwifery topic...",
        tools: [
            {
                id: "rm-emergency",
                label: "Obstetric Emergency Protocol",
                hint: "PPH, eclampsia & maternal stabilization",
                promptPrefix: "As a Ghanaian Midwifery (RM) tutor, outline the urgent obstetric emergency protocol, clinical signs, and life-saving midwifery actions for:",
            },
            {
                id: "rm-partograph",
                label: "Labour & Partograph Guide",
                hint: "Cervical dilatation, alert/action lines & fetal wellbeing",
                promptPrefix: "Explain the midwifery labour assessment, partograph interpretation (alert vs action lines), and fetal heart monitoring for:",
            },
            {
                id: "rm-neonatal",
                label: "Newborn & Postnatal Care",
                hint: "APGAR, Helping Babies Breathe & puerperium",
                promptPrefix: "Give a structured midwifery neonatal/postnatal assessment and care guide aligned with Ghana GHS/N&MC standards for:",
            },
            {
                id: "rm-drill",
                label: "RM Licensure Drill (3 MCQs)",
                hint: "Obstetric & midwifery board questions",
                promptPrefix: "Create 3 Ghanaian N&MC Registered Midwifery (RM) licensure-style MCQs (A–D) with answers and rationales on:",
            },
        ],
        sampleQuestions: [
            "Magnesium sulfate toxicity signs & calcium gluconate antidote protocol",
            "Postpartum haemorrhage (PPH) 4 Ts assessment & immediate management",
            "Partograph alert line vs action line interpretation in active labour",
            "Essential newborn care & neonatal resuscitation first golden minute",
        ],
    },
    RPN: {
        id: "RPN",
        shortName: "RPN",
        fullName: "Mental Health",
        badgeText: "RPN • Psychiatric & Mental Health Nursing",
        bannerGradient: "from-[#312e81] via-[#3730a3] to-[#4338ca]",
        accentBorder: "border-indigo-700",
        accentBg: "bg-indigo-50",
        accentText: "text-indigo-900",
        tagline: "Explore Mental Status Exams (MSE), psychopharmacology, therapeutic communication & Mental Health Act 846.",
        placeholder: "Say hello, talk through a psychiatric case, or ask any RPN question...",
        tools: [
            {
                id: "rpn-mse",
                label: "Mental Status Exam (MSE)",
                hint: "Appearance, speech, mood/affect, thought & insight",
                promptPrefix: "As a Registered Mental Health Nursing (RPN) tutor in Ghana, structure a comprehensive Mental Status Examination (MSE) and risk assessment for:",
            },
            {
                id: "rpn-psychopharm",
                label: "Psychopharmacology Safety",
                hint: "Antipsychotics, EPS, NMS, lithium & mood stabilizers",
                promptPrefix: "Provide an RPN psychopharmacology guide covering mechanism, therapeutic monitoring, extrapyramidal/neuroleptic malignant signs, and patient teaching for:",
            },
            {
                id: "rpn-comm",
                label: "Therapeutic Communication & Act 846",
                hint: "De-escalation, involuntary admission & patient rights",
                promptPrefix: "Explain therapeutic communication techniques, de-escalation, and Ghana Mental Health Act 2012 (Act 846) legal/ethical safeguards for:",
            },
            {
                id: "rpn-drill",
                label: "RPN Licensure Drill (3 MCQs)",
                hint: "Psychiatric clinical judgment questions",
                promptPrefix: "Create 3 Ghanaian N&MC Registered Mental Health Nursing (RPN) licensure-style MCQs (A–D) with rationales on:",
            },
        ],
        sampleQuestions: [
            "Neuroleptic Malignant Syndrome (NMS) vs Extrapyramidal Side Effects (EPS)",
            "Components of a complete Mental Status Examination (MSE)",
            "Ghana Mental Health Act 2012 (Act 846) voluntary vs involuntary admission",
            "Therapeutic communication & safety priorities for an acutely suicidal patient",
        ],
    },
    CHN: {
        id: "CHN",
        shortName: "CHN",
        fullName: "Community Health",
        badgeText: "CHN • Public Health, EPI & Epidemiology",
        bannerGradient: "from-[#115e59] via-[#0f766e] to-[#0284c7]",
        accentBorder: "border-teal-700",
        accentBg: "bg-teal-50",
        accentText: "text-teal-900",
        tagline: "Work through Ghana EPI cold chain, CHPS home visits, IDSR outbreak response & biostatistics.",
        placeholder: "Say hello, share a public health topic, or ask any CHN question...",
        tools: [
            {
                id: "chn-epi",
                label: "EPI & Cold Chain Guide",
                hint: "Ghana immunization schedule, VVM & +2°C to +8°C",
                promptPrefix: "As a Community Health Nursing (CHN) tutor in Ghana, explain the Ghana EPI schedule, cold chain (+2°C to +8°C), VVM stages, and contraindications for:",
            },
            {
                id: "chn-idsr",
                label: "Outbreak & Home Visit Plan",
                hint: "IDSR surveillance, CHPS outreach & contact tracing",
                promptPrefix: "Outline the CHN community diagnosis, IDSR outbreak investigation, and CHPS home-visit priorities for:",
            },
            {
                id: "chn-biostat",
                label: "Epidemiology & Biostat Calc",
                hint: "Incidence, prevalence, attack rate & health indicators",
                promptPrefix: "Explain the epidemiological concept or biostatistics calculation step by step with a Ghanaian public health example for:",
            },
            {
                id: "chn-drill",
                label: "CHN Licensure Drill (3 MCQs)",
                hint: "Public health & RCH exam questions",
                promptPrefix: "Create 3 Ghanaian N&MC Community Health Nursing (CHN) licensure-style MCQs (A–D) with rationales on:",
            },
        ],
        sampleQuestions: [
            "Ghana EPI cold chain management (+2°C to +8°C) & Vaccine Vial Monitor (VVM)",
            "Incidence vs. prevalence, attack rate & maternal mortality ratio formulas",
            "IDSR cholera outbreak response at a sub-district CHPS compound",
            "Home-visit priorities & DOTS contact tracing for pulmonary tuberculosis",
        ],
    },
    NAC: {
        id: "NAC",
        shortName: "NAC",
        fullName: "Clinical Assistant",
        badgeText: "NAC • Bedside Clinical Assistance & Ward Care",
        bannerGradient: "from-[#1e3a8a] via-[#1d4ed8] to-[#0369a1]",
        accentBorder: "border-blue-700",
        accentBg: "bg-blue-50",
        accentText: "text-blue-900",
        tagline: "Practice vital signs, early warning signs, aseptic wound dressing & ward practical checklists.",
        placeholder: "Say hello, share what you're practicing on the ward, or ask any NAC question...",
        tools: [
            {
                id: "nac-osce",
                label: "NAC Practical Checklist",
                hint: "Equipment, IPC, numbered steps & safety alerts",
                promptPrefix: "As a Nurse Assistant Clinical (NAC) tutor in Ghana, give a step-by-step ward practical checklist (equipment, IPC, numbered procedure, and reporting signs) for:",
            },
            {
                id: "nac-vitals",
                label: "Vitals & Early Warning Signs",
                hint: "Normal ranges, abnormal triggers & when to escalate",
                promptPrefix: "Explain the NAC bedside monitoring parameters, normal vs abnormal vital sign thresholds, and immediate escalation rules for:",
            },
            {
                id: "nac-ipc",
                label: "IPC & Wound Care Safety",
                hint: "Sterile technique, waste segregation & pressure ulcer care",
                promptPrefix: "Provide a clear NAC infection prevention, colour-coded waste segregation, and bedside nursing care guide for:",
            },
            {
                id: "nac-drill",
                label: "NAC Exam Drill (3 MCQs)",
                hint: "N&MC NAC licensure practice questions",
                promptPrefix: "Create 3 Ghanaian N&MC Nurse Assistant Clinical (NAC) exam-style MCQs (A–D) with clear rationales on:",
            },
        ],
        sampleQuestions: [
            "Step-by-step aseptic wound dressing checklist & critical safety stops",
            "Adult vital signs normal ranges & red-flag values requiring immediate report",
            "Prevention of pressure ulcers (bedsores) in an immobile ward patient",
            "Ghana GHS colour-coded hospital waste segregation & sharps safety",
        ],
    },
    NAP: {
        id: "NAP",
        shortName: "NAP",
        fullName: "Preventive Assistant",
        badgeText: "NAP • Preventive Health, IMNCI & Nutrition",
        bannerGradient: "from-[#78350f] via-[#92400e] to-[#b45309]",
        accentBorder: "border-amber-700",
        accentBg: "bg-amber-50",
        accentText: "text-amber-900",
        tagline: "Master IMNCI childhood illness, ORS Plan A/B/C, growth monitoring & community health talks.",
        placeholder: "Say hello, share a child welfare or IMNCI question, or ask any NAP topic...",
        tools: [
            {
                id: "nap-imnci",
                label: "IMNCI Child Care Protocol",
                hint: "Diarrhoea ORS Plan A/B/C, malaria & danger signs",
                promptPrefix: "As a Nurse Assistant Preventive (NAP) tutor in Ghana, explain the IMNCI assessment, danger signs, and home/clinic management for:",
            },
            {
                id: "nap-nutrition",
                label: "Growth & Nutrition Guide",
                hint: "MUAC tape, weighing chart, IYCF & anaemia prevention",
                promptPrefix: "Provide a practical NAP child welfare clinic (CWC) growth monitoring, MUAC interpretation, and infant feeding counselling guide for:",
            },
            {
                id: "nap-healthtalk",
                label: "Community Health Talk Script",
                hint: "Clear caregiver education on WASH, malaria & vaccines",
                promptPrefix: "Write a clear, culturally practical Ghanaian community health education talk with key caregiver takeaways on:",
            },
            {
                id: "nap-drill",
                label: "NAP Exam Drill (3 MCQs)",
                hint: "N&MC NAP licensure practice questions",
                promptPrefix: "Create 3 Ghanaian N&MC Nurse Assistant Preventive (NAP) exam-style MCQs (A–D) with clear rationales on:",
            },
        ],
        sampleQuestions: [
            "IMNCI Plan A home management of acute childhood diarrhoea (ORS & Zinc)",
            "Child Welfare Clinic (CWC) growth chart faltering & MUAC screening",
            "Exclusive breastfeeding benefits & proper attachment counselling",
            "Community malaria prevention: LLIN care & environmental sanitation",
        ],
    },
}

const DEPT_ORDER: DepartmentId[] = ["RGN", "RM", "RPN", "CHN", "NAC", "NAP"]
const LEVELS = ["All Levels", "Level 100", "Level 200", "Level 300"]
const PEARLS_STORAGE_KEY = "nursify_ai_tutor_saved_pearls_v3"

async function compressImageToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error("Could not read selected image."))
        reader.onload = () => {
            const img = new Image()
            img.onerror = () => reject(new Error("Invalid image format."))
            img.onload = () => {
                const maxDim = 960
                let { width, height } = img
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width)
                        width = maxDim
                    } else {
                        width = Math.round((width * maxDim) / height)
                        height = maxDim
                    }
                }
                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    resolve(String(reader.result || ""))
                    return
                }
                ctx.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL("image/jpeg", 0.78))
            }
            img.src = String(reader.result || "")
        }
        reader.readAsDataURL(file)
    })
}

function stripMarkdownForSpeech(md: string): string {
    return md
        .replace(/[#*_`>-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

export default function AiTutorPage() {
    const [searchParams] = useSearchParams()
    const handledParamRef = useRef<string | null>(null)
    const threadEndRef = useRef<HTMLDivElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [activeDeptId, setActiveDeptId] = useState<DepartmentId>("RGN")
    const [selectedLevel, setSelectedLevel] = useState<string>("All Levels")
    const [activeToolId, setActiveToolId] = useState<string | null>(null)
    const [workspaceTab, setWorkspaceTab] = useState<"tools" | "questions" | "notes">("tools")

    const [prompt, setPrompt] = useState("")
    const [attachedImage, setAttachedImage] = useState<string | null>(null)
    const [attachedImageName, setAttachedImageName] = useState<string>("")
    const [sending, setSending] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
    const [autoSpeak, setAutoSpeak] = useState<boolean>(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [openNoteIds, setOpenNoteIds] = useState<Record<string, boolean>>({})

    const [savedPearls, setSavedPearls] = useState<SavedPearl[]>(() => {
        try {
            const raw = localStorage.getItem(PEARLS_STORAGE_KEY)
            return raw ? (JSON.parse(raw) as SavedPearl[]) : []
        } catch {
            return []
        }
    })

    const dept = DEPARTMENTS[activeDeptId]
    const selectedTool = activeToolId ? dept.tools.find((t) => t.id === activeToolId) || null : null
    const deptPearls = savedPearls.filter((p) => p.department === activeDeptId)

    const [messages, setMessages] = useState<TutorMessage[]>([
        {
            id: "welcome-1",
            role: "tutor",
            framework: "RGN General Nursing • AI Mentor Listening",
            content:
                "Hello! I'm your **NursifyGH AI Clinical & Study Mentor**. Tell me what you're working on, what topic is giving you trouble, or tap the **Microphone** to talk to me—we'll solve it together step by step. You can also upload any picture with the **Camera** icon.",
        },
    ])

    useEffect(() => {
        try {
            localStorage.setItem(PEARLS_STORAGE_KEY, JSON.stringify(savedPearls))
        } catch {
            // ignore storage errors
        }
    }, [savedPearls])

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, [messages, sending])

    useEffect(() => {
        return () => {
            window.speechSynthesis?.cancel()
        }
    }, [])

    function speakText(msgId: string, text: string) {
        if (!("speechSynthesis" in window)) return
        if (speakingMsgId === msgId) {
            window.speechSynthesis.cancel()
            setSpeakingMsgId(null)
            return
        }
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text))
        utterance.lang = "en-GB"
        utterance.rate = 0.98
        utterance.onstart = () => setSpeakingMsgId(msgId)
        utterance.onend = () => setSpeakingMsgId(null)
        utterance.onerror = () => setSpeakingMsgId(null)
        window.speechSynthesis.speak(utterance)
    }

    function handleSelectDepartment(newDept: DepartmentId) {
        setActiveDeptId(newDept)
        setActiveToolId(null)
        const cfg = DEPARTMENTS[newDept]
        setMessages((prev) => {
            if (prev.length === 1 && prev[0].id === "welcome-1") {
                return [
                    {
                        id: "welcome-1",
                        role: "tutor",
                        framework: `${cfg.badgeText} • AI Mentor Listening`,
                        content: `Welcome to **${cfg.fullName} (${cfg.shortName})**! Tell me what topic, procedure, or exam problem you want help with today—or tap the **Microphone** to speak or **Camera** to upload a picture.`,
                    },
                ]
            }
            return prev
        })
    }

    async function handleImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const compressed = await compressImageToDataUrl(file)
            setAttachedImage(compressed)
            setAttachedImageName(file.name)
        } catch {
            alert("Could not load that image. Please try another JPG or PNG photo.")
        } finally {
            e.target.value = ""
        }
    }

    async function askTutor(rawTopic: string, overridePrefix?: string) {
        const cleanTopic = rawTopic.trim()
        const imgToSend = attachedImage
        if (!cleanTopic && !imgToSend) return
        if (sending) return

        const levelTag = selectedLevel !== "All Levels" ? ` • ${selectedLevel}` : ""
        const activePrefix = overridePrefix ?? selectedTool?.promptPrefix ?? ""
        const modeName = imgToSend
            ? "Visual Reader & Solver"
            : selectedTool
            ? selectedTool.label
            : "Open Mentor Chat"

        const deptBadge = `${dept.shortName}${levelTag} • ${modeName}`
        const userDisplayText =
            cleanTopic || "Describe everything in this image and explain or solve what is shown."

        const apiPrompt = imgToSend
            ? cleanTopic
                ? `Examine the uploaded image thoroughly. First describe everything visible in the image (all text, numbers, labels, diagrams, people, or visuals—even if it is not a clinical item), and also address what the student said: "${cleanTopic}".`
                : "Examine the uploaded image thoroughly and describe everything visible in full detail (all text, headings, numbers, labels, diagrams, people, objects, and layout—even if it is not a clinical item). If there is a question, calculation, or study topic in the image, solve and explain it step by step."
            : activePrefix
            ? `${activePrefix} ${cleanTopic} (Curriculum context: Ghanaian N&MC ${dept.fullName} [${dept.shortName}]${levelTag}.)`
            : cleanTopic

        const userMsg: TutorMessage = {
            id: `u-${Date.now()}`,
            role: "user",
            content: userDisplayText,
            imageUrl: imgToSend || undefined,
            deptBadge,
        }

        setMessages((prev) => [...prev, userMsg])
        setPrompt("")
        setAttachedImage(null)
        setAttachedImageName("")
        setSending(true)

        try {
            const history = messages
                .slice(1)
                .slice(-8)
                .map((m) => ({
                    role: m.role === "tutor" ? "assistant" : "user",
                    content: m.content,
                }))

            const res = await api.post("/academics/tutor/", {
                prompt: apiPrompt,
                department: dept.shortName,
                image_data_url: imgToSend || undefined,
                history,
            })

            const replyText =
                typeof res.data?.reply === "string" && res.data.reply.trim()
                    ? res.data.reply.trim()
                    : `I'm here with you! Tell me a bit more about what you need help with in **${dept.fullName}**, and we will break it down step by step.`

            const frameworkLabel =
                typeof res.data?.framework === "string" && res.data.framework.trim()
                    ? res.data.framework.trim()
                    : deptBadge

            const replyId = `t-${Date.now() + 1}`
            setMessages((prev) => [
                ...prev,
                {
                    id: replyId,
                    role: "tutor",
                    content: replyText,
                    framework: frameworkLabel,
                    topicHint: cleanTopic.length > 4 ? cleanTopic : undefined,
                },
            ])

            if (autoSpeak) {
                speakText(replyId, replyText)
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: `t-${Date.now() + 1}`,
                    role: "tutor",
                    content:
                        "I could not reach the live AI server right now. Please check your internet connection and tap **Send** again.",
                    framework: `${dept.shortName} Offline Notice`,
                },
            ])
        } finally {
            setSending(false)
        }
    }

    useEffect(() => {
        const qParam = searchParams.get("q")
        if (qParam && qParam.trim() && handledParamRef.current !== qParam) {
            handledParamRef.current = qParam
            askTutor(qParam)
        }
    }, [searchParams])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        askTutor(prompt)
    }

    function handleCopy(id: string, text: string) {
        navigator.clipboard?.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
    }

    function handleSavePearl(msg: TutorMessage) {
        if (deptPearls.some((p) => p.content === msg.content)) return
        const newId = `pearl-${Date.now()}`
        setSavedPearls((prev) => [
            {
                id: newId,
                department: activeDeptId,
                title: msg.topicHint || msg.framework || `${dept.shortName} Study Note`,
                content: msg.content,
                savedAt: new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                }),
            },
            ...prev,
        ])
        setOpenNoteIds((prev) => ({ ...prev, [newId]: true }))
    }

    function toggleOpenNote(id: string) {
        setOpenNoteIds((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    function startVoiceDictation() {
        const win = window as unknown as Record<string, unknown>
        const SpeechRec = (win.SpeechRecognition || win.webkitSpeechRecognition) as
            | (new () => {
                  lang: string
                  interimResults: boolean
                  maxAlternatives: number
                  onstart: (() => void) | null
                  onend: (() => void) | null
                  onerror: (() => void) | null
                  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
                  start: () => void
              })
            | undefined

        if (!SpeechRec) {
            alert("Voice dictation is not supported in this browser. Please type or upload a picture.")
            return
        }

        try {
            const recognition = new SpeechRec()
            recognition.lang = "en-GH"
            recognition.interimResults = false
            recognition.maxAlternatives = 1
            recognition.onstart = () => setIsListening(true)
            recognition.onend = () => setIsListening(false)
            recognition.onerror = () => setIsListening(false)
            recognition.onresult = (event) => {
                const spoken = event.results?.[0]?.[0]?.transcript || ""
                if (spoken.trim()) {
                    setPrompt((prev) => (prev.trim() ? `${prev.trim()} ${spoken.trim()}` : spoken.trim()))
                }
            }
            recognition.start()
        } catch {
            setIsListening(false)
        }
    }

    return (
        <AppShell>
            <div className="max-w-4xl mx-auto space-y-4 pb-28 sm:pb-10">
                {/* Step 1: Clean Department Switcher */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-2 px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Select Your Department
                        </span>
                        <div className="flex items-center gap-1">
                            {LEVELS.map((lvl) => (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => setSelectedLevel(lvl)}
                                    className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
                                        selectedLevel === lvl
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    {lvl === "All Levels" ? "All" : lvl.replace("Level ", "L")}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {DEPT_ORDER.map((id) => {
                            const item = DEPARTMENTS[id]
                            const isActive = id === activeDeptId
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => handleSelectDepartment(id)}
                                    className={`rounded-xl border px-2.5 py-2 text-center transition-all ${
                                        isActive
                                            ? `${item.accentBorder} ${item.accentBg} ${item.accentText} shadow-2xs`
                                            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white"
                                    }`}
                                >
                                    <p className="text-sm font-bold leading-tight">{item.shortName}</p>
                                    <p className="text-[11px] opacity-85 truncate mt-0.5">{item.fullName}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Step 2: Department-Specialized Banner */}
                <div className={`rounded-2xl bg-gradient-to-br ${dept.bannerGradient} p-5 text-white shadow-sm`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 max-w-2xl">
                            <span className="inline-block rounded-full bg-white/15 px-3 py-0.5 text-xs font-bold tracking-wide text-white">
                                {dept.badgeText}
                            </span>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                                {dept.fullName} AI Clinical Mentor
                            </h1>
                            <p className="text-sm text-white/90 leading-relaxed">
                                {dept.tagline}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !autoSpeak
                                    setAutoSpeak(next)
                                    if (!next) {
                                        window.speechSynthesis?.cancel()
                                        setSpeakingMsgId(null)
                                    }
                                }}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                                    autoSpeak
                                        ? "bg-white text-slate-900 border-white"
                                        : "bg-black/20 hover:bg-black/30 border-white/20 text-white"
                                }`}
                            >
                                {autoSpeak ? "Voice Replies: ON" : "Voice Replies: OFF"}
                            </button>

                            {messages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setMessages((prev) => prev.slice(0, 1))}
                                    className="rounded-xl bg-black/20 hover:bg-black/30 border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                                >
                                    Clear Chat
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Step 3: Organized Compact Workspace Tabs */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
                        <button
                            type="button"
                            onClick={() => setWorkspaceTab("tools")}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                workspaceTab === "tools"
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                            {dept.shortName} Study Modes
                        </button>
                        <button
                            type="button"
                            onClick={() => setWorkspaceTab("questions")}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                workspaceTab === "questions"
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                            {dept.shortName} Topics
                        </button>
                        <button
                            type="button"
                            onClick={() => setWorkspaceTab("notes")}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ml-auto ${
                                workspaceTab === "notes"
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                            {dept.shortName} Saved ({deptPearls.length})
                        </button>
                    </div>

                    {workspaceTab === "tools" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveToolId(null)}
                                className={`rounded-xl border p-3 text-left transition-all sm:col-span-2 ${
                                    activeToolId === null
                                        ? `${dept.accentBorder} ${dept.accentBg}`
                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className={`text-sm font-bold ${activeToolId === null ? dept.accentText : "text-slate-900"}`}>
                                        Open Mentor Conversation (Listen &amp; Guide)
                                    </p>
                                    {activeToolId === null && (
                                        <span className={`text-[11px] font-bold uppercase ${dept.accentText}`}>
                                            Active
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    Talk naturally—tell the AI what you&apos;re studying or struggling with, and it will listen and guide you step by step.
                                </p>
                            </button>

                            {dept.tools.map((tool) => {
                                const isSel = tool.id === activeToolId
                                return (
                                    <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => setActiveToolId(isSel ? null : tool.id)}
                                        className={`rounded-xl border p-3 text-left transition-all ${
                                            isSel
                                                ? `${dept.accentBorder} ${dept.accentBg}`
                                                : "border-slate-200 bg-white hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm font-bold ${isSel ? dept.accentText : "text-slate-900"}`}>
                                                {tool.label}
                                            </p>
                                            {isSel && (
                                                <span className={`text-[11px] font-bold uppercase ${dept.accentText}`}>
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 mt-0.5">{tool.hint}</p>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {workspaceTab === "questions" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {dept.sampleQuestions.map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => askTutor(q)}
                                    className="rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-400 px-3.5 py-2.5 text-sm font-medium text-slate-800 text-left flex items-center justify-between gap-2 transition-colors"
                                >
                                    <span>{q}</span>
                                    <span className="font-bold text-slate-500 shrink-0">→</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {workspaceTab === "notes" && (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-600">
                                    Showing notes saved specifically for <strong>{dept.fullName} ({dept.shortName})</strong>
                                </p>
                                {deptPearls.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSavedPearls((prev) =>
                                                prev.filter((item) => item.department !== activeDeptId)
                                            )
                                        }
                                        className="text-xs font-semibold text-red-700 hover:underline"
                                    >
                                        Clear {dept.shortName} Notes
                                    </button>
                                )}
                            </div>

                            {deptPearls.length === 0 ? (
                                <p className="text-sm text-slate-600 py-2">
                                    No saved notes in <strong>{dept.shortName}</strong> yet. Tap <strong>Save to {dept.shortName}</strong> under any answer to keep it here.
                                </p>
                            ) : (
                                deptPearls.map((pearl) => {
                                    const isOpen = openNoteIds[pearl.id] ?? true
                                    return (
                                        <div
                                            key={pearl.id}
                                            className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleOpenNote(pearl.id)}
                                                    className="text-left flex-1 min-w-0"
                                                >
                                                    <span className="text-sm font-bold text-slate-900">
                                                        [{pearl.department}] {pearl.title}
                                                    </span>
                                                    <span className="ml-2 text-xs text-slate-500">
                                                        {pearl.savedAt}
                                                    </span>
                                                </button>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleOpenNote(pearl.id)}
                                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100"
                                                    >
                                                        {isOpen ? "Close Note" : "Open Note"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(pearl.id, pearl.content)}
                                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        {copiedId === pearl.id ? "Copied ✓" : "Copy"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSavedPearls((prev) =>
                                                                prev.filter((x) => x.id !== pearl.id)
                                                            )
                                                        }
                                                        className="text-xs font-semibold text-red-600 hover:underline px-1"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>

                                            {isOpen && (
                                                <div
                                                    className="rounded-xl border border-slate-200 bg-white p-3.5 text-[15px] leading-relaxed text-slate-900
                                                    [&_p]:mb-2.5 [&_p:last-child]:mb-0
                                                    [&_strong]:font-bold [&_strong]:text-slate-950
                                                    [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-2.5 [&_ul]:space-y-1
                                                    [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-2.5 [&_ol]:space-y-1
                                                    [&_h1]:text-base [&_h2]:text-[15px] [&_h3]:text-[15px] [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:mb-1.5 [&_h2]:mb-1.5 [&_h3]:mb-1"
                                                >
                                                    <ReactMarkdown>{pearl.content}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Step 4: Conversation, Voice & Photo/Camera Problem Solver */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="space-y-4">
                        {messages.map((m) => {
                            const isSaved = deptPearls.some((p) => p.content === m.content)
                            const isSpeakingThis = speakingMsgId === m.id
                            return (
                                <div
                                    key={m.id}
                                    className={`rounded-2xl p-4 ${
                                        m.role === "user"
                                            ? "bg-slate-900 text-white ml-auto max-w-2xl"
                                            : "bg-slate-50 border border-slate-200 text-slate-900"
                                    }`}
                                >
                                    {m.role === "user" && m.deptBadge && (
                                        <div className="mb-1.5">
                                            <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200">
                                                {m.deptBadge}
                                            </span>
                                        </div>
                                    )}

                                    {m.role === "tutor" && m.framework && (
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <Badge variant="neutral">{m.framework}</Badge>
                                            <button
                                                type="button"
                                                onClick={() => speakText(m.id, m.content)}
                                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                                                    isSpeakingThis
                                                        ? "border-brand-600 bg-brand-50 text-brand-800"
                                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                                }`}
                                            >
                                                {isSpeakingThis ? "Stop Audio" : "Listen"}
                                            </button>
                                        </div>
                                    )}

                                    {m.imageUrl && (
                                        <div className="mb-2.5">
                                            <img
                                                src={m.imageUrl}
                                                alt="Uploaded study problem"
                                                className="max-h-64 rounded-xl border border-white/20 object-contain bg-black/10"
                                            />
                                        </div>
                                    )}

                                    {m.role === "user" ? (
                                        <p className="text-[15px] leading-relaxed whitespace-pre-line">
                                            {m.content}
                                        </p>
                                    ) : (
                                        <div
                                            className="text-[15px] leading-relaxed text-slate-900
                                            [&_p]:mb-3 [&_p:last-child]:mb-0
                                            [&_strong]:font-bold [&_strong]:text-slate-950
                                            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_ul]:space-y-1.5
                                            [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_ol]:space-y-1.5
                                            [&_li]:pl-1
                                            [&_h1]:text-base [&_h2]:text-[15px] [&_h3]:text-[15px] [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:mb-2 [&_h2]:mb-1.5 [&_h3]:mb-1 [&_h1]:mt-3 [&_h2]:mt-2.5 [&_h3]:mt-2
                                            [&_code]:bg-slate-200/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono"
                                        >
                                            <ReactMarkdown>{m.content}</ReactMarkdown>
                                        </div>
                                    )}

                                    {m.role === "tutor" && m.id !== "welcome-1" && (
                                        <div className="mt-3.5 pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-2">
                                            {m.topicHint && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        askTutor(
                                                            m.topicHint!,
                                                            `Create 3 Ghanaian N&MC ${dept.shortName} multiple-choice questions (A–D) with answers and rationales on:`
                                                        )
                                                    }
                                                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100"
                                                >
                                                    Quiz Me ({dept.shortName})
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleSavePearl(m)}
                                                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                                                    isSaved
                                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                                }`}
                                            >
                                                {isSaved ? `Saved in ${dept.shortName} ✓` : `Save to ${dept.shortName}`}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleCopy(m.id, m.content)}
                                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 ml-auto"
                                            >
                                                {copiedId === m.id ? "Copied ✓" : "Copy"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {sending && (
                            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-brand-600 animate-bounce" />
                                    <span
                                        className="h-2.5 w-2.5 rounded-full bg-brand-600 animate-bounce"
                                        style={{ animationDelay: "150ms" }}
                                    />
                                    <span
                                        className="h-2.5 w-2.5 rounded-full bg-brand-600 animate-bounce"
                                        style={{ animationDelay: "300ms" }}
                                    />
                                </div>
                                <span className="text-sm font-medium text-slate-700">
                                    {dept.shortName} Mentor is thinking...
                                </span>
                            </div>
                        )}
                        <div ref={threadEndRef} />
                    </div>

                    {/* Composer with Camera/Photo Upload + Voice Input */}
                    <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-200 space-y-2.5">
                        {attachedImage && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <img
                                        src={attachedImage}
                                        alt="Preview"
                                        className="h-14 w-14 rounded-lg object-cover border border-slate-300 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate">
                                            {attachedImageName || "Selected image"}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {[
                                                "Describe everything in this image",
                                                "Solve & explain this question",
                                                "Transcribe text & summarize",
                                            ].map((quickImgPrompt) => (
                                                <button
                                                    key={quickImgPrompt}
                                                    type="button"
                                                    onClick={() => setPrompt(quickImgPrompt)}
                                                    className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-brand-800 hover:bg-brand-50"
                                                >
                                                    {quickImgPrompt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAttachedImage(null)
                                        setAttachedImageName("")
                                    }}
                                    className="rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50 shrink-0"
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-600 px-0.5">
                            <span>
                                {attachedImage ? (
                                    <>Mode: <strong className="text-slate-900">Visual Description &amp; Solver</strong></>
                                ) : selectedTool ? (
                                    <>Mode: <strong className="text-slate-900">{selectedTool.label}</strong></>
                                ) : (
                                    <>Mode: <strong className="text-slate-900">Open Mentor Conversation</strong></>
                                )}
                            </span>
                            <span>Speak, upload a photo, or type below</span>
                        </div>

                        <div className="flex items-stretch gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImagePicked}
                                className="hidden"
                            />

                            {/* Camera / Image Upload Button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                title="Upload or take a photo of any question, poster, drug label, or chart"
                                className="shrink-0 rounded-xl border border-slate-300 bg-slate-50 px-3 flex items-center justify-center text-slate-700 hover:border-brand-600 hover:text-brand-700 transition-colors"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-5 w-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </button>

                            {/* Voice Input Button */}
                            <button
                                type="button"
                                onClick={startVoiceDictation}
                                title="Speak to the AI Mentor"
                                className={`shrink-0 rounded-xl border px-3 flex items-center justify-center transition-colors ${
                                    isListening
                                        ? "border-red-300 bg-red-50 text-red-700 animate-pulse"
                                        : "border-slate-300 bg-slate-50 text-slate-700 hover:border-brand-600 hover:text-brand-700"
                                }`}
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-5 w-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                    />
                                </svg>
                            </button>

                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={attachedImage ? "Optional: ask a specific question about this picture..." : dept.placeholder}
                                className="flex-1 min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />

                            <Button type="submit" disabled={sending || (!prompt.trim() && !attachedImage)}>
                                {sending ? "Thinking..." : "Send"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppShell>
    )
}
