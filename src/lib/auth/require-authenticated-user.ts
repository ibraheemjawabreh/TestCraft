import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { getVerifiedViewer } from '@/lib/auth/viewer'
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
  const viewer = await getVerifiedViewer()
  if (!viewer) {
    redirect(`/${locale}/login`)
  }

  const { db, user } = viewer
  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    redirect(`/${locale}/login?error=profile_unavailable`)
  }

  return { user, profile }
}
