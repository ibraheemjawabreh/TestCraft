'use client'

import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { cn } from '@/lib/utils'

interface LessonPreviewProps {
  title: string
  content: string
  dir?: 'ltr' | 'rtl'
  className?: string
}

/**
 * Live preview of how the student will see a lesson.
 * Uses the same MarkdownRenderer as the actual student lesson viewer.
 */
export function LessonPreview({ title, content, dir = 'ltr', className }: LessonPreviewProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-xl border border-border/50 bg-card/60 overflow-hidden',
        className,
      )}
    >
      {/* Preview header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-secondary/30">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Student Preview — {dir === 'rtl' ? 'عرض الطالب' : 'Student View'}
        </span>
      </div>

      {/* Preview content */}
      <div
        className={cn(
          'flex-1 overflow-y-auto p-5 sm:p-6',
          dir === 'rtl' && 'text-right',
        )}
        dir={dir}
      >
        {/* Lesson title */}
        {title && (
          <h1
            className={cn(
              'font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mb-6',
              dir === 'rtl' && 'text-right',
            )}
          >
            {title}
          </h1>
        )}

        {/* Rendered Markdown content */}
        <MarkdownRenderer content={content} dir={dir} />
      </div>
    </div>
  )
}
