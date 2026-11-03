'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
  /** Set to 'rtl' for Arabic content */
  dir?: 'ltr' | 'rtl'
}

/**
 * Safe Markdown renderer using react-markdown + remark-gfm.
 *
 * Security: react-markdown renders to React elements — no dangerouslySetInnerHTML.
 * Raw HTML in the source is escaped, not executed.
 *
 * Supports: headings, bold, italic, lists, code blocks, blockquotes, tables,
 * horizontal rules, links.
 */
export function MarkdownRenderer({ content, className, dir = 'ltr' }: MarkdownRendererProps) {
  if (!content || content.trim() === '') {
    return (
      <p className="text-muted-foreground italic text-sm">No content yet.</p>
    )
  }

  return (
    <div
      dir={dir}
      className={cn('markdown-body', dir === 'rtl' && 'text-right', className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground mt-8 mb-4 first:mt-0 border-b border-border/40 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-heading text-xl font-bold text-foreground mt-7 mb-3 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-semibold text-lg text-foreground mt-5 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-semibold text-base text-foreground mt-4 mb-2">
              {children}
            </h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="text-foreground/80 leading-relaxed mb-4">{children}</p>
          ),
          // Strong / Em
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/90">{children}</em>
          ),
          // Unordered list
          ul: ({ children }) => (
            <ul className={cn('space-y-1.5 mb-4 ps-5 list-disc marker:text-primary', dir === 'rtl' && 'list-inside')}>
              {children}
            </ul>
          ),
          // Ordered list
          ol: ({ children }) => (
            <ol className={cn('space-y-1.5 mb-4 ps-5 list-decimal marker:text-primary', dir === 'rtl' && 'list-inside')}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground/80 leading-relaxed">{children}</li>
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className={cn(
              'border-s-2 border-primary/50 ps-4 py-1 my-4 rounded-e-lg bg-primary/5 text-foreground/70 italic',
              dir === 'rtl' && 'border-s-0 border-e-2 pe-4 ps-0 rounded-e-none rounded-s-lg'
            )}>
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="border-border/40 my-6" />
          ),
          // Inline code
          code: ({ children, className: codeClass }) => {
            const isBlock = codeClass?.includes('language-')
            if (isBlock) {
              // Extract language for display
              const lang = codeClass?.replace('language-', '') ?? ''
              return (
                <div className="my-4 rounded-xl overflow-hidden border border-border/40">
                  {lang && (
                    <div className="bg-secondary/60 px-4 py-1.5 text-xs font-mono text-muted-foreground border-b border-border/40">
                      {lang}
                    </div>
                  )}
                  <pre dir="ltr" className="bg-secondary/40 p-4 overflow-x-auto text-left">
                    <code className="text-sm font-mono text-foreground/90">{children}</code>
                  </pre>
                </div>
              )
            }
            return (
              <code dir="ltr" style={{ unicodeBidi: "isolate" }} className="rounded px-1.5 py-0.5 bg-secondary/60 text-sm font-mono text-primary/90 border border-border/30">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <>{children}</>,
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          // Tables (GFM)
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-border/40">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-secondary/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-start font-semibold text-foreground border-b border-border/40">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-foreground/80 border-b border-border/20">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-secondary/20 transition-colors">{children}</tr>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
