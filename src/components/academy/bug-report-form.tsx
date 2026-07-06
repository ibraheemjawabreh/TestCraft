'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Send } from 'lucide-react'
import { bugReportSchema, type BugReportFormValues } from '@/lib/validations/bug-report'
import type { Dictionary } from '@/i18n/types'
import type { Database } from '@/types/database.types'

type SeverityLevel = Database['public']['Enums']['severity_level']

interface BugReportFormProps {
  challengeId: string
  dictionary: Dictionary
  onSuccess?: () => void
}

const SEVERITIES: SeverityLevel[] = ['Low', 'Medium', 'High', 'Critical']

const SEVERITY_STYLE: Record<SeverityLevel, string> = {
  Low: 'border-blue-500/40 text-blue-400 peer-checked:bg-blue-500/10 peer-checked:border-blue-400',
  Medium: 'border-amber-500/40 text-amber-400 peer-checked:bg-amber-500/10 peer-checked:border-amber-400',
  High: 'border-orange-500/40 text-orange-400 peer-checked:bg-orange-500/10 peer-checked:border-orange-400',
  Critical: 'border-red-500/40 text-red-400 peer-checked:bg-red-500/10 peer-checked:border-red-400',
}

function resolveValidationMessage(key: string, dictionary: Dictionary): string {
  const map: Record<string, string> = {
    reportTitleMin: dictionary.validation.reportTitleMin,
    reportTitleMax: dictionary.validation.reportTitleMax,
    stepsMin: dictionary.validation.stepsMin,
    stepsMax: dictionary.validation.stepsMax,
    resultMin: dictionary.validation.resultMin,
    resultMax: dictionary.validation.resultMax,
    severityRequired: dictionary.validation.severityRequired,
    required: dictionary.validation.required,
  }
  return map[key] ?? key
}

export function BugReportForm({ challengeId, dictionary, onSuccess }: BugReportFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BugReportFormValues>({
    resolver: zodResolver(bugReportSchema),
  })

  const selectedSeverity = watch('reported_severity')
  const isLoading = isSubmitting || isPending

  const onSubmit = (data: BugReportFormValues) => {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/academy/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, challengeId }),
        })

        const json = (await res.json()) as { error?: string }

        if (!res.ok || json.error) {
          setServerError(dictionary.academy.reportSubmitFailed)
          return
        }

        setSuccessMessage(dictionary.academy.reportSubmitted)
        reset()
        onSuccess?.()
      } catch {
        setServerError(dictionary.academy.reportSubmitFailed)
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
    >
      {/* Title */}
      <div className="space-y-1.5">
        <label
          htmlFor="report-title"
          className="block text-sm font-medium text-foreground"
        >
          {dictionary.academy.reportTitle}
          <span className="text-destructive ms-1" aria-hidden="true">*</span>
        </label>
        <input
          id="report-title"
          type="text"
          autoComplete="off"
          disabled={isLoading}
          className="block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors"
          placeholder="e.g. Login button does not respond on mobile"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-xs text-destructive" role="alert">
            {resolveValidationMessage(errors.title.message ?? '', dictionary)}
          </p>
        )}
      </div>

      {/* Steps to Reproduce */}
      <div className="space-y-1.5">
        <label
          htmlFor="report-steps"
          className="block text-sm font-medium text-foreground"
        >
          {dictionary.academy.stepsToReproduce}
          <span className="text-destructive ms-1" aria-hidden="true">*</span>
        </label>
        <textarea
          id="report-steps"
          rows={5}
          disabled={isLoading}
          className="block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors resize-none"
          placeholder="1. Open the app&#10;2. Navigate to...&#10;3. Click..."
          {...register('steps_to_reproduce')}
        />
        {errors.steps_to_reproduce && (
          <p className="text-xs text-destructive" role="alert">
            {resolveValidationMessage(errors.steps_to_reproduce.message ?? '', dictionary)}
          </p>
        )}
      </div>

      {/* Expected Result */}
      <div className="space-y-1.5">
        <label
          htmlFor="report-expected"
          className="block text-sm font-medium text-foreground"
        >
          {dictionary.academy.expectedResult}
          <span className="text-destructive ms-1" aria-hidden="true">*</span>
        </label>
        <textarea
          id="report-expected"
          rows={3}
          disabled={isLoading}
          className="block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors resize-none"
          placeholder="The button should submit the form and show a success message."
          {...register('expected_result')}
        />
        {errors.expected_result && (
          <p className="text-xs text-destructive" role="alert">
            {resolveValidationMessage(errors.expected_result.message ?? '', dictionary)}
          </p>
        )}
      </div>

      {/* Actual Result */}
      <div className="space-y-1.5">
        <label
          htmlFor="report-actual"
          className="block text-sm font-medium text-foreground"
        >
          {dictionary.academy.actualResult}
          <span className="text-destructive ms-1" aria-hidden="true">*</span>
        </label>
        <textarea
          id="report-actual"
          rows={3}
          disabled={isLoading}
          className="block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors resize-none"
          placeholder="Nothing happens when the button is clicked."
          {...register('actual_result')}
        />
        {errors.actual_result && (
          <p className="text-xs text-destructive" role="alert">
            {resolveValidationMessage(errors.actual_result.message ?? '', dictionary)}
          </p>
        )}
      </div>

      {/* Severity */}
      <div className="space-y-2">
        <span className="block text-sm font-medium text-foreground">
          {dictionary.academy.reportedSeverity}
          <span className="text-destructive ms-1" aria-hidden="true">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SEVERITIES.map((sev) => (
            <label
              key={sev}
              className={`relative flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-all ${SEVERITY_STYLE[sev]} ${
                selectedSeverity === sev ? 'ring-1 ring-current' : 'opacity-70 hover:opacity-100'
              } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                className="peer sr-only"
                value={sev}
                disabled={isLoading}
                checked={selectedSeverity === sev}
                onChange={() => setValue('reported_severity', sev, { shouldValidate: true })}
              />
              {dictionary.academy[sev.toLowerCase() as 'low' | 'medium' | 'high' | 'critical']}
            </label>
          ))}
        </div>
        {errors.reported_severity && (
          <p className="text-xs text-destructive" role="alert">
            {resolveValidationMessage(errors.reported_severity.message ?? '', dictionary)}
          </p>
        )}
      </div>

      {/* Server messages */}
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
        >
          {successMessage}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {dictionary.academy.submitting}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            {dictionary.academy.submitReport}
          </>
        )}
      </button>
    </form>
  )
}
