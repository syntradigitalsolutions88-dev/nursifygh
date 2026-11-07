interface AvatarProps {
    name: string
    size?: "sm" | "md" | "lg"
    className?: string
}

const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, size = "md", className = "" }: AvatarProps) {
    return (
        <div
            className={`inline-flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800 ${sizes[size]} ${className}`}
            aria-label={name}
        >
            {initials(name)}
        </div>
    )
}