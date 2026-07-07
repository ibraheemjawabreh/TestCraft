'use server'

import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema, type UpdateProfileValues } from '@/lib/validations/settings'

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function updateProfile(
  input: UpdateProfileValues,
): Promise<Result<{ success: boolean }>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'unauthorized' }
    }

    const parsed = updateProfileSchema.safeParse(input)
    if (!parsed.success) {
      return { data: null, error: 'invalid_data' }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: parsed.data.username })
      .eq('id', user.id)

    if (updateError) {
      // Supabase unique constraint violation on username
      if (updateError.code === '23505') {
        return { data: null, error: 'username_taken' }
      }
      return { data: null, error: 'update_failed' }
    }

    return { data: { success: true }, error: null }
  } catch (error) {
    return { data: null, error: 'server_error' }
  }
}
