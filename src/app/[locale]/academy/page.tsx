import { redirect } from 'next/navigation'
import { LogOut, User } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/language/language-switcher'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'

export default async function DashboardPage({ params: { locale } }: { params: { locale: Locale } }) {
  const supabase = await createClient()
  const dictionary = await getDictionary(locale)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Nav */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />

          {/* User pill & controls */}
          <div className="flex items-center gap-4">
            <ThemeToggle dictionary={dictionary} />
            <LanguageSwitcher dictionary={dictionary} locale={locale} />
            
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/15 bg-primary/8 px-3.5 py-2">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
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
                {dictionary.navigation.logout}
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
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
            {dictionary.navigation.academy}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {dictionary.auth.welcomeBack}.
          </p>
        </div>
      </main>
    </div>
  )
}
