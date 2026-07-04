import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { type Locale } from '@/i18n/config'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface AdminAuthContext {
  user: User
  profile: Profile
}

/**
 * Server-side helper to protect admin routes.
 *
 * Requirements enforced:
 * 1. Must have an active Supabase session (User).
 * 2. Must have a corresponding profile in `public.profiles`.
 * 3. Profile role MUST be exactly `'admin'`.
 *
 * If unauthenticated, redirects to `/[locale]/login`.
 * If authenticated but NOT admin, redirects to `/[locale]/academy`.
 *
 * @param locale Current route locale for correct redirects.
 * @returns {Promise<AdminAuthContext>} The securely verified user and profile.
 */
export async function requireAdmin(locale: Locale): Promise<AdminAuthContext> {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Redirect unauthenticated guests to login
    // Note: In Next.js, `redirect` throws an error to halt execution immediately.
    redirect(`/${locale}/login?redirect=/${locale}/admin`)
  }

  // 2. Fetch the user's profile securely
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    // If somehow a profile doesn't exist, they can't be admin.
    redirect(`/${locale}/academy`)
  }

  // 3. Check for admin role explicitly
  if (profile.role !== 'admin') {
    redirect(`/${locale}/academy`)
  }

  return { user, profile }
}
