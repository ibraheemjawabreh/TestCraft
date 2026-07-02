import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'

// Re-export Supabase's error type so consumers don't need to import from the
// Supabase package directly — insulates the rest of the codebase from vendor types.
export type { SupabaseAuthError }

/** Shape of transient auth UI state used in components. */
export interface AuthState {
  isLoading: boolean
  error: string | null
}
