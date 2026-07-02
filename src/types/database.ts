/**
 * Database TypeScript types for the TestCraft Supabase schema.
 *
 * These types mirror the public.profiles table and are used across the app
 * to ensure consistent, type-safe data access. Update whenever the schema changes.
 */

// ─── Enums / Literals ────────────────────────────────────────────────────────

/** Possible values for profiles.role — enforced by SQL constraint. */
export type UserRole = 'student' | 'company' | 'admin'

// ─── Table Types ─────────────────────────────────────────────────────────────

/**
 * A full row from public.profiles (as returned by SELECT *).
 * All timestamps are ISO 8601 strings (Supabase returns strings over the API).
 */
export interface Profile {
  /** UUID — matches auth.users(id). Immutable. */
  id: string
  /** Display name (2–80 chars, trimmed). */
  full_name: string
  /** Email address — nullable for privacy-first OAuth flows. */
  email: string | null
  /** URL to the user's avatar image. */
  avatar_url: string | null
  /** Role — always 'student' at creation; only admins can elevate. */
  role: UserRole
  /** Current level. Starts at 1. Only increased by the system. */
  level: number
  /** Experience points. Only updated by the system. */
  xp: number
  /** Whether the user has completed the onboarding flow. */
  onboarding_completed: boolean
  /** ISO 8601 — set by the database on insert. Immutable. */
  created_at: string
  /** ISO 8601 — auto-updated by trigger on every update. */
  updated_at: string
  /** ISO 8601 — updated by the app on login. Nullable. */
  last_login_at: string | null
}

/**
 * Fields a user is permitted to update via the client.
 *
 * Excluded (enforced by SQL trigger):
 *   id, role, xp, level, created_at
 */
export type ProfileUpdate = Pick<
  Profile,
  'full_name' | 'avatar_url' | 'onboarding_completed' | 'last_login_at'
>

/**
 * Shape of the user metadata sent to Supabase during email registration.
 * Values end up in auth.users.raw_user_meta_data and are read by the
 * on_auth_user_created trigger to populate public.profiles.
 */
export interface RegistrationMetadata {
  full_name: string
  registration_provider: 'email' | 'google'
}
