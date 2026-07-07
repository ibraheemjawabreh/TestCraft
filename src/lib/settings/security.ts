'use server'

import { createClient } from '@/lib/supabase/server'
import { updatePasswordSchema, type UpdatePasswordValues } from '@/lib/validations/settings'

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function updatePassword(
  input: UpdatePasswordValues,
): Promise<Result<{ success: boolean }>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'unauthorized' }
    }

    const parsed = updatePasswordSchema.safeParse(input)
    if (!parsed.success) {
      return { data: null, error: 'invalid_data' }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    })

    if (updateError) {
      return { data: null, error: 'update_failed' }
    }

    return { data: { success: true }, error: null }
  } catch (error) {
    return { data: null, error: 'server_error' }
  }
}

export async function sendPasswordResetEmail(email: string): Promise<Result<{ success: boolean }>> {
  try {
    const supabase = await createClient()

    // Note: The redirectTo URL should point back to a route that handles the password reset flow.
    // Assuming the user is already authenticated or uses a standard recovery flow.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback?next=/settings`,
    })

    if (error) {
      return { data: null, error: 'reset_failed' }
    }

    return { data: { success: true }, error: null }
  } catch (error) {
    return { data: null, error: 'server_error' }
  }
}
