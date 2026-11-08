import type { User } from '@supabase/supabase-js'
import type { Locale } from '@/i18n/config'
import { accountCopy } from '@/i18n/account-copy'
import { displayNameSchema } from '@/lib/validations/profile-name'

type IdentityUser = Pick<User, 'id' | 'email' | 'user_metadata'>
type IdentityProfile = { username: string; avatar_url: string | null }

export function isGeneratedUsername(username: string, userId: string) {
  return /^[a-z0-9_]{1,32}_[a-f0-9]{6}$/i.test(username) && username.endsWith('_' + userId.slice(0, 6))
}

export function getDisplayName(user: IdentityUser, username: string | undefined, locale: Locale) {
  const metadata = user.user_metadata
  const emailPrefix = user.email?.split('@')[0]?.toLowerCase()
  const preferred = displayNameSchema.safeParse(metadata.display_name)
  if (preferred.success) return preferred.data

  const candidates = [
    { value: username, provider: false },
    { value: metadata.username, provider: false },
    { value: metadata.full_name, provider: true },
    { value: metadata.name, provider: true },
  ]
  for (const { value, provider } of candidates) {
    const candidate = displayNameSchema.safeParse(value)
    if (candidate.success && !candidate.data.includes('@') &&
        !(provider && candidate.data.toLowerCase() === emailPrefix) &&
        !isGeneratedUsername(candidate.data, user.id) && !/^learner_[a-f0-9]{24}$/.test(candidate.data)) {
      return candidate.data
    }
  }
  return accountCopy(locale).learner
}

function avatarSource(value: unknown) {
  if (typeof value !== 'string' || !value || /[\s\\]/.test(value)) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    return new URL(value).protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

export function accountIdentity(user: IdentityUser, profile: IdentityProfile | null, locale: Locale) {
  return {
    name: getDisplayName(user, profile?.username, locale),
    email: user.email ?? '',
    avatar: avatarSource(profile?.avatar_url) ?? avatarSource(user.user_metadata.avatar_url)
      ?? avatarSource(user.user_metadata.picture),
  }
}

export type AccountIdentity = ReturnType<typeof accountIdentity>
