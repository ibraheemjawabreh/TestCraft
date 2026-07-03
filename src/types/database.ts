/**
 * Database TypeScript types for the TestCraft Supabase schema.
 *
 * These types mirror the public.profiles table you created in Supabase
 * and are used across the app to ensure consistent, type-safe data access.
 */

// ─── Enums / Literals ────────────────────────────────────────────────────────

/** Possible values for profiles.role (user_role enum in DB). */
export type UserRole = 'tester' | 'company' | 'admin'

// ─── Table Types ─────────────────────────────────────────────────────────────

/**
 * A full row from public.profiles (as returned by SELECT *).
 * All timestamps are ISO 8601 strings (Supabase returns strings over the API).
 */
export interface Profile {
  /** UUID — matches auth.users(id). Primary Key. */
  id: string
  /** Unique username. */
  username: string
  /** URL to the user's avatar image. Nullable. */
  avatar_url: string | null
  /** Role — defaults to 'tester'. */
  role: UserRole
  /** Current level. Starts at 1. */
  current_level: number
  /** Experience points. Starts at 0. */
  total_xp: number
  /** ISO 8601 — set by the database on insert. */
  created_at: string
}

/**
 * Fields a user is permitted to update via the client.
 */
export type ProfileUpdate = Pick<Profile, 'username' | 'avatar_url'>

/**
 * Shape of the user metadata sent to Supabase during email registration.
 * Values end up in auth.users.raw_user_meta_data and are read by your
 * handle_new_user() trigger to populate public.profiles.
 */
export interface RegistrationMetadata {
  username: string
  registration_provider: 'email' | 'google'
}
