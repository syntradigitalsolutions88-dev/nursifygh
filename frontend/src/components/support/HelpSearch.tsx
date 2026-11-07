import { useState, useMemo } from "react"
import { Link } from "react-router-dom"

import { searchArticles, type HelpArticle } from "../../data/help-articles"

/**
 * Search box + live results for the Help Center.
 */
export default function HelpSearch() {
    const [query, setQuery] = useState("")
    const results = useMemo<HelpArticle[]>(() => searchArticles(query), [query])
    const showResults = query.trim().length > 0

    return (
        <div className="relative">
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-muted">
                    <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
                        />
                    </svg>
                </span>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search help articles…"
                    className="block w-full h-12 rounded-lg border border-border bg-white pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
            </div>

            {showResults && (
                <div className="mt-2 rounded-lg border border-border bg-white shadow-lg max-h-96 overflow-auto">
                    {results.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-on-surface-muted text-center">
                            No articles found for "<span className="font-medium">{query}</span>".
                            <br />
                            <Link to="/contact" className="text-brand-600 hover:underline">
                                Contact support instead →
                            </Link>
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {results.map((article) => (
                                <li key={article.slug}>
                                    <Link
                                        to={`/help/${article.slug}`}
                                        className="block px-4 py-3 hover:bg-surface-subtle"
                                        onClick={() => setQuery("")}
                                    >
                                        <p className="text-sm font-medium text-on-surface">
                                            {article.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-on-surface-muted">
                                            {article.summary}
                                        </p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}