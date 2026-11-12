import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { i18n, type Locale } from '@/i18n/config'
import { safeLearningRedirect, studentHomePath, withLearningRedirect } from './learning-redirect'

export function normalizeAuthLocale(value: string | null | undefined): Locale {
  return i18n.locales.includes(value as Locale) ? (value as Locale) : i18n.defaultLocale
}

export async function getPostLoginRedirect(locale: Locale, destination?: string | null): Promise<string> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return `/${locale}/login`
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const intended = safeLearningRedirect(destination, locale)
  if (!profile) return withLearningRedirect(`/${locale}/login?error=profile_unavailable`, intended)
  return profile.role === 'admin' ? `/${locale}/admin` : (intended ?? studentHomePath(locale))
}
