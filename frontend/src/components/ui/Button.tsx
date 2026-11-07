import { forwardRef, type ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
    loading?: boolean
    fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
    primary:
        "bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-300",
    secondary:
        "bg-white text-on-surface border border-border shadow-sm hover:bg-surface-subtle hover:border-border-strong active:bg-surface-inset disabled:opacity-50",
    ghost:
        "text-on-surface hover:bg-surface-subtle active:bg-surface-inset disabled:opacity-50",
    danger:
        "bg-danger-500 text-white shadow-sm hover:bg-danger-700 active:bg-danger-700 disabled:bg-red-300",
}

const sizeClasses: Record<Size, string> = {
    sm: "h-8 px-3 text-sm rounded-md gap-1.5",
    md: "h-10 px-4 text-sm rounded-lg gap-2",
    lg: "h-12 px-6 text-base rounded-lg gap-2.5",
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = "primary",
            size = "md",
            loading = false,
            fullWidth = false,
            disabled,
            className = "",
            children,
            ...rest
        },
        ref,
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
                {...rest}
            >
                {loading && (
                    <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                )}
                {children}
            </button>
        )
    },
)

Button.displayName = "Button"

export default Button