import { useEffect, useState } from "react"

interface QuickRefCard {
    category: "Ghana Acts" | "EPI & Child" | "Maternal & IMCI" | "Antidotes"
    badge: string
    title: string
    clinicalRule: string
    plainMeaning: string
}

const QUICK_REF_CARDS: QuickRefCard[] = [
    {
        category: "Ghana Acts",
        badge: "Act 846 (2012)",
        title: "Mental Health Act, 2012",
        clinicalRule: "Establishes the Mental Health Authority, Regional Visiting Committees, community-based care priority, voluntary treatment preference, and strict time-limited safeguards for involuntary admission, seclusion, or mechanical restraint.",
        plainMeaning: "Protects dignity and human rights in psychiatric care; restraints/seclusion are strictly last-resort, time-bound, and closely monitored.",
    },
    {
        category: "Ghana Acts",
        badge: "Act 851 (2012)",
        title: "Public Health Act, 2012",
        clinicalRule: "Consolidates statutory powers for communicable disease surveillance, outbreak/epidemic response, quarantine/isolation, environmental sanitation, tobacco control, and Food and Drugs Authority (FDA) regulation.",
        plainMeaning: "Legal backbone for outbreak reporting, sanitation enforcement, and medicine/vaccine safety in Ghana.",
    },
    {
        category: "Ghana Acts",
        badge: "Act 715 (2006)",
        title: "Persons with Disability Act, 2006",
        clinicalRule: "Prohibits discrimination against persons with disabilities, mandates accessible public facilities/services, supports inclusive education and employment, and establishes the National Council on Persons with Disability (NCPD).",
        plainMeaning: "Guarantees equal access to healthcare, buildings, schooling, and dignified community inclusion.",
    },
    {
        category: "Ghana Acts",
        badge: "Act 575 (2000)",
        title: "Traditional Medicine Practice Act, 2000",
        clinicalRule: "Establishes the Traditional Medicine Practice Council (TMPC) to register and license herbal/traditional practitioners and regulate practice standards alongside CPMR scientific testing.",
        plainMeaning: "Regulates licensed traditional practitioners and promotes safe referral without delaying acute hospital emergencies.",
    },
    {
        category: "EPI & Child",
        badge: "Ghana EPI Schedule",
        title: "Key Childhood Immunization Milestones",
        clinicalRule: "Birth: BCG (left upper arm ID) + OPV0 | 6, 10, 14 wks: Pentavalent, Rotavirus, PCV, OPV/IPV per schedule | 9 mos: Measles-Rubella 1 + Yellow Fever | 18 mos: Measles-Rubella 2 + Men A.",
        plainMeaning: "Never restart an interrupted vaccine series from dose 1—give overdue doses at the current visit.",
    },
    {
        category: "EPI & Child",
        badge: "+2°C to +8°C",
        title: "Cold Chain & BCG Administration",
        clinicalRule: "Store routine EPI vaccines at +2°C to +8°C (never freeze freeze-sensitive vaccines like Penta/PCV/TT). Inject BCG 0.05 mL strictly intradermally to raise a pale wheal; never massage the site.",
        plainMeaning: "Check fridge temps twice daily and verify Vaccine Vial Monitor (VVM) before every session.",
    },
    {
        category: "Maternal & IMCI",
        badge: "IMCI Tachypnea",
        title: "Age-Specific Fast Breathing Cutoffs",
        clinicalRule: "Count full 60 seconds when calm: <2 months: >=60 breaths/min | 2–11 months: >=50 breaths/min | 12 months–5 years: >=40 breaths/min.",
        plainMeaning: "Fast breathing or lower chest wall indrawing signals possible pneumonia requiring prompt IMCI action.",
    },
    {
        category: "Maternal & IMCI",
        badge: "AMTSL & MgSO4",
        title: "PPH Prevention & Eclampsia Safety",
        clinicalRule: "AMTSL: Oxytocin 10 IU IM after birth, controlled cord traction with uterine counter-traction, and uterine tone check/massage. MgSO4 toxicity checks: RR >=16/min, present patellar reflexes, urine output >=30 mL/hr.",
        plainMeaning: "Keep 10% Calcium Gluconate (1 g IV) at the bedside whenever a pre-eclamptic/eclamptic mother receives MgSO4.",
    },
    {
        category: "Antidotes",
        badge: "Emergency Reversal",
        title: "High-Alert Drug Antidotes",
        clinicalRule: "Magnesium Sulfate -> 10% Calcium Gluconate | Opioids (Morphine/Pethidine) -> Naloxone | Warfarin -> Vitamin K (Phytomenadione) | Heparin -> Protamine Sulfate | Paracetamol -> N-acetylcysteine.",
        plainMeaning: "Pair every high-alert medication question with its toxicity sign and specific reversal agent.",
    },
]

interface Props {
    open: boolean
    onClose: () => void
}

export default function GhanaQuickRefDrawer({ open, onClose }: Props) {
    const [activeCategory, setActiveCategory] = useState<string>("All")
    const [search, setSearch] = useState("")

    useEffect(() => {
        if (!open) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [open, onClose])

    if (!open) return null

    const categories = ["All", "Ghana Acts", "EPI & Child", "Maternal & IMCI", "Antidotes"]
    const filtered = QUICK_REF_CARDS.filter((card) => {
        const matchesCat = activeCategory === "All" || card.category === activeCategory
        const q = search.trim().toLowerCase()
        const matchesSearch =
            !q ||
            card.title.toLowerCase().includes(q) ||
            card.badge.toLowerCase().includes(q) ||
            card.clinicalRule.toLowerCase().includes(q) ||
            card.plainMeaning.toLowerCase().includes(q)
        return matchesCat && matchesSearch
    })

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
            onClick={onClose}
        >
            <aside
                className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-border"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border bg-brand-900 px-5 py-4 text-white">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-200">
                            N&amp;MC Pocket Reference
                        </p>
                        <h2 className="text-lg font-bold !text-white">Ghana Clinical &amp; Legal Guide</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                    >
                        Close ✕
                    </button>
                </div>

                <div className="border-b border-border bg-gray-50/80 p-4 space-y-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Act 846, BCG, tachypnea, MgSO4, antidote..."
                        className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-on-surface focus:border-brand-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveCategory(cat)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                                    activeCategory === cat
                                        ? "bg-brand-700 text-white"
                                        : "bg-white border border-border text-on-surface-muted hover:text-on-surface"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filtered.map((card) => (
                        <div key={card.title} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                                    {card.badge}
                                </span>
                                <span className="text-[11px] font-medium text-on-surface-muted">
                                    {card.category}
                                </span>
                            </div>
                            <h3 className="mt-1.5 text-sm font-bold text-on-surface">{card.title}</h3>
                            <p className="mt-1.5 text-xs leading-relaxed text-on-surface">{card.clinicalRule}</p>
                            <div className="mt-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 px-3 py-2 text-xs text-emerald-950">
                                <span className="font-bold">Quick Takeaway: </span>
                                {card.plainMeaning}
                            </div>
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    )
}
