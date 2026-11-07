import { Link } from "react-router-dom"

import Footer from "../components/layout/Footer"
import PublicHeader from "../components/layout/PublicHeader"
import HelpSearch from "../components/support/HelpSearch"
import {
    HELP_ARTICLES,
    HELP_CATEGORIES,
    getArticlesByCategory,
} from "../data/help-articles"

export default function HelpCenterPage() {
    return (
        <div className="min-h-screen bg-surface">
            <PublicHeader />

            <main className="container-page py-12 lg:py-16">
                {/* Hero */}
                <div className="max-w-2xl mx-auto text-center">
                    <h1 className="text-h1">How can we help you?</h1>
                    <p className="mt-3 text-body text-on-surface-muted">
                        Browse common questions, or contact us if you can't find what you
                        need.
                    </p>
                    <div className="mt-6 max-w-md mx-auto">
                        <HelpSearch />
                    </div>
                </div>

                {/* Categories */}
                <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {HELP_CATEGORIES.map((cat) => {
                        const count = getArticlesByCategory(cat.value).length
                        return (
                            <div
                                key={cat.value}
                                className="rounded-xl border border-border bg-white p-5"
                            >
                                <div className="flex items-center justify-between">
                                    <h2 className="text-h4">{cat.label}</h2>
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

                {/* All articles */}
                <div className="mt-16">
                    <h2 className="text-h2 text-center">All articles</h2>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
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

                {/* Contact CTA */}
                <div className="mt-16 rounded-xl border border-brand-200 bg-brand-50 p-8 text-center">
                    <h2 className="text-h3 text-brand-900">Still need help?</h2>
                    <p className="mt-2 text-sm text-brand-800">
                        Our support team responds within 24 hours.
                    </p>
                    <Link
                        to="/contact"
                        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-medium text-white hover:bg-brand-800"
                    >
                        Contact support →
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    )
}