'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Columns2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { LessonMetadataForm, type LessonMeta } from './lesson-metadata-form'
import { MarkdownEditor } from './markdown-editor'
import { LessonPreview } from './lesson-preview'
import { LessonPublishPanel, validateForPublish } from './lesson-publish-panel'
import { LessonStatusBadge } from './lesson-status-badge'
import {
  createLesson,
  updateLesson,
  toggleLessonPublished,
  duplicateLesson,
  type Lesson,
} from '@/lib/admin/lessons'
import type { LearningPathWithLessonCount } from '@/lib/admin/learning-paths'
import type { Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

interface ModuleOption {
  id: string
  title_en: string
  title_ar: string | null
  learning_path_id: string
}

interface LessonContentStudioProps {
  paths: LearningPathWithLessonCount[]
  modules: ModuleOption[]
  locale: Locale
  initialLesson?: Lesson
  defaultPathId?: string
  defaultModuleId?: string
}

type ActiveLanguage = 'en' | 'ar'
type ViewMode = 'split' | 'edit' | 'preview'

export function LessonContentStudio({
  paths,
  modules,
  locale,
  initialLesson,
  defaultPathId,
  defaultModuleId,
}: LessonContentStudioProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Current working lesson ID (if editing or after initial save)
  const [currentId, setCurrentId] = useState<string | null>(initialLesson?.id ?? null)

  // Form & Editor state
  const [meta, setMeta] = useState<LessonMeta>({
    learning_path_id: initialLesson?.learning_path_id ?? defaultPathId ?? paths[0]?.id ?? '',
    module_id: initialLesson?.module_id ?? defaultModuleId ?? '',
    title_en: initialLesson?.title_en ?? '',
    title_ar: initialLesson?.title_ar ?? '',
    slug: initialLesson?.slug ?? '',
    sort_order: initialLesson?.sort_order ?? 0,
    estimated_minutes: initialLesson?.estimated_minutes ?? 10,
    difficulty: (initialLesson?.difficulty as LessonMeta['difficulty']) ?? 'Beginner',
    is_published: initialLesson?.is_published ?? false,
  })

  const [contentEn, setContentEn] = useState<string>(
    initialLesson?.content_en ?? (initialLesson as any)?.content ?? ''
  )
  const [contentAr, setContentAr] = useState<string>(
    initialLesson?.content_ar ?? ''
  )

  // UI state
  const [activeLang, setActiveLang] = useState<ActiveLanguage>('en')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Track initial state to detect changes
  const lastSavedStateRef = useRef({
    meta,
    contentEn,
    contentAr,
  })

  // Mark as having unsaved changes whenever fields change
  const handleMetaChange = (updates: Partial<LessonMeta>) => {
    setMeta((prev) => ({ ...prev, ...updates }))
    setHasUnsavedChanges(true)
  }

  const handleContentEnChange = (val: string) => {
    setContentEn(val)
    setHasUnsavedChanges(true)
  }

  const handleContentArChange = (val: string) => {
    setContentAr(val)
    setHasUnsavedChanges(true)
  }

  // Language completion helpers
  const isEnComplete = Boolean(meta.title_en.trim().length >= 3 && contentEn.trim().length >= 30)
  const isArComplete = Boolean(meta.title_ar.trim().length >= 3 && contentAr.trim().length >= 30)

  // Core save function
  const saveLessonInternal = useCallback(
    async (publishStatus?: boolean): Promise<{ success: boolean; lessonId?: string }> => {
      setErrorMessage(null)

      const targetIsPublished = publishStatus !== undefined ? publishStatus : meta.is_published

      const payload = {
        learning_path_id: meta.learning_path_id,
        module_id: meta.module_id || null,
        title_en: meta.title_en,
        title_ar: meta.title_ar,
        slug: meta.slug,
        summary_en: '',
        summary_ar: '',
        content_en: contentEn,
        content_ar: contentAr,
        objectives_en: [],
        objectives_ar: [],
        estimated_minutes: meta.estimated_minutes,
        difficulty: meta.difficulty,
        sort_order: meta.sort_order,
        is_published: targetIsPublished,
      }

      if (currentId) {
        // Update existing lesson
        const res = await updateLesson(currentId, payload)
        if (res.error) {
          setErrorMessage(res.error === 'slug_taken' ? 'Slug is already in use.' : res.error)
          return { success: false }
        }
        setMeta((prev) => ({ ...prev, is_published: targetIsPublished }))
        setHasUnsavedChanges(false)
        setLastSavedAt(new Date())
        lastSavedStateRef.current = { meta, contentEn, contentAr }
        return { success: true, lessonId: currentId }
      } else {
        // Create new lesson
        const res = await createLesson(payload)
        if (res.error) {
          setErrorMessage(res.error === 'slug_taken' ? 'Slug is already in use.' : res.error)
          return { success: false }
        }
        if (res.data) {
          setCurrentId(res.data.id)
          setMeta((prev) => ({ ...prev, is_published: targetIsPublished, sort_order: res.data!.sort_order }))
          setHasUnsavedChanges(false)
          setLastSavedAt(new Date())
          lastSavedStateRef.current = { meta, contentEn, contentAr }
          // Replace URL to edit mode seamlessly without full reload
          window.history.replaceState(null, '', `/${locale}/admin/lessons/${res.data.id}/edit`)
          return { success: true, lessonId: res.data.id }
        }
        return { success: false }
      }
    },
    [currentId, meta, contentEn, contentAr, locale]
  )

  // ── Save Draft Handler ───────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setIsSaving(true)
    setSuccessMessage(null)
    const result = await saveLessonInternal()
    setIsSaving(false)
    if (result.success) {
      setSuccessMessage('Draft saved successfully.')
      setTimeout(() => setSuccessMessage(null), 3500)
    }
  }

  // ── Publish Handler ─────────────────────────────────────────────────────────
  const handlePublish = async () => {
    // Validate required fields
    const validation = validateForPublish(
      meta.module_id,
      meta.title_en,
      meta.title_ar,
      contentEn,
      contentAr
    )

    if (!validation.canPublish) {
      setErrorMessage('Cannot publish: Please fix all blocking errors listed below.')
      return
    }

    setIsPublishing(true)
    setSuccessMessage(null)
    const result = await saveLessonInternal(true)
    setIsPublishing(false)

    if (result.success) {
      setSuccessMessage('Lesson published successfully!')
      setTimeout(() => setSuccessMessage(null), 4000)
      router.refresh()
    }
  }

  // ── Unpublish Handler ───────────────────────────────────────────────────────
  const handleUnpublish = async () => {
    if (!currentId) return
    setIsPublishing(true)
    setSuccessMessage(null)
    const res = await toggleLessonPublished(currentId, false)
    setIsPublishing(false)

    if (res.error) {
      setErrorMessage(res.error)
    } else {
      setMeta((prev) => ({ ...prev, is_published: false }))
      setSuccessMessage('Lesson unpublished and returned to Draft.')
      setTimeout(() => setSuccessMessage(null), 3500)
      router.refresh()
    }
  }

  // ── Duplicate Handler ───────────────────────────────────────────────────────
  const handleDuplicate = async () => {
    if (!currentId) return
    const confirmed = window.confirm('Create a new Draft copy of this lesson?')
    if (!confirmed) return

    startTransition(async () => {
      const res = await duplicateLesson(currentId)
      if (res.error) {
        setErrorMessage(res.error)
      } else if (res.data) {
        router.push(`/${locale}/admin/lessons/${res.data.id}/edit`)
      }
    })
  }

  // ── Autosave Debounce (Only for existing lesson with changes) ────────────────
  useEffect(() => {
    if (!currentId || !hasUnsavedChanges || isSaving || isPublishing) return

    const timer = setTimeout(async () => {
      setIsSaving(true)
      await saveLessonInternal()
      setIsSaving(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [hasUnsavedChanges, currentId, saveLessonInternal, isSaving, isPublishing])

  const activeTitle = activeLang === 'en' ? meta.title_en : meta.title_ar
  const activeContent = activeLang === 'en' ? contentEn : contentAr

  return (
    <div className="space-y-6">
      {/* Top Header Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/lessons`}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Lessons
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {currentId ? 'Lesson Content Studio' : 'Create New Lesson'}
            </h1>
            <LessonStatusBadge isPublished={meta.is_published} />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {currentId && (
            <>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Duplicate lesson into a new draft"
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </button>

              <Link
                href={`/${locale}/admin/lessons/${currentId}`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Open student preview in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview Page
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Top Grid: Metadata (2/3) + Publish & Autosave Panel (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <LessonMetadataForm
            meta={meta}
            onChange={handleMetaChange}
            paths={paths}
            modules={modules}
            disabled={isSaving || isPublishing}
          />
        </div>

        <div className="lg:col-span-1">
          <LessonPublishPanel
            isPublished={meta.is_published}
            moduleId={meta.module_id}
            titleEn={meta.title_en}
            titleAr={meta.title_ar}
            contentEn={contentEn}
            contentAr={contentAr}
            isSaving={isSaving}
            isPublishing={isPublishing}
            lastSavedAt={lastSavedAt}
            hasUnsavedChanges={hasUnsavedChanges}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
        </div>
      </div>

      {/* Main Studio Area: Language Tabs + View Mode Controls */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
          {/* Language Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider me-1">
              Language:
            </span>
            <button
              type="button"
              onClick={() => setActiveLang('en')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                activeLang === 'en'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <span>English</span>
              {isEnComplete && (
                <span className="text-xs bg-green-500/20 text-green-300 rounded-full px-1.5 py-0.2">
                  ✓
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveLang('ar')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                activeLang === 'ar'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <span>العربية</span>
              {isArComplete && (
                <span className="text-xs bg-green-500/20 text-green-300 rounded-full px-1.5 py-0.2">
                  ✓
                </span>
              )}
            </button>
          </div>

          {/* View Mode Controls (Desktop/Tablet) */}
          <div className="flex items-center gap-1 bg-secondary/40 border border-border/50 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                viewMode === 'edit'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editor Only
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={cn(
                'hidden md:flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                viewMode === 'split'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Side-by-Side
            </button>

            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                viewMode === 'preview'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview Only
            </button>
          </div>
        </div>

        {/* Studio Content Grid */}
        <div
          className={cn(
            'grid gap-6 items-stretch',
            viewMode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {/* Editor Column */}
          {(viewMode === 'split' || viewMode === 'edit') && (
            <div className="flex flex-col min-h-[550px]">
              <MarkdownEditor
                value={activeLang === 'en' ? contentEn : contentAr}
                onChange={activeLang === 'en' ? handleContentEnChange : handleContentArChange}
                dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                label={
                  activeLang === 'en'
                    ? `English Lesson Content (Markdown)`
                    : `محتوى الدرس بالعربية (Markdown)`
                }
                disabled={isSaving || isPublishing}
              />
            </div>
          )}

          {/* Preview Column */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div className="flex flex-col min-h-[550px]">
              <LessonPreview
                title={activeTitle}
                content={activeContent}
                dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
