import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await request.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 })
    }

    // Safety check: make sure the challenge exists
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, title')
      .eq('id', id)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Mark as archived (and inactive)
    const { error } = await supabase
      .from('challenges')
      .update({
        is_active: false,
        // NOTE: Once migration 015 is applied, we can uncomment this:
        // status: 'archived',
      })
      .eq('id', id)

    if (error) {
      console.error('Archive challenge error:', error)
      return NextResponse.json({ error: `Failed to archive: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, archived: challenge.title })
  } catch (error: any) {
    console.error('Archive challenge unexpected error:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
