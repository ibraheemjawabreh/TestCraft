import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { type Locale } from '@/i18n/config'

type Profile = Database['public']['Tables']['profiles']['Row']

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
export async function requireTester(locale: Locale): Promise<TesterAuthContext> {
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

  if (profile.role === 'admin') {
    redirect(`/${locale}/admin`)
  }

  return { user, profile }
}
