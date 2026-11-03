'use client'
import type { z } from 'zod'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { moduleSchema, type ModuleFormValues } from '@/lib/validations/module'
import { createAdminModule, updateAdminModule } from '@/lib/admin/modules'
import type { LearningPathWithLessonCount } from '@/lib/admin/learning-paths'
import type { Locale } from '@/i18n/config'

interface ModuleFormProps {
  paths: LearningPathWithLessonCount[]
  locale: Locale
  initialData?: ModuleFormValues & { id: string }
  onSuccess?: () => void
  defaultPathId?: string
}

export function ModuleForm({ paths, locale, initialData, onSuccess, defaultPathId }: ModuleFormProps) {
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
    formState: { errors },
  } = useForm<z.input<typeof moduleSchema>, unknown, ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: initialData ?? {
      learning_path_id: defaultPathId ?? paths[0]?.id ?? '',
      title_en: '',
      title_ar: '',
      slug: '',
      description_en: '',
      description_ar: '',
      sort_order: 0,
      is_published: false,
    },
  })

  const onSubmit = (data: ModuleFormValues) => {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = initialData
        ? await updateAdminModule(initialData.id, data)
        : await createAdminModule(data)

      if (result.error) {
        setServerError(result.error === 'slug_taken' ? 'Slug is already taken.' : result.error)
        return
      }

      setSuccessMessage(isEditing ? 'Module updated successfully.' : 'Module created successfully.')
      if (onSuccess) {
        onSuccess()
      } else if (!isEditing && result.data) {
        router.push(`/${locale}/admin/modules`)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Learning Path</label>
          <select {...register('learning_path_id')} className={inputClass} disabled={isPending}>
            {paths.map((path) => (
              <option key={path.id} value={path.id}>{locale === 'ar' ? path.title_ar || path.title_en : path.title_en || path.title_ar}</option>
            ))}
          </select>
          {errors.learning_path_id && <p className="text-xs text-destructive">{errors.learning_path_id.message}</p>}
        </div>



        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Title (English)</label>
          <input type="text" {...register('title_en')} className={inputClass} disabled={isPending} />
          {errors.title_en && <p className="text-xs text-destructive">{errors.title_en.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Title (Arabic)</label>
          <input type="text" {...register('title_ar')} className={inputClass} disabled={isPending} dir="rtl" />
          {errors.title_ar && <p className="text-xs text-destructive">{errors.title_ar.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Module Slug</label>
          <input type="text" {...register('slug')} className={inputClass} disabled={isPending} placeholder="e.g. module-1" />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Description (English)</label>
          <textarea {...register('description_en')} className={inputClass} rows={3} disabled={isPending} />
          {errors.description_en && <p className="text-xs text-destructive">{errors.description_en.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Description (Arabic)</label>
          <textarea {...register('description_ar')} className={inputClass} rows={3} disabled={isPending} dir="rtl" />
          {errors.description_ar && <p className="text-xs text-destructive">{errors.description_ar.message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="is_published" {...register('is_published')} className="h-4 w-4 accent-primary" />
        <label htmlFor="is_published" className="text-sm font-medium text-foreground">Published</label>
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
          {isEditing ? 'Update Module' : 'Create Module'}
        </button>
      </div>
    </form>
  )
}
