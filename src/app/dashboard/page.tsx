import { redirect } from 'next/navigation'
import { LogOut, User } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/brand/Logo'

/**
 * Dashboard — protected Server Component.
 *
 * Uses the server Supabase client to verify the user's session via
 * `getUser()` (which validates the JWT server-side, not just reads a cookie).
 * Unauthenticated users are redirected to /login.
 *
 * This is intentionally minimal — replace with your actual dashboard UI.
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  // `getUser()` hits the Supabase Auth server to validate the session.
  // This is more secure than `getSession()` which only reads the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Session invalid or expired — send to login
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      {/* Nav */}
      <header className="border-b border-[#7c3aed]/10 bg-[#0f0f1f]/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />

          {/* User pill */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-[#7c3aed]/15 bg-[#7c3aed]/8 px-3.5 py-2">
              <User className="h-4 w-4 text-[#7c3aed]" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground/80 max-w-[200px] truncate">
                {user.email}
              </span>
            </div>

            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-150"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-gradient shadow-glow-sm"
          >
            <span className="font-heading text-xl font-black text-white">TC</span>
          </div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-3 text-lg text-[#8892b0]">
            Welcome back. Your QA journey continues here.
          </p>
        </div>
      </main>
    </div>
  )
}
