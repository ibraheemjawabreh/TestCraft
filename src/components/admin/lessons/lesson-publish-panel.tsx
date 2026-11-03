'use client'
import { factoryEn, factoryAr } from '@/i18n/factory'

import { AlertTriangle, CheckCircle2, XCircle, Loader2, Save, Globe2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LessonStatusBadge } from './lesson-status-badge'

export interface PublishValidationResult {
  canPublish: boolean
  blockingErrors: string[]
  structureWarnings: string[]
}

export interface LessonPublishPanelProps {
  locale?: 'en' | 'ar'
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
export function validateForPublish(moduleId:string,titleEn:string,titleAr:string,contentEn:string,contentAr:string,locale:'en'|'ar'='en'):PublishValidationResult {
 const t=(locale==='ar'?factoryAr:factoryEn).publishPanel
 const blockingErrors:string[]=[],structureWarnings:string[]=[]
 if(!moduleId)blockingErrors.push(t.moduleMissing)
 if(!titleEn.trim())blockingErrors.push(t.enTitle)
 if(!titleAr.trim())blockingErrors.push(t.arTitle)
 if(contentEn.trim().length<2200)blockingErrors.push(t.enContent)
 if(contentAr.trim().length<1800)blockingErrors.push(t.arContent)
 if((contentEn.match(/^## /gm)||[]).length<5||(contentAr.match(/^## /gm)||[]).length<5)structureWarnings.push(t.structure)
 return{canPublish:!blockingErrors.length,blockingErrors,structureWarnings}
}

/** Check if a language version is "complete" (title + content present) */
function isLanguageComplete(title: string, content: string, minimum=1800): boolean {
  return title.trim().length >= 3 && content.trim().length >= minimum
}

export function LessonPublishPanel({
  locale = 'en',
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
  const labels = (locale === 'ar' ? factoryAr : factoryEn).publishPanel
  const validation = validateForPublish(moduleId, titleEn, titleAr, contentEn, contentAr, locale)
  const arComplete = isLanguageComplete(titleAr, contentAr)
  const enComplete = isLanguageComplete(titleEn, contentEn,2200)

  const isLoading = isSaving || isPublishing

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-5">
      {/* Header row: Status + Autosave indicator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{labels.status}</span>
          <LessonStatusBadge locale={locale} isPublished={isPublished} />
        </div>

        {/* Save indicator */}
        <div className="text-xs text-muted-foreground">
          {isSaving && (
            <span className="flex items-center gap-1 text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" /> {labels.saving}</span>
          )}
          {!isSaving && hasUnsavedChanges && (
            <span className="text-amber-400">{labels.unsaved}</span>
          )}
          {!isSaving && !hasUnsavedChanges && lastSavedAt && (
            <span className="text-green-400">
              {labels.saved}{lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            {labels.blocked}</p>
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
            {labels.warnings}</p>
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
          {labels.save}</button>

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
            {labels.unpublish}</button>
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
            {labels.publish}</button>
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
