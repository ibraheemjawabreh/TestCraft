'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, Plus, X } from 'lucide-react'
import { lessonSchema, type LessonFormValues } from '@/lib/validations/lesson'
import { createLesson, updateLesson, toggleLessonPublished } from '@/lib/admin/lessons'
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

  const isEditing = !!initialData

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: initialData ?? {
      learning_path_id: paths[0]?.id ?? '',
      title: '',
      slug: '',
      summary: '',
      content: '',
      objectives: [],
      estimated_minutes: 10,
      difficulty: 'Beginner',
      sort_order: 0,
      is_published: false,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'objectives' as never,
  })

  const isLoading = isPending

  const onSubmit = (data: LessonFormValues) => {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = isEditing
        ? await updateLesson(initialData.id, data)
        : await createLesson(data)

      if (result.error) {
        if (result.error === 'slug_taken') {
          setServerError('Slug is already taken in this learning path.')
        } else {
          setServerError(result.error)
        }
      } else {
        setSuccessMessage(isEditing ? dictionary.learning.lessonUpdated : dictionary.learning.lessonCreated)
        if (!isEditing && result.data) {
          router.push(`/${locale}/admin/lessons/${result.data.id}`)
        } else {
          router.refresh()
        }
      }
    })
  }

  const inputClass =
    'block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Learning Path */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.learningPath}</label>
          <select {...register('learning_path_id')} className={inputClass} disabled={isLoading}>
            {paths.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          {errors.learning_path_id && <p className="text-xs text-destructive">{errors.learning_path_id.message}</p>}
        </div>

        {/* Difficulty */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.difficulty}</label>
          <select {...register('difficulty')} className={inputClass} disabled={isLoading}>
            <option value="Beginner">{dictionary.learning.beginner}</option>
            <option value="Intermediate">{dictionary.learning.intermediate}</option>
            <option value="Advanced">{dictionary.learning.advanced}</option>
          </select>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.lessonTitle}</label>
          <input type="text" {...register('title')} className={inputClass} disabled={isLoading} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.lessonSlug}</label>
          <input type="text" {...register('slug')} className={inputClass} disabled={isLoading} placeholder="what-is-qa" />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>

        {/* Estimated Minutes */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.estimatedMinutes}</label>
          <input type="number" {...register('estimated_minutes', { valueAsNumber: true })} className={inputClass} disabled={isLoading} />
          {errors.estimated_minutes && <p className="text-xs text-destructive">{errors.estimated_minutes.message}</p>}
        </div>

        {/* Sort Order */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.sortOrder}</label>
          <input type="number" {...register('sort_order', { valueAsNumber: true })} className={inputClass} disabled={isLoading} />
          {errors.sort_order && <p className="text-xs text-destructive">{errors.sort_order.message}</p>}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">{dictionary.learning.summary}</label>
        <textarea {...register('summary')} className={inputClass} rows={2} disabled={isLoading} />
        {errors.summary && <p className="text-xs text-destructive">{errors.summary.message}</p>}
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">{dictionary.learning.content}</label>
        <textarea {...register('content')} className={inputClass} rows={10} disabled={isLoading} />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
      </div>

      {/* Objectives */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">{dictionary.learning.objectives}</label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`objectives.${index}` as const)}
              className={inputClass}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{dictionary.learning.removeObjective}</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append('' as never)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {dictionary.learning.addObjective}
        </button>
      </div>

      {/* Published */}
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

      <div className="flex justify-end pt-4 border-t border-border/40">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {dictionary.learning.saveLesson}
        </button>
      </div>
    </form>
  )
}
