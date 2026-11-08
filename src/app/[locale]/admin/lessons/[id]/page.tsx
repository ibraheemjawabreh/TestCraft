import { resolveLocale } from '@/lib/locale'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil, Clock, BarChart3, Globe2 } from 'lucide-react'
import { getAdminLessonById, getAdminLessonPractice } from '@/lib/admin/lessons'
import { LessonPracticeEditor } from '@/components/admin/curriculum/lesson-practice-editor'
import { getDictionary } from '@/i18n/get-dictionary'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { LessonStatusBadge } from '@/components/admin/lessons/lesson-status-badge'
import type { Locale } from '@/i18n/config'

interface LessonPreviewPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
  searchParams?: Promise<{
    lang?: 'en' | 'ar'
  }>
}

export default async function AdminLessonPreviewPage({
  params,
  searchParams,
}: LessonPreviewPageProps) {
  const { locale: routeLocale, id } = await params
  const locale = resolveLocale(routeLocale)
  const resolvedSearchParams = await searchParams

  const dictionary = await getDictionary(locale)
  const result = await getAdminLessonById(id, locale)

  if (!result.data) {
    notFound()
  }

  const lesson = result.data
  const practice = await getAdminLessonPractice(id)
  const activeLang = resolvedSearchParams?.lang ?? (locale === 'ar' ? 'ar' : 'en')

  const title = activeLang === 'ar' ? lesson.title_ar || lesson.title_en : lesson.title_en || lesson.title_ar
  const content = activeLang === 'ar' ? lesson.content_ar || lesson.content_en : lesson.content_en || lesson.content_ar

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/lessons`}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Lessons
          </Link>
          <LessonStatusBadge isPublished={lesson.is_published} />
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center rounded-lg bg-secondary/40 border border-border/50 p-0.5 text-xs">
            <Link
              href={`/${locale}/admin/lessons/${id}?lang=en`}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeLang === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              English
            </Link>
            <Link
              href={`/${locale}/admin/lessons/${id}?lang=ar`}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                activeLang === 'ar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              العربية
            </Link>
          </div>

          <Link
            href={`/${locale}/admin/lessons/${id}/edit`}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit in Studio
          </Link>
        </div>
      </div>

      {/* Lesson Meta Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {lesson.learning_path_title && <span>Path: <strong className="text-foreground">{lesson.learning_path_title}</strong></span>}
          {lesson.module_title && (
            <>
              <span>·</span>
              <span>Module: <strong className="text-foreground">{lesson.module_title}</strong></span>
            </>
          )}
          <span>·</span>
          <span>Order: <strong className="text-foreground">#{lesson.sort_order}</strong></span>
        </div>

        <h1
          dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
          className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground"
        >
          {title || 'Untitled Lesson'}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {lesson.estimated_minutes} min read
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            {lesson.difficulty}
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <Globe2 className="h-3.5 w-3.5 text-primary" />
            /{lesson.slug}
          </span>
        </div>
      </div>

      {/* Rendered Lesson Content */}
      <div className="rounded-2xl border border-border/50 bg-card/50 p-6 sm:p-10 backdrop-blur-sm shadow-sm">
        <MarkdownRenderer
          content={content || ''}
          dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
        />
      </div>
      {practice.error ? <p role="alert" className="text-destructive">{practice.error}</p> : <LessonPracticeEditor key={lesson.updated_at} lessonId={lesson.id} initial={practice.data ?? []} updatedAt={lesson.updated_at} published={lesson.is_published} locale={locale} dictionary={dictionary} />}
    </div>
  )
}
