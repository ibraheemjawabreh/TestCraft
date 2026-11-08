'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { accountCopy } from '@/i18n/account-copy'
import { displayNameSchema } from '@/lib/validations/profile-name'
import { usernameSchema } from '@/lib/validations/settings'
import { updateProfile } from '@/lib/settings/profile'
import { AvatarUploader } from './avatar-uploader'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

function NameForm({ field, initialValue, dictionary, locale }: {
  field: 'displayName' | 'username'
  initialValue: string
  dictionary: Dictionary
  locale: Locale
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(initialValue)
  const [savedValue, setSavedValue] = useState(initialValue)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const names = accountCopy(locale)
  const display = field === 'displayName'
  const t = dictionary.settings
  const label = display ? names.displayName : t.username

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaved(false)
    const result = (display ? displayNameSchema : usernameSchema).safeParse(value)
    if (!result.success) {
      const key = result.error.issues[0].message as keyof typeof t
      setError(display ? names.displayNameInvalid : t[key] || t.profileUpdateFailed)
      return
    }

    startTransition(async () => {
      const resultFromServer = await updateProfile({ [field]: result.data })
      if (!resultFromServer.data) {
        setError(resultFromServer.error === 'username_taken' ? t.usernameTaken : t.profileUpdateFailed)
        return
      }
      setValue(resultFromServer.data.value)
      setSavedValue(resultFromServer.data.value)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} aria-label={label} className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-5 sm:p-6">
      <label htmlFor={field} className="block text-sm font-semibold text-foreground">{label}</label>
      <p id={field + '-hint'} className="text-sm text-muted-foreground">{display ? names.displayNameHint : names.usernameHint}</p>
      <input id={field} name={field} value={value} dir={display ? 'auto' : 'ltr'} disabled={pending}
        autoComplete={display ? 'name' : 'username'} aria-invalid={!!error}
        aria-describedby={field + '-hint' + (error ? ' ' + field + '-error' : '')}
        className="block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        onChange={event => { setValue(event.target.value); setError(''); setSaved(false) }} />
      {error && <p role="alert" id={field + '-error'} className="text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="text-sm text-green-700 dark:text-green-400">{t.profileUpdated}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending || value.trim() === savedValue}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {pending ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {display ? names.saveName : names.saveUsername}
        </button>
      </div>
    </form>
  )
}

export function ProfileSettingsForm({ profile, displayName, dictionary, locale }: {
  profile: Profile
  displayName: string
  dictionary: Dictionary
  locale: Locale
}) {
  const router = useRouter()
  const [avatar, setAvatar] = useState(profile.avatar_url)
  const [avatarUpdated, setAvatarUpdated] = useState(false)
  const t = dictionary.settings

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t.avatar}</h2>
        <div className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-6">
          <AvatarUploader currentAvatarUrl={avatar} dictionary={dictionary} onUploadSuccess={url => {
            setAvatar(url)
            setAvatarUpdated(true)
            router.refresh()
          }} />
          {avatarUpdated && <p role="status" className="text-sm text-green-700 dark:text-green-400">{t.avatarUploaded}</p>}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t.profileInformation}</h2>
        <NameForm field="displayName" initialValue={displayName} dictionary={dictionary} locale={locale} />
        <NameForm field="username" initialValue={profile.username} dictionary={dictionary} locale={locale} />
        <dl className="grid gap-4 rounded-xl border border-border/50 bg-card/40 p-5 sm:grid-cols-3">
          <div><dt className="text-sm text-muted-foreground">{t.role}</dt><dd className="mt-1 font-medium">{profile.role}</dd></div>
          <div><dt className="text-sm text-muted-foreground">{t.totalXp}</dt><dd className="mt-1 font-medium">{profile.total_xp ?? 0}</dd></div>
          <div><dt className="text-sm text-muted-foreground">{t.currentLevel}</dt><dd className="mt-1 font-medium">{profile.current_level ?? 1}</dd></div>
        </dl>
      </section>
    </div>
  )
}
