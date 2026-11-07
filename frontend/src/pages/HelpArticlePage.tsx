import { Link, useParams } from "react-router-dom"

import Footer from "../components/layout/Footer"
import PublicHeader from "../components/layout/PublicHeader"
import { getArticleBySlug } from "../data/help-articles"

/**
 * Renders a single help article.
 *
 * The article content is plain markdown. For a production-grade renderer
 * we'd add react-markdown; for now we handle the subset of markdown used
 * in our articles: headings, bold, code, lists, and links.
 */
export default function HelpArticlePage() {
    const { slug } = useParams<{ slug: string }>()
    const article = slug ? getArticleBySlug(slug) : undefined

    if (!article) {
        return (
            <div className="min-h-screen bg-surface">
                <PublicHeader />
                <main className="container-page py-16 text-center">
                    <h1 className="text-h2">Article not found</h1>
                    <p className="mt-2 text-on-surface-muted">
                        This help article doesn't exist or has been moved.
                    </p>
                    <Link
                        to="/help"
                        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-medium text-white hover:bg-brand-800"
                    >
                        ← Back to Help Center
                    </Link>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface">
            <PublicHeader />

            <main className="container-page py-12 lg:py-16 max-w-3xl">
                <Link
                    to="/help"
                    className="text-sm text-brand-600 hover:underline"
                >
                    ← Back to Help Center
                </Link>

                <article className="mt-6">
                    <h1 className="text-h1">{article.title}</h1>
                    <p className="mt-2 text-body-sm text-on-surface-muted">
                        {article.summary}
                    </p>

                    <div className="mt-8 rounded-xl border border-border bg-white p-6 lg:p-8 prose prose-sm max-w-none">
                        <SimpleMarkdown content={article.content} />
                    </div>
                </article>
            </main>

            <Footer />
        </div>
    )
}

/**
 * Minimal markdown renderer for the subset of syntax used in help articles:
 * - # heading 1
 * - ## heading 2
 * - ### heading 3
 * - **bold**
 * - `inline code`
 * - - bullet list
 * - 1. numbered list
 * - [text](url) links
 * - Blank line = paragraph break
 */
function SimpleMarkdown({ content }: { content: string }) {
    const lines = content.split("\n")
    const blocks: React.ReactNode[] = []
    let listBuffer: string[] = []
    let listType: "ul" | "ol" | null = null

    function flushList() {
        if (listBuffer.length === 0) return
        const Tag = listType === "ol" ? "ol" : "ul"
        blocks.push(
            <Tag
                key={blocks.length}
                className={listType === "ol" ? "list-decimal pl-6 my-3" : "list-disc pl-6 my-3"}
            >
                {listBuffer.map((item, idx) => (
                    <li key={idx} className="text-sm text-on-surface mb-1">
                        {renderInline(item)}
                    </li>
                ))}
            </Tag>,
        )
        listBuffer = []
        listType = null
    }

    for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, "")

        if (line.trim() === "") {
            flushList()
            continue
        }

        if (line.startsWith("# ")) {
            flushList()
            blocks.push(
                <h2 key={blocks.length} className="text-h2 mt-6 mb-3 text-on-surface">
                    {renderInline(line.slice(2))}
                </h2>,
            )
            continue
        }
        if (line.startsWith("## ")) {
            flushList()
            blocks.push(
                <h3 key={blocks.length} className="text-h3 mt-5 mb-2 text-on-surface">
                    {renderInline(line.slice(3))}
                </h3>,
            )
            continue
        }
        if (line.startsWith("### ")) {
            flushList()
            blocks.push(
                <h4 key={blocks.length} className="text-h4 mt-4 mb-2 text-on-surface">
                    {renderInline(line.slice(4))}
                </h4>,
            )
            continue
        }

        if (line.match(/^-\s+/)) {
            if (listType !== "ul") {
                flushList()
                listType = "ul"
            }
            listBuffer.push(line.replace(/^-\s+/, ""))
            continue
        }
        if (line.match(/^\d+\.\s+/)) {
            if (listType !== "ol") {
                flushList()
                listType = "ol"
            }
            listBuffer.push(line.replace(/^\d+\.\s+/, ""))
            continue
        }

        flushList()
        blocks.push(
            <p key={blocks.length} className="text-sm text-on-surface my-3 leading-relaxed">
                {renderInline(line)}
            </p>,
        )
    }
    flushList()

    return <>{blocks}</>
}

function renderInline(text: string): React.ReactNode {
    // Handle **bold**
    const parts: (string | React.ReactNode)[] = []
    let remaining = text
    let key = 0

    const boldRegex = /\*\*([^*]+)\*\*/g
    const codeRegex = /`([^`]+)`/g
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

    // Tokenize by scanning for the leftmost match of any inline pattern
    while (remaining.length > 0) {
        boldRegex.lastIndex = 0
        codeRegex.lastIndex = 0
        linkRegex.lastIndex = 0

        const boldMatch = boldRegex.exec(remaining)
        const codeMatch = codeRegex.exec(remaining)
        const linkMatch = linkRegex.exec(remaining)

        const candidates = [
            boldMatch && { match: boldMatch, kind: "bold" as const },
            codeMatch && { match: codeMatch, kind: "code" as const },
            linkMatch && { match: linkMatch, kind: "link" as const },
        ]
            .filter(Boolean)
            .sort((a, b) => (a!.match.index - b!.match.index))

        if (candidates.length === 0) {
            parts.push(remaining)
            break
        }

        const next = candidates[0]!
        const before = remaining.slice(0, next.match.index)
        if (before) parts.push(before)

        if (next.kind === "bold") {
            parts.push(
                <strong key={`b-${key++}`} className="font-semibold text-on-surface">
                    {next.match[1]}
                </strong>,
            )
        } else if (next.kind === "code") {
            parts.push(
                <code key={`c-${key++}`} className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs font-mono">
                    {next.match[1]}
                </code>,
            )
        } else {
            const [, label, href] = next.match
            const isExternal = href.startsWith("http")
            parts.push(
                isExternal ? (
                    <a
                        key={`l-${key++}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                    >
                        {label}
                    </a>
                ) : (
                    <a
                        key={`l-${key++}`}
                        href={href}
                        className="text-brand-600 hover:underline"
                    >
                        {label}
                    </a>
                ),
            )
        }

        remaining = remaining.slice(next.match.index + next.match[0].length)
    }

    return <>{parts}</>
}