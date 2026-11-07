interface Tab {
    label: string
    value: string
    count?: number
}

interface TabsProps {
    tabs: Tab[]
    active: string
    onChange: (value: string) => void
    className?: string
}

export default function Tabs({ tabs, active, onChange, className = "" }: TabsProps) {
    return (
        <div className={`flex gap-1 overflow-x-auto border-b border-border ${className}`}>
            {tabs.map((tab) => {
                const isActive = tab.value === active
                return (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => onChange(tab.value)}
                        className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors ${isActive ? "text-brand-700" : "text-on-surface-muted hover:text-on-surface"}`}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-brand-100 text-brand-800" : "bg-surface-subtle text-on-surface-muted"}`}
                            >
                                {tab.count}
                            </span>
                        )}
                        {isActive && (
                            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-700" />
                        )}
                    </button>
                )
            })}
        </div>
    )
}