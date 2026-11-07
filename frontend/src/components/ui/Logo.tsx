interface LogoProps {
    size?: "sm" | "md" | "lg"
    showWordmark?: boolean
    className?: string
}

/**
 * NursifyGH brand lockup.
 * Icon: a stylized nursing cap merged with the Ghana star, anchored by
 * the letter "N" formed in the negative space.
 * Wordmark: "Nursify" in Inter, "GH" in brand emerald at 90% opacity.
 */
export default function Logo({
    size = "md",
    showWordmark = true,
    className = "",
}: LogoProps) {
    const iconSize = size === "sm" ? 28 : size === "lg" ? 48 : 36
    const textSize =
        size === "sm"
            ? "text-lg"
            : size === "lg"
                ? "text-3xl"
                : "text-xl"

    return (
        <div className={`inline-flex items-center gap-2.5 ${className}`}>
            <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                {/* Rounded background */}
                <rect width="40" height="40" rx="10" fill="url(#logoGradient)" />
                {/* Nursing cap outline (white) */}
                <path
                    d="M10 25.5c0-2.5 2-4.5 4.5-4.5h11c2.5 0 4.5 2 4.5 4.5V30H10v-4.5z"
                    fill="white"
                />
                {/* Cap fold */}
                <path
                    d="M10 25.5c3 1.5 7 2 10 2s7-.5 10-2"
                    stroke="#047857"
                    strokeWidth="0.8"
                    opacity="0.4"
                    fill="none"
                />
                {/* Central cross (white) */}
                <path d="M18 12h4v6h-4z" fill="white" />
                <path d="M14 16h12v4H14z" fill="white" />
                {/* Ghana star accent */}
                <circle cx="32" cy="10" r="3" fill="#facc15" />
                <defs>
                    <linearGradient
                        id="logoGradient"
                        x1="0"
                        y1="0"
                        x2="40"
                        y2="40"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#059669" />
                        <stop offset="1" stopColor="#065f46" />
                    </linearGradient>
                </defs>
            </svg>

            {showWordmark && (
                <span className={`font-semibold tracking-tight ${textSize}`}>
                    <span className="text-on-surface">Nursify</span>
                    <span className="text-brand-600">GH</span>
                </span>
            )}
        </div>
    )
}