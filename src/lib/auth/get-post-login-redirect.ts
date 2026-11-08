import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { i18n, type Locale } from '@/i18n/config'
import { safeLearningRedirect } from './learning-redirect'

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

  return profile?.role === 'admin' ? `/${locale}/admin` : (safeLearningRedirect(destination, locale) ?? `/${locale}/academy`)
}
