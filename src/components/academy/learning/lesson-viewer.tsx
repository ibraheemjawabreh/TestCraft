import { BookOpen, Clock, BarChart3, CheckCircle2 } from 'lucide-react'
import type { TesterLesson } from '@/lib/academy/lessons'
import type { Dictionary } from '@/i18n/types'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'

interface LessonViewerProps {
  lesson: TesterLesson
  dictionary: Dictionary
  locale?: string
}

export function LessonViewer({ lesson, dictionary, locale }: LessonViewerProps) {
  const difficultyColor = (d: string) => {
    switch (d) {
      case 'Beginner': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'Intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'Advanced': return 'text-red-400 bg-red-500/10 border-red-500/20'
      default: return 'text-muted-foreground'
    }
  }

  // Detect Arabic content or locale
  const isArabic = locale === 'ar' || /[\u0600-\u06FF]/.test(lesson.title)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {lesson.is_completed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
              <CheckCircle2 className="h-3 w-3" /> {dictionary.learning.completed}
            </span>
          )}
          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${difficultyColor(lesson.difficulty)}`}>
            {lesson.difficulty}
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {lesson.title}
        </h1>
        {lesson.learning_path_title && (
          <p className="text-sm text-muted-foreground">{dictionary.learning.learningPath}: {lesson.learning_path_title}</p>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          {lesson.estimated_minutes} {dictionary.learning.minutes}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
          {lesson.difficulty}
        </div>
      </div>

      {/* Summary */}
      {lesson.summary && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm text-foreground/80 leading-relaxed">{lesson.summary}</p>
        </div>
      )}

      {/* Objectives (if any legacy objectives exist) */}
      {lesson.objectives && lesson.objectives.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            {dictionary.learning.lessonObjectives}
          </h2>
          <ul className="space-y-2.5">
            {lesson.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-6 sm:p-8 backdrop-blur-sm">
        <MarkdownRenderer
          content={lesson.content}
          dir={isArabic ? 'rtl' : 'ltr'}
        />
      </div>
    </div>
  )
}

