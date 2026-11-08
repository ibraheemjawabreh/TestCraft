'use server'

import { createClient } from '@/lib/supabase/server'
import { updateProfileSchema } from '@/lib/validations/settings'

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function updateProfile(
  input: unknown,
): Promise<Result<{ value: string }>> {
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: 'invalid_data' }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'unauthorized' }
    }

    if ('displayName' in parsed.data) {
      const { displayName } = parsed.data
      const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName } })
      return !error && data.user?.user_metadata.display_name === displayName
        ? { data: { value: displayName }, error: null }
        : { data: null, error: 'update_failed' }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ username: parsed.data.username })
      .eq('id', user.id)
      .select('username')
      .single()

    if (error?.code === '23505') return { data: null, error: 'username_taken' }
    return !error && data
      ? { data: { value: data.username }, error: null }
      : { data: null, error: 'update_failed' }
  } catch {
    return { data: null, error: 'server_error' }
  }
}
