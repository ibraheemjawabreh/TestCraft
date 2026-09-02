'use client'

import { AlertTriangle, CheckCircle2, XCircle, Loader2, Save, Globe2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LessonStatusBadge } from './lesson-status-badge'

// ── Educational structure sections to check ────────────────────────────────
const EXPECTED_SECTIONS = [
  'Summary',
  'Learning Objectives',
  'Why This Lesson Matters',
  'Main Explanation',
  'Deep Explanation',
  'Real-world Example',
  'Common Beginner Mistakes',
  'Mini Practice',
  'Key Takeaways',
  'Connection to Next Lesson',
]

/** Check which expected sections are missing from a Markdown body */
function getMissingSections(markdown: string): string[] {
  return EXPECTED_SECTIONS.filter((section) => {
    // Match case-insensitively, allowing ## or ###
    const pattern = new RegExp(`##+ .*${section}`, 'i')
    return !pattern.test(markdown)
  })
}

export interface PublishValidationResult {
  canPublish: boolean
  blockingErrors: string[]
  structureWarnings: string[]
}

export interface LessonPublishPanelProps {
  isPublished: boolean
  moduleId: string
  titleEn: string
  titleAr: string
  contentEn: string
  contentAr: string
  isSaving: boolean
  isPublishing: boolean
  lastSavedAt: Date | null
  hasUnsavedChanges: boolean
  onSaveDraft: () => void
  onPublish: () => void
  onUnpublish: () => void
}

/** Validate lesson before publishing */
export function validateForPublish(
  moduleId: string,
  titleEn: string,
  titleAr: string,
  contentEn: string,
  contentAr: string,
): PublishValidationResult {
  const blockingErrors: string[] = []
  const structureWarnings: string[] = []

  if (!moduleId) blockingErrors.push('A module must be selected.')
  if (!titleEn.trim()) blockingErrors.push('English title is missing.')
  if (!titleAr.trim()) blockingErrors.push('Arabic title is missing.')
  if (!contentEn.trim() || contentEn.trim().length < 30)
    blockingErrors.push('English content is missing or too short (minimum 30 characters).')
  if (!contentAr.trim() || contentAr.trim().length < 30)
    blockingErrors.push('Arabic content is missing or too short (minimum 30 characters).')

  // Structure warnings (non-blocking) — only check if content is present
  if (contentEn.trim().length >= 30) {
    const missingSectionsEn = getMissingSections(contentEn)
    missingSectionsEn.forEach((s) => {
      structureWarnings.push(`English content is missing the "${s}" section.`)
    })
  }

  if (contentAr.trim().length >= 30) {
    const missingSectionsAr = getMissingSections(contentAr)
    missingSectionsAr.forEach((s) => {
      structureWarnings.push(`Arabic content is missing the "${s}" section.`)
    })
  }

  return {
    canPublish: blockingErrors.length === 0,
    blockingErrors,
    structureWarnings,
  }
}

/** Check if a language version is "complete" (title + content present) */
function isLanguageComplete(title: string, content: string): boolean {
  return title.trim().length >= 3 && content.trim().length >= 30
}

export function LessonPublishPanel({
  isPublished,
  moduleId,
  titleEn,
  titleAr,
  contentEn,
  contentAr,
  isSaving,
  isPublishing,
  lastSavedAt,
  hasUnsavedChanges,
  onSaveDraft,
  onPublish,
  onUnpublish,
}: LessonPublishPanelProps) {
  const validation = validateForPublish(moduleId, titleEn, titleAr, contentEn, contentAr)
  const arComplete = isLanguageComplete(titleAr, contentAr)
  const enComplete = isLanguageComplete(titleEn, contentEn)

  const isLoading = isSaving || isPublishing

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-5">
      {/* Header row: Status + Autosave indicator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
          <LessonStatusBadge isPublished={isPublished} />
        </div>

        {/* Save indicator */}
        <div className="text-xs text-muted-foreground">
          {isSaving && (
            <span className="flex items-center gap-1 text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {!isSaving && hasUnsavedChanges && (
            <span className="text-amber-400">● Unsaved changes</span>
          )}
          {!isSaving && !hasUnsavedChanges && lastSavedAt && (
            <span className="text-green-400">
              ✓ Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Language completion indicators */}
      <div className="flex gap-3 flex-wrap">
        <CompletionBadge label="English" complete={enComplete} />
        <CompletionBadge label="العربية" complete={arComplete} />
      </div>

      {/* Blocking errors (only show when user tries to publish) */}
      {validation.blockingErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-2">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            Cannot publish — fix these first:
          </p>
          <ul className="space-y-1">
            {validation.blockingErrors.map((err) => (
              <li key={err} className="text-xs text-destructive/90">
                — {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structure warnings (non-blocking) */}
      {validation.structureWarnings.length > 0 && validation.canPublish && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Structure warnings (non-blocking):
          </p>
          <ul className="space-y-1">
            {validation.structureWarnings.map((w) => (
              <li key={w} className="text-xs text-amber-400/90">
                — {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5 pt-1">
        {/* Save Draft */}
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isLoading}
          className={cn(
            'flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
            'border border-border/60 bg-secondary/60 text-foreground',
            'hover:bg-secondary hover:border-border disabled:opacity-50',
          )}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>

        {/* Publish / Unpublish */}
        {isPublished ? (
          <button
            type="button"
            onClick={onUnpublish}
            disabled={isLoading}
            className={cn(
              'flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
              'border border-amber-500/40 bg-amber-500/10 text-amber-400',
              'hover:bg-amber-500/20 disabled:opacity-50',
            )}
          >
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={isLoading}
            title={!validation.canPublish ? 'Fix blocking errors to publish' : ''}
            className={cn(
              'flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
              'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
            Publish Lesson
          </button>
        )}
      </div>
    </div>
  )
}

function CompletionBadge({ label, complete }: { label: string; complete: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        complete
          ? 'border-green-500/30 bg-green-500/10 text-green-400'
          : 'border-border/40 bg-secondary/40 text-muted-foreground',
      )}
    >
      {complete ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      ) : (
        <span className="h-3 w-3 rounded-full border border-current opacity-40" />
      )}
      {label}
      {complete ? ' ✓' : ''}
    </span>
  )
}
