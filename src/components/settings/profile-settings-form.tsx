'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { updateProfileSchema, type UpdateProfileValues } from '@/lib/validations/settings'
import { updateProfile } from '@/lib/settings/profile'
import { AvatarUploader } from './avatar-uploader'
import type { Dictionary } from '@/i18n/types'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ProfileSettingsFormProps {
  profile: Profile
  dictionary: Dictionary
}

export function ProfileSettingsForm({ profile, dictionary }: ProfileSettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(profile.avatar_url)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: profile.username,
    },
  })

  const isLoading = isSubmitting || isPending

  const onSubmit = (data: UpdateProfileValues) => {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = await updateProfile(data)
      if (result.error) {
        if (result.error === 'username_taken') {
          setServerError(dictionary.settings.usernameTaken)
        } else {
          setServerError(dictionary.settings.profileUpdateFailed)
        }
      } else {
        setSuccessMessage(dictionary.settings.profileUpdated)
        router.refresh()
      }
    })
  }

  const handleAvatarSuccess = (url: string) => {
    setCurrentAvatar(url)
    setSuccessMessage(dictionary.settings.avatarUploaded)
    router.refresh()
  }

  const inputBaseClass =
    'block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors'

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {dictionary.settings.avatar}
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
          <AvatarUploader
            currentAvatarUrl={currentAvatar}
            dictionary={dictionary}
            onUploadSuccess={handleAvatarSuccess}
          />
        </div>
      </section>

      {/* Profile Form */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {dictionary.settings.profileInformation}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium text-foreground">
              {dictionary.settings.username}
            </label>
            <input
              id="username"
              type="text"
              disabled={isLoading}
              className={inputBaseClass}
              {...register('username')}
            />
            {errors.username && (
              <p className="text-xs text-destructive" role="alert">
                {/* Fallback to raw string if i18n translation mapping isn't fully set up for Zod */}
                {dictionary.settings[errors.username.message as keyof typeof dictionary.settings] || errors.username.message}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {dictionary.settings.role}
              </label>
              <input
                type="text"
                disabled
                value={profile.role ?? ''}
                className={inputBaseClass}
              />
              <p className="text-xs text-muted-foreground">{dictionary.settings.readOnlyRole}</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {dictionary.settings.totalXp}
              </label>
              <input
                type="text"
                disabled
                value={profile.total_xp ?? 0}
                className={inputBaseClass}
              />
              <p className="text-xs text-muted-foreground">{dictionary.settings.readOnlyXp}</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {dictionary.settings.currentLevel}
              </label>
              <input
                type="text"
                disabled
                value={profile.current_level ?? 1}
                className={inputBaseClass}
              />
              <p className="text-xs text-muted-foreground">{dictionary.settings.readOnlyLevel}</p>
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

          <div className="pt-4 border-t border-border/40 flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {dictionary.settings.saveProfile}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
