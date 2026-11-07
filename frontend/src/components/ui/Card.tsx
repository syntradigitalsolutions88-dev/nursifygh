import type { HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "flat" | "elevated" | "interactive"
}

export function Card({
    variant = "flat",
    className = "",
    children,
    ...rest
}: CardProps) {
    const base = "rounded-xl bg-white border border-border"
    const variants = {
        flat: "",
        elevated: "shadow-sm",
        interactive:
            "shadow-sm transition-all hover:shadow-md hover:border-border-strong cursor-pointer",
    }
    return (
        <div className={`${base} ${variants[variant]} ${className}`} {...rest}>
            {children}
        </div>
    )
}

export function CardHeader({
    className = "",
    children,
}: {
    className?: string
    children: React.ReactNode
}) {
    return (
        <div className={`px-5 pt-5 pb-3 sm:px-6 sm:pt-6 ${className}`}>{children}</div>
    )
}

export function CardTitle({
    className = "",
    children,
}: {
    className?: string
    children: React.ReactNode
}) {
    return <h3 className={`text-h4 ${className}`}>{children}</h3>
}

export function CardContent({
    className = "",
    children,
}: {
    className?: string
    children: React.ReactNode
}) {
    return <div className={`px-5 pb-5 sm:px-6 sm:pb-6 ${className}`}>{children}</div>
}

export function CardFooter({
    className = "",
    children,
}: {
    className?: string
    children: React.ReactNode
}) {
    return (
        <div
            className={`border-t border-border px-5 py-3 sm:px-6 ${className}`}
        >
            {children}
        </div>
    )
}

export default Card