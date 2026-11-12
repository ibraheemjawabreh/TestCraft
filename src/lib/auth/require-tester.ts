import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'
import { type Locale } from '@/i18n/config'
import { safeLearningRedirect, withLearningRedirect } from '@/lib/auth/learning-redirect'
import { getViewerProfile } from '@/lib/auth/viewer'

type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'username' | 'role' | 'avatar_url' | 'total_xp'>

export interface TesterAuthContext {
  user: User
  profile: Profile
}

/**
 * Server-side helper to protect tester (Academy) routes.
 *
 * Requirements enforced:
 * 1. Must have an active Supabase session.
 * 2. Must have a corresponding profile in `public.profiles`.
 * 3. Profile role must be `'tester'`.
 *
 * If unauthenticated → redirect to `/[locale]/login`.
 * If admin            → redirect to `/[locale]/admin`.
 *
 * @param locale Current route locale for correct redirects.
 */
// One verified identity/profile per React server render, never shared across users.
export const requireTester = cache(async (locale: Locale, destination?: string): Promise<TesterAuthContext> => {
  const viewer = await getViewerProfile()
  if (!viewer?.profile) {
    const login = `/${locale}/login` + (viewer ? '?error=profile_unavailable' : '')
    redirect(withLearningRedirect(login, safeLearningRedirect(destination, locale)))
  }

  if (viewer.profile.role === 'admin') {
    redirect(`/${locale}/admin`)
  }

  return { user: viewer.user, profile: viewer.profile }
})
