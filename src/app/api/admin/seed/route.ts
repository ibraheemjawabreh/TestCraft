import { NextResponse } from 'next/server'
import { seedDemoData } from '@/lib/admin/seeder'

export async function POST() {
  try {
    const result = await seedDemoData()
    return NextResponse.json(result)
  } catch (error) {
    console.error('API /admin/seed error:', error)
    return NextResponse.json(
      { success: false, message: 'Unauthorized or server error.' },
      { status: 500 }
    )
  }
}
