'use client'
import type { z } from 'zod'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldCheck, Mail } from 'lucide-react'
import { updatePasswordSchema, type UpdatePasswordValues } from '@/lib/validations/settings'
import { updatePassword, sendPasswordResetEmail } from '@/lib/settings/security'
import type { Dictionary } from '@/i18n/types'

interface SecuritySettingsFormProps {
  email: string
  isGoogleUser: boolean
  dictionary: Dictionary
}

export function SecuritySettingsForm({ email, isGoogleUser, dictionary }: SecuritySettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof updatePasswordSchema>, unknown, UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
  })

  const isLoading = isSubmitting || isPending

  const onSubmit = (data: UpdatePasswordValues) => {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = await updatePassword(data)
      if (result.error) {
        setServerError(dictionary.settings.passwordUpdateFailed)
      } else {
        setSuccessMessage(dictionary.settings.passwordUpdated)
        reset()
      }
    })
  }

  const handleSendReset = () => {
    if (!email) return
    setServerError(null)
    setSuccessMessage(null)
    startTransition(async () => {
      const result = await sendPasswordResetEmail(email)
      if (result.error) {
        setServerError(dictionary.settings.somethingWentWrong)
      } else {
        setSuccessMessage(dictionary.settings.passwordResetSent)
      }
    })
  }

  const inputBaseClass =
    'block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors'

  return (
    <div className="space-y-8">
      {/* Email Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {dictionary.settings.email}
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm space-y-2">
          <input
            type="email"
            disabled
            value={email}
            className={inputBaseClass}
          />
          <p className="text-xs text-muted-foreground">{dictionary.settings.emailReadonly}</p>
        </div>
      </section>

      {/* Password Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {dictionary.settings.changePassword}
        </h2>

        {isGoogleUser ? (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-6 backdrop-blur-sm flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-blue-300 leading-relaxed">
              {dictionary.settings.googlePasswordMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {dictionary.settings.newPassword}
              </label>
              <input
                type="password"
                disabled={isLoading}
                className={inputBaseClass}
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-xs text-destructive" role="alert">
                  {dictionary.settings[errors.newPassword.message as keyof typeof dictionary.settings] || errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {dictionary.settings.confirmPassword}
              </label>
              <input
                type="password"
                disabled={isLoading}
                className={inputBaseClass}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive" role="alert">
                  {dictionary.settings[errors.confirmPassword.message as keyof typeof dictionary.settings] || errors.confirmPassword.message}
                </p>
              )}
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

            <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleSendReset}
                disabled={isLoading}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {dictionary.settings.sendPasswordReset}
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 w-full sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {dictionary.settings.updatePassword}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
