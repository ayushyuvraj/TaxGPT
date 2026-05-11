import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Source } from '../lib/types'

interface AnswerWithCitationsProps {
  answer: string
  sources?: Source[]
  onCitationClick: (source: Source) => void
}

export function AnswerWithCitations({ answer, sources = [], onCitationClick }: AnswerWithCitationsProps) {
  // Create a map of section numbers to sources
  const sectionMap = useMemo(() => {
    const map = new Map<string, Source>()
    sources.forEach(source => {
      // First, use explicit section field if available
      if (source.section) {
        map.set(source.section.toLowerCase(), source)
        map.set(source.section, source)
      }

      // Also try to extract section number from source filename/title
      // Matches patterns like "Section-86", "Section 86", "§86", etc.
      const sectionMatch = source.source.match(/(?:Section[-\s]*)(\d+[A-Za-z]*(?:\([^)]*\))*)/i)
      if (sectionMatch) {
        const extractedSection = sectionMatch[1]
        map.set(extractedSection.toLowerCase(), source)
        map.set(extractedSection, source)
      }
    })
    return map
  }, [sources])

  // Pre-process answer to convert section references to markdown links
  const processedAnswer = useMemo(() => {
    let result = answer

    // Step 0: Strip LLM-fabricated URLs from section citation links.
    // LLMs often output [Section 201 of the Income Tax Act, 2025](Section 201) — the href
    // is not a real URL, just the section name. Strip the (url) part so the text becomes
    // plain "Section 201 of the Income Tax Act, 2025" which the patterns below can handle.
    result = result.replace(
      /\[(Section\s+\d+[A-Za-z]*[^\]]*)\]\((?!https?:\/\/)[^)]*\)/gi,
      '$1'
    )

    if (sectionMap.size === 0) return result

    // Pattern 1: "Section 123" format
    result = result.replace(/(?<![\w-])Section\s+(\d+[A-Za-z]*(?:\([^)]*\))*)/gi, (match, section) => {
      const source = sectionMap.get(section) || sectionMap.get(section.toLowerCase())
      return source ? `[${match}](citation:${section})` : match
    })

    // Pattern 2: "§123" format
    result = result.replace(/§\s*(\d+[A-Za-z]*(?:\([^)]*\))*)/g, (match, section) => {
      const source = sectionMap.get(section) || sectionMap.get(section.toLowerCase())
      return source ? `[${match}](citation:${section})` : match
    })

    return result
  }, [answer, sectionMap])

  // Custom link component that detects and handles citations
  const handleLink = ({ href, children }: { href?: string; children: React.ReactNode }) => {
    const isRealUrl = href?.startsWith('http://') || href?.startsWith('https://')

    if (!href?.startsWith('citation:')) {
      if (isRealUrl) {
        // Genuine external link — open in new tab
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
          >
            {children}
          </a>
        )
      }
      // Non-http link (LLM-fabricated href that slipped through) — try to extract a
      // section number from the link text and route to the citation handler
      const text = typeof children === 'string' ? children :
        (Array.isArray(children) ? children.join('') : '')
      const m = text.match(/(?:Section\s+|§\s*)(\d+[A-Za-z]*)/i)
      if (m) {
        const sectionNum = m[1]
        const source = sectionMap.get(sectionNum) || sectionMap.get(sectionNum.toLowerCase())
        if (source) {
          return (
            <button
              onClick={() => onCitationClick(source)}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 hover:border-indigo-500/80 transition-all cursor-pointer group font-mono font-semibold text-indigo-300 hover:text-indigo-200"
              title={`View Section ${sectionNum}`}
              type="button"
            >
              {children}
            </button>
          )
        }
      }
      return <span className="text-indigo-300/70">{children}</span>
    }

    // Citation link (citation:123)
    const sectionNum = href.replace('citation:', '')
    const source = sectionMap.get(sectionNum) || sectionMap.get(sectionNum.toLowerCase())

    if (!source) {
      return <span>{children}</span>
    }

    return (
      <button
        onClick={() => onCitationClick(source)}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 hover:border-indigo-500/80 transition-all cursor-pointer group font-mono font-semibold text-indigo-300 hover:text-indigo-200"
        title={`View Section ${sectionNum}`}
        type="button"
      >
        {children}
        <svg
          className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    )
  }

  return (
    <ReactMarkdown
      components={{
        a: handleLink,
        p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
        ul: ({ children }) => <ul className="text-sm list-disc list-inside space-y-1 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="text-sm list-decimal list-inside space-y-1 mb-2">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-white mt-3 mb-1">{children}</h3>,
        h4: ({ children }) => <h4 className="text-sm font-semibold text-gray-200 mt-2 mb-1">{children}</h4>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-indigo-500 pl-3 text-gray-400 italic my-2">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs border-collapse w-full">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-white/20 px-2 py-1 text-left font-semibold bg-white/10">{children}</th>
        ),
        td: ({ children }) => <td className="border border-white/10 px-2 py-1">{children}</td>,
        hr: () => <hr className="border-white/10 my-3" />,
      }}
    >
      {processedAnswer}
    </ReactMarkdown>
  )
}
