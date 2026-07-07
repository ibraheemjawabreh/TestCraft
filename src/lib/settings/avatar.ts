'use client'

import { createClient } from '@/lib/supabase/client'

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Uploads an avatar image to the 'avatars' bucket for the current user.
 * Must be called from the client since it uses the browser's File API.
 */
export async function uploadAvatar(file: File): Promise<Result<{ url: string }>> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'unauthorized' }
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    // Ensure safe file extension mapping if needed, or rely on frontend validation
    // The path is: user_id/avatar.ext
    // If the user already has an avatar.ext, it will be overwritten via upsert
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return { data: null, error: 'upload_failed' }
    }

    // Get the public URL. Depending on bucket settings, this requires the bucket to be public.
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

    const publicUrl = publicUrlData.publicUrl

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return { data: null, error: 'profile_update_failed' }
    }

    return { data: { url: publicUrl }, error: null }
  } catch (error) {
    return { data: null, error: 'server_error' }
  }
}
