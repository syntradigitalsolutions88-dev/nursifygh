import { Link } from "react-router-dom"

import AppShell from "../components/shell/AppShell"
import HelpSearch from "../components/support/HelpSearch"
import {
    HELP_ARTICLES,
    HELP_CATEGORIES,
    getArticlesByCategory,
} from "../data/help-articles"

/**
 * Help Center rendered inside the app shell (for logged-in users).
 * Same content as the public /help page, but styled for the dashboard context.
 */
export default function AppHelpPage() {
    return (
        <AppShell>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-h1">Help &amp; Support</h1>
                    <p className="mt-2 text-body-sm text-on-surface-muted">
                        Browse common questions, or{" "}
                        <Link
                            to="/support/contact"
                            className="text-brand-700 hover:underline"
                        >
                            contact us
                        </Link>{" "}
                        if you can't find what you need.
                    </p>
                </div>

                {/* Search */}
                <div className="max-w-xl">
                    <HelpSearch />
                </div>

                {/* Categories */}
                <div>
                    <h2 className="text-h3 mb-3">Browse by topic</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {HELP_CATEGORIES.map((cat) => {
                            const count = getArticlesByCategory(cat.value).length
                            return (
                                <div
                                    key={cat.value}
                                    className="rounded-xl border border-border bg-white p-5"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-h4">{cat.label}</h3>
                                        <span className="text-xs font-medium text-on-surface-muted">
                                            {count} article{count === 1 ? "" : "s"}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-on-surface-muted">
                                        {cat.description}
                                    </p>
                                    <ul className="mt-4 space-y-2">
                                        {getArticlesByCategory(cat.value).map((article) => (
                                            <li key={article.slug}>
                                                <Link
                                                    to={`/help/${article.slug}`}
                                                    className="text-sm text-brand-600 hover:underline"
                                                >
                                                    {article.title}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* All articles */}
                <div>
                    <h2 className="text-h3 mb-3">All articles</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {HELP_ARTICLES.map((article) => (
                            <Link
                                key={article.slug}
                                to={`/help/${article.slug}`}
                                className="rounded-lg border border-border bg-white p-4 hover:border-brand-300 hover:shadow-sm transition-all"
                            >
                                <p className="text-sm font-medium text-on-surface">
                                    {article.title}
                                </p>
                                <p className="mt-1 text-xs text-on-surface-muted">
                                    {article.summary}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Contact CTA — polished */}
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-h3 text-brand-900">Still need help?</h3>
                            <p className="mt-2 text-body-sm text-brand-800">
                                Our support team responds to every message within 24 hours.
                            </p>
                        </div>
                        <Link
                            to="/support/contact"
                            className="shrink-0 inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-6 text-sm font-medium text-white shadow-sm hover:bg-brand-800 transition-colors"
                        >
                            Contact support →
                        </Link>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}