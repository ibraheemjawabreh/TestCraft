'use client'

import { useEffect, useMemo } from 'react'
import type { LearningPathWithLessonCount } from '@/lib/admin/learning-paths'

export interface LessonMeta {
  learning_path_id: string
  module_id: string
  title_en: string
  title_ar: string
  slug: string
  sort_order: number
  estimated_minutes: number
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  is_published: boolean
}

interface Module {
  id: string
  title_en: string
  title_ar: string | null
  learning_path_id: string
}

interface LessonMetadataFormProps {
  meta: LessonMeta
  onChange: (updates: Partial<LessonMeta>) => void
  paths: LearningPathWithLessonCount[]
  modules: Module[]
  disabled?: boolean
}

/** Generate a URL-safe slug from a title */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const inputClass =
  'block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors'

const labelClass = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'

export function LessonMetadataForm({
  meta,
  onChange,
  paths,
  modules,
  disabled = false,
}: LessonMetadataFormProps) {
  // Filter modules by selected learning path
  const availableModules = useMemo(
    () => modules.filter((m) => m.learning_path_id === meta.learning_path_id),
    [modules, meta.learning_path_id],
  )

  // When path changes, reset module if the current module doesn't belong to new path
  useEffect(() => {
    const moduleStillValid = availableModules.some((m) => m.id === meta.module_id)
    if (!moduleStillValid && meta.module_id) {
      onChange({ module_id: '' })
    }
  }, [meta.learning_path_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleEnChange = (value: string) => {
    // Auto-generate slug from English title when slug is empty
    const updates: Partial<LessonMeta> = { title_en: value }
    if (!meta.slug || meta.slug === slugify(meta.title_en)) {
      updates.slug = slugify(value)
    }
    onChange(updates)
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-5">
      <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
        Lesson Information
      </h2>

      {/* Row 1: Path + Module */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Learning Path *</label>
          <select
            value={meta.learning_path_id}
            onChange={(e) => onChange({ learning_path_id: e.target.value })}
            className={inputClass}
            disabled={disabled}
          >
            <option value="">— Select a path —</option>
            {paths.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title_en || p.title_ar || 'Untitled Path'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Module *</label>
          <select
            value={meta.module_id}
            onChange={(e) => onChange({ module_id: e.target.value })}
            className={inputClass}
            disabled={disabled || !meta.learning_path_id}
          >
            <option value="">— Select a module —</option>
            {availableModules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title_en || m.title_ar || 'Untitled Module'}
              </option>
            ))}
          </select>
          {!meta.learning_path_id && (
            <p className="mt-1 text-xs text-muted-foreground">Select a learning path first.</p>
          )}
        </div>
      </div>

      {/* Row 2: English Title + Arabic Title */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>English Title *</label>
          <input
            type="text"
            value={meta.title_en}
            onChange={(e) => handleTitleEnChange(e.target.value)}
            placeholder="e.g. Introduction to QA Testing"
            className={inputClass}
            disabled={disabled}
            dir="ltr"
          />
        </div>

        <div>
          <label className={labelClass}>Arabic Title *</label>
          <input
            type="text"
            value={meta.title_ar}
            onChange={(e) => onChange({ title_ar: e.target.value })}
            placeholder="e.g. مقدمة في اختبار الجودة"
            className={inputClass}
            disabled={disabled}
            dir="rtl"
          />
        </div>
      </div>

      {/* Row 3: Slug + Sort Order */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Slug (URL)</label>
          <input
            type="text"
            value={meta.slug}
            onChange={(e) => onChange({ slug: slugify(e.target.value) })}
            placeholder="e.g. intro-to-qa-testing"
            className={`${inputClass} font-mono text-xs`}
            disabled={disabled}
            dir="ltr"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Auto-generated from English title. Must be unique within the module.
          </p>
        </div>

        <div>
          <label className={labelClass}>Sort Order</label>
          <input
            type="number"
            min={0}
            max={999}
            value={meta.sort_order}
            onChange={(e) => onChange({ sort_order: parseInt(e.target.value, 10) || 0 })}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Row 4: Difficulty + Estimated Minutes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Difficulty</label>
          <select
            value={meta.difficulty}
            onChange={(e) => onChange({ difficulty: e.target.value as LessonMeta['difficulty'] })}
            className={inputClass}
            disabled={disabled}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Estimated Minutes</label>
          <input
            type="number"
            min={1}
            max={240}
            value={meta.estimated_minutes}
            onChange={(e) => onChange({ estimated_minutes: parseInt(e.target.value, 10) || 10 })}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
