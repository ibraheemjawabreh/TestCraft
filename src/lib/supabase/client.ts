import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for use in **browser** (Client Components).
 *
 * @param persistSession - When false the session lives only for the current
 *   browser tab (implemented via sessionStorage). Defaults to true.
 *
 * The URL and key are read from NEXT_PUBLIC_* env vars which are safe to
 * expose in the browser — they are only the *anon* (public) key, not service
 * role keys which must never leave the server.
 */
export function createClient(persistSession = true) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Add them to your .env.local file.',
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession,
      // When not persisting, fall back to sessionStorage so the auth token
      // is automatically cleared when the browser tab is closed.
      ...(persistSession
        ? {}
        : {
            storage: {
              getItem: (key: string) => sessionStorage.getItem(key),
              setItem: (key: string, value: string) =>
                sessionStorage.setItem(key, value),
              removeItem: (key: string) => sessionStorage.removeItem(key),
            },
          }),
    },
  })
}
