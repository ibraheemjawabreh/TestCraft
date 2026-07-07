'use client'

import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/language/language-switcher'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface PreferencesSettingsProps {
  dictionary: Dictionary
  locale: Locale
}

export function PreferencesSettings({ dictionary, locale }: PreferencesSettingsProps) {
  return (
    <div className="space-y-8">
      {/* Theme */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {dictionary.settings.theme}
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{dictionary.settings.theme}</p>
          <ThemeToggle dictionary={dictionary} />
        </div>
      </section>

      {/* Language */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {dictionary.settings.language}
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{dictionary.settings.language}</p>
          <LanguageSwitcher dictionary={dictionary} locale={locale} />
        </div>
      </section>
    </div>
  )
}
