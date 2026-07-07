import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Clock, BarChart3, CheckCircle2, XCircle, Pencil, ArrowLeft } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { getAdminLessonById } from '@/lib/admin/lessons'

export default async function AdminLessonDetailPage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string }
}) {
  const dictionary = await getDictionary(locale)
  const result = await getAdminLessonById(id)

  if (!result.data) {
    redirect(`/${locale}/admin/lessons`)
  }

  const lesson = result.data

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'Beginner': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'Intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'Advanced': return 'text-red-400 bg-red-500/10 border-red-500/20'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/admin/lessons`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {dictionary.learning.backToLessons}
        </Link>
        <Link
          href={`/${locale}/admin/lessons/${id}/edit`}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          <Pencil className="h-4 w-4" />
          {dictionary.learning.editLesson}
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            {lesson.title}
          </h1>
          {lesson.is_published ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
              <CheckCircle2 className="h-3 w-3" /> {dictionary.learning.published}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
              <XCircle className="h-3 w-3" /> {dictionary.learning.draft}
            </span>
          )}
        </div>
        {lesson.learning_path_title && (
          <p className="text-sm text-muted-foreground">{dictionary.learning.learningPath}: {lesson.learning_path_title}</p>
        )}
      </div>

      {/* Meta Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm text-center space-y-1">
          <Clock className="h-5 w-5 text-primary mx-auto" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground">{lesson.estimated_minutes}</p>
          <p className="text-xs text-muted-foreground">{dictionary.learning.minutes}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm text-center space-y-1">
          <BarChart3 className="h-5 w-5 text-primary mx-auto" aria-hidden="true" />
          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${difficultyColor(lesson.difficulty)}`}>
            {lesson.difficulty}
          </span>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm text-center space-y-1">
          <BookOpen className="h-5 w-5 text-primary mx-auto" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground">{lesson.sort_order}</p>
          <p className="text-xs text-muted-foreground">{dictionary.learning.sortOrder}</p>
        </div>
      </div>

      {/* Summary */}
      {lesson.summary && (
        <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-foreground mb-2">{dictionary.learning.summary}</h2>
          <p className="text-sm text-muted-foreground">{lesson.summary}</p>
        </div>
      )}

      {/* Objectives */}
      {lesson.objectives.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">{dictionary.learning.objectives}</h2>
          <ul className="space-y-2">
            {lesson.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">{dictionary.learning.content}</h2>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
          {lesson.content}
        </div>
      </div>
    </div>
  )
}
