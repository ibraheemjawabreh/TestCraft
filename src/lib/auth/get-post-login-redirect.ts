import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { i18n, type Locale } from '@/i18n/config'

export function normalizeAuthLocale(value: string | null | undefined): Locale {
  return i18n.locales.includes(value as Locale) ? (value as Locale) : i18n.defaultLocale
}

export async function getPostLoginRedirect(locale: Locale): Promise<string> {
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

  return profile?.role === 'admin' ? `/${locale}/admin` : `/${locale}/academy`
}
