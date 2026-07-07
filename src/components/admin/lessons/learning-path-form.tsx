'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { learningPathSchema, type LearningPathFormValues } from '@/lib/validations/learning-path'
import { createLearningPath, updateLearningPath } from '@/lib/admin/learning-paths'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface LearningPathFormProps {
  dictionary: Dictionary
  locale: Locale
  initialData?: LearningPathFormValues & { id: string }
  onSuccess?: () => void
}

export function LearningPathForm({ dictionary, locale, initialData, onSuccess }: LearningPathFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isEditing = !!initialData

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LearningPathFormValues>({
    resolver: zodResolver(learningPathSchema),
    defaultValues: initialData ?? {
      title: '',
      description: '',
      slug: '',
      is_active: true,
      sort_order: 0,
    },
  })

  const isLoading = isPending

  const onSubmit = (data: LearningPathFormValues) => {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = isEditing
        ? await updateLearningPath(initialData.id, data)
        : await createLearningPath(data)

      if (result.error) {
        if (result.error === 'slug_taken') {
          setServerError('Slug is already taken.')
        } else {
          setServerError(result.error)
        }
      } else {
        setSuccessMessage(isEditing ? dictionary.learning.pathUpdated : dictionary.learning.pathCreated)
        router.refresh()
        onSuccess?.()
      }
    })
  }

  const inputClass =
    'block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.pathTitle}</label>
          <input type="text" {...register('title')} className={inputClass} disabled={isLoading} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.pathSlug}</label>
          <input type="text" {...register('slug')} className={inputClass} disabled={isLoading} placeholder="qa-foundations" />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">{dictionary.learning.pathDescription}</label>
        <textarea {...register('description')} className={inputClass} rows={3} disabled={isLoading} />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">{dictionary.learning.sortOrder}</label>
          <input type="number" {...register('sort_order', { valueAsNumber: true })} className={inputClass} disabled={isLoading} />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <input type="checkbox" id="path_is_active" {...register('is_active')} className="h-4 w-4 accent-primary" />
          <label htmlFor="path_is_active" className="text-sm font-medium text-foreground">{dictionary.learning.active}</label>
        </div>
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

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {dictionary.learning.savePath}
        </button>
      </div>
    </form>
  )
}
