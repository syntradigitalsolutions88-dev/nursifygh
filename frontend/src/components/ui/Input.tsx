import { forwardRef, type InputHTMLAttributes, useId } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    helper?: string
    error?: string
    prefix?: string
    suffix?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, helper, error, prefix, suffix, id, className = "", ...rest }, ref) => {
        const generatedId = useId()
        const inputId = id ?? generatedId
        const helperId = `${inputId}-helper`
        const errorId = `${inputId}-error`
        const describedBy = error ? errorId : helper ? helperId : undefined

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-on-surface mb-1.5"
                    >
                        {label}
                    </label>
                )}

                <div className="relative">
                    {prefix && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-on-surface-muted">
                            {prefix}
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        aria-invalid={!!error}
                        aria-describedby={describedBy}
                        className={`block w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-on-surface placeholder:text-on-surface-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-surface-subtle ${prefix ? "pl-9" : ""} ${suffix ? "pr-10" : ""} ${error ? "border-danger-500 focus:border-danger-500 focus:ring-danger-100" : "border-border focus:border-brand-500 focus:ring-brand-100"} ${className}`}
                        {...rest}
                    />
                    {suffix && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            {suffix}
                        </span>
                    )}
                </div>

                {error ? (
                    <p id={errorId} className="mt-1.5 text-sm text-danger-700">
                        {error}
                    </p>
                ) : helper ? (
                    <p id={helperId} className="mt-1.5 text-sm text-on-surface-muted">
                        {helper}
                    </p>
                ) : null}
            </div>
        )
    },
)

Input.displayName = "Input"

export default Input