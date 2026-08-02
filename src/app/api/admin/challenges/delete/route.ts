export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
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

    // Delete associated hidden bugs first (referential safety)
    await supabase
      .from('hidden_bugs')
      .delete()
      .eq('challenge_id', id)

    // Delete the challenge
    const { error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete challenge error:', error)
      return NextResponse.json({ error: `Failed to delete: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: challenge.title })
  } catch (error: any) {
    console.error('Delete challenge unexpected error:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}

