'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, Plus, X } from 'lucide-react'
import { lessonSchema, type LessonFormValues } from '@/lib/validations/lesson'
import { createLesson, updateLesson } from '@/lib/admin/lessons'
import type { LearningPathWithLessonCount } from '@/lib/admin/learning-paths'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface LessonFormProps {
  paths: LearningPathWithLessonCount[]
  dictionary: Dictionary
  locale: Locale
  initialData?: LessonFormValues & { id: string }
}

export function LessonForm({ paths, dictionary, locale, initialData }: LessonFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isEditing = Boolean(initialData)
  const inputClass =
    'block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors'

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: initialData ?? {
      learning_path_id: paths[0]?.id ?? '',
      title_en: '',
      title_ar: '',
      slug: '',
      summary_en: '',
      summary_ar: '',
      content_en: '',
      content_ar: '',
      objectives_en: [],
      objectives_ar: [],
      estimated_minutes: 10,
      difficulty: 'Beginner',
      sort_order: 0,
      is_published: false,
    },
  })

  const englishObjectives = useFieldArray({
    control,
    name: 'objectives_en' as never,
  })
  const arabicObjectives = useFieldArray({
    control,
    name: 'objectives_ar' as never,
  })

  const onSubmit = (data: LessonFormValues) => {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = initialData
        ? await updateLesson(initialData.id, data)
        : await createLesson(data)

      if (result.error) {
        setServerError(result.error === 'slug_taken' ? 'Slug is already taken in this learning path.' : result.error)
        return
      }

      setSuccessMessage(isEditing ? dictionary.learning.lessonUpdated : dictionary.learning.lessonCreated)
      if (!isEditing && result.data) {
        router.push(`/${locale}/admin/lessons/${result.data.id}`)
      } else {
        router.refresh()
      }
    })
  }

  const renderObjectives = (
    label: string,
    fieldArray: typeof englishObjectives,
    name: 'objectives_en' | 'objectives_ar',
    direction?: 'rtl',
  ) => (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {fieldArray.fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <input
            {...register(`${name}.${index}`)}
            className={inputClass}
            disabled={isPending}
            dir={direction}
          />
          <button
            type="button"
            onClick={() => fieldArray.remove(index)}
            className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{dictionary.learning.removeObjective}</span>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => fieldArray.append('' as never)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {dictionary.learning.addObjective}
      </button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.learningPath}</label>
          <select {...register('learning_path_id')} className={inputClass} disabled={isPending}>
            {paths.map((path) => (
              <option key={path.id} value={path.id}>{locale === 'ar' ? path.title_ar || path.title_en : path.title_en || path.title_ar}</option>
            ))}
          </select>
          {errors.learning_path_id && <p className="text-xs text-destructive">{errors.learning_path_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.difficulty}</label>
          <select {...register('difficulty')} className={inputClass} disabled={isPending}>
            <option value="Beginner">{dictionary.learning.beginner}</option>
            <option value="Intermediate">{dictionary.learning.intermediate}</option>
            <option value="Advanced">{dictionary.learning.advanced}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.englishTitle}</label>
          <input type="text" {...register('title_en')} className={inputClass} disabled={isPending} />
          {errors.title_en && <p className="text-xs text-destructive">{errors.title_en.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.arabicTitle}</label>
          <input type="text" {...register('title_ar')} className={inputClass} disabled={isPending} dir="rtl" />
          {errors.title_ar && <p className="text-xs text-destructive">{errors.title_ar.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.lessonSlug}</label>
          <input type="text" {...register('slug')} className={inputClass} disabled={isPending} placeholder="what-is-qa" />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.estimatedMinutes}</label>
          <input type="number" {...register('estimated_minutes', { valueAsNumber: true })} className={inputClass} disabled={isPending} />
          {errors.estimated_minutes && <p className="text-xs text-destructive">{errors.estimated_minutes.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.sortOrder}</label>
          <input type="number" {...register('sort_order', { valueAsNumber: true })} className={inputClass} disabled={isPending} />
          {errors.sort_order && <p className="text-xs text-destructive">{errors.sort_order.message}</p>}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.englishSummary}</label>
          <textarea {...register('summary_en')} className={inputClass} rows={2} disabled={isPending} />
          {errors.summary_en && <p className="text-xs text-destructive">{errors.summary_en.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.arabicSummary}</label>
          <textarea {...register('summary_ar')} className={inputClass} rows={2} disabled={isPending} dir="rtl" />
          {errors.summary_ar && <p className="text-xs text-destructive">{errors.summary_ar.message}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.englishContent}</label>
          <textarea {...register('content_en')} className={inputClass} rows={10} disabled={isPending} />
          {errors.content_en && <p className="text-xs text-destructive">{errors.content_en.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.arabicContent}</label>
          <textarea {...register('content_ar')} className={inputClass} rows={10} disabled={isPending} dir="rtl" />
          {errors.content_ar && <p className="text-xs text-destructive">{errors.content_ar.message}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderObjectives(dictionary.learning.englishObjectives, englishObjectives, 'objectives_en')}
        {renderObjectives(dictionary.learning.arabicObjectives, arabicObjectives, 'objectives_ar', 'rtl')}
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="is_published" {...register('is_published')} className="h-4 w-4 accent-primary" />
        <label htmlFor="is_published" className="text-sm font-medium text-foreground">{dictionary.learning.published}</label>
      </div>

      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {serverError}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400" role="status">
          {successMessage}
        </div>
      )}

      <div className="flex justify-end border-t border-border/40 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {dictionary.learning.saveLesson}
        </button>
      </div>
    </form>
  )
}
