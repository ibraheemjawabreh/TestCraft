import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  // Redirect to login page after signing out
  return NextResponse.redirect(new URL('/login', request.url))
}
