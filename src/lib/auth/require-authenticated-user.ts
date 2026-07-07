import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { type Locale } from '@/i18n/config'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface AuthenticatedUserContext {
  user: User
  profile: Profile
}

/**
 * Server-side helper to protect generic routes available to ALL authenticated users.
 * E.g., /settings
 *
 * Requirements enforced:
 * 1. Must have an active Supabase session.
 * 2. Must have a corresponding profile in `public.profiles`.
 *
 * If unauthenticated → redirect to `/[locale]/login`.
 * Does not restrict based on role. Both 'tester' and 'admin' are allowed.
 *
 * @param locale Current route locale for correct redirects.
 */
export async function requireAuthenticatedUser(locale: Locale): Promise<AuthenticatedUserContext> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    redirect(`/${locale}/login`)
  }

  return { user, profile }
}
