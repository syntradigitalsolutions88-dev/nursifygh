type Variant = "info" | "success" | "warning" | "danger"

interface AlertProps {
    variant?: Variant
    title?: string
    children: React.ReactNode
    className?: string
}

const styles: Record<Variant, { wrap: string; title: string }> = {
    info: {
        wrap: "border-blue-200 bg-info-50 text-blue-900",
        title: "text-blue-900",
    },
    success: {
        wrap: "border-green-200 bg-success-50 text-green-900",
        title: "text-green-900",
    },
    warning: {
        wrap: "border-amber-200 bg-warning-50 text-amber-900",
        title: "text-amber-900",
    },
    danger: {
        wrap: "border-red-200 bg-danger-50 text-red-900",
        title: "text-red-900",
    },
}

export default function Alert({
    variant = "info",
    title,
    children,
    className = "",
}: AlertProps) {
    return (
        <div
            role="alert"
            className={`rounded-lg border px-4 py-3 text-sm ${styles[variant].wrap} ${className}`}
        >
            {title && (
                <p className={`font-semibold mb-1 ${styles[variant].title}`}>{title}</p>
            )}
            <div>{children}</div>
        </div>
    )
}