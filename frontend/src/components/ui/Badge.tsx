type Variant = "brand" | "success" | "warning" | "danger" | "info" | "neutral"

interface BadgeProps {
    variant?: Variant
    children: React.ReactNode
    className?: string
}

const variants: Record<Variant, string> = {
    brand: "bg-brand-50 text-brand-800 border-brand-200",
    success: "bg-success-50 text-success-700 border-green-200",
    warning: "bg-warning-50 text-warning-700 border-amber-200",
    danger: "bg-danger-50 text-danger-700 border-red-200",
    info: "bg-info-50 text-info-700 border-blue-200",
    neutral: "bg-surface-subtle text-on-surface-muted border-border",
}

export default function Badge({
    variant = "neutral",
    children,
    className = "",
}: BadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
        >
            {children}
        </span>
    )
}