import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for use in **server** contexts:
 * Server Components, Route Handlers, Server Actions, and Middleware.
 *
 * The client reads/writes the Supabase session from HTTP cookies so the
 * server always has the same view of the auth state as the browser.
 *
 * ⚠️  Never import or use this in Client Components — use `client.ts` instead.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }

  // `cookies()` from next/headers must be awaited in Next.js 14+
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // `setAll` was called from a Server Component where cookies cannot
          // be mutated. This is safe to ignore if middleware is refreshing
          // the session on every request.
        }
      },
    },
  })
}
