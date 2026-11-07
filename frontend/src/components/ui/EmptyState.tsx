interface EmptyStateProps {
    title: string
    description?: string
    action?: React.ReactNode
    icon?: React.ReactNode
    className?: string
}

export default function EmptyState({
    title,
    description,
    action,
    icon,
    className = "",
}: EmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center ${className}`}
        >
            {icon && <div className="mb-4 text-on-surface-subtle">{icon}</div>}
            <h3 className="text-h4 text-on-surface">{title}</h3>
            {description && (
                <p className="mt-2 max-w-md text-sm text-on-surface-muted">{description}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}