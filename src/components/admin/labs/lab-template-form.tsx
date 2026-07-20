'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

import { labTemplateSchema, type LabTemplateFormValues } from '@/lib/validations/lab-template'
import type { Database } from '@/types/database.types'
import type { Locale } from '@/i18n/config'

type LabTemplate = Database['public']['Tables']['lab_templates']['Row']

interface LabTemplateFormProps {
  initialData?: LabTemplate
  locale: Locale
}

export function LabTemplateForm({ initialData, locale }: LabTemplateFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  
  const isEditing = !!initialData

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LabTemplateFormValues>({
    resolver: zodResolver(labTemplateSchema),
    defaultValues: {
      name_en: initialData?.name_en ?? '',
      name_ar: initialData?.name_ar ?? '',
      description_en: initialData?.description_en ?? '',
      description_ar: initialData?.description_ar ?? '',
      slug: initialData?.slug ?? '',
      lab_type: initialData?.lab_type ?? 'react',
      is_active: initialData?.is_active ?? false,
    },
  })

  const isActive = watch('is_active')

  const onSubmit = async (data: LabTemplateFormValues) => {
    setServerError(null)
    
    try {
      const url = isEditing
        ? `/${locale}/admin/labs/api/update`
        : `/${locale}/admin/labs/api/create`
        
      const payload = isEditing ? { ...data, id: initialData.id } : data

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setServerError(json.error || 'Failed to save lab template')
        return
      }

      router.push(`/${locale}/admin/labs`)
      router.refresh()
    } catch (err) {
      setServerError('An unexpected error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-fade-in-up max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/admin/labs`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              {isEditing ? 'Edit Lab Template' : 'New Lab Template'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure the interactive environment for challenges.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEditing ? 'Save Changes' : 'Create Lab'}
        </button>
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-500/15 p-4 text-sm text-red-500 border border-red-500/30">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-6 rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <h2 className="font-heading text-lg font-semibold text-foreground border-b border-border/50 pb-2">Basic Info</h2>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Name (English) <span className="text-red-500">*</span></label>
            <input
              {...register('name_en')}
              className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.name_en && <p className="text-xs text-red-500">{errors.name_en.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Name (Arabic)</label>
            <input
              {...register('name_ar')}
              className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-right"
              dir="rtl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Slug (Unique Identifier) <span className="text-red-500">*</span></label>
            <input
              {...register('slug')}
              className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. login-form-bug-hunt"
            />
            {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-6 rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <h2 className="font-heading text-lg font-semibold text-foreground border-b border-border/50 pb-2">Configuration</h2>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Lab Type <span className="text-red-500">*</span></label>
            <select
              {...register('lab_type')}
              className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="react">React Component</option>
              <option value="iframe">External Iframe</option>
              <option value="api">API Endpoint</option>
            </select>
            {errors.lab_type && <p className="text-xs text-red-500">{errors.lab_type.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description (English)</label>
            <textarea
              {...register('description_en')}
              rows={3}
              className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description (Arabic)</label>
            <textarea
              {...register('description_ar')}
              rows={3}
              className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none text-right"
              dir="rtl"
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl flex items-center justify-between">
        <div>
          <h3 className="font-medium text-foreground">Active Status</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Determine if this lab is available to be selected in challenges.</p>
        </div>
        <button
          type="button"
          onClick={() => setValue('is_active', !isActive, { shouldDirty: true })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
            isActive ? 'bg-primary' : 'bg-secondary'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </form>
  )
}
