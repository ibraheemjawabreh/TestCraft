'use client'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import dynamic from 'next/dynamic'
import { FlaskConical } from 'lucide-react'

const LoginFormPracticalApp = dynamic(
  () => import('./LoginFormPracticalApp').then(mod => mod.LoginFormPracticalApp),
  { ssr: false }
)

interface PracticalAppRendererProps {
  appKey: string | null
  config: Record<string, unknown> | null
  activeBugs: string[]
  locale?: Locale
  dictionary?: Dictionary
}

export function PracticalAppRenderer({
  appKey,
  config,
  activeBugs,
  locale = 'en',
  dictionary,
}: PracticalAppRendererProps) {

  if (appKey === 'login_form') {
    const safeConfig = {
      validEmail: (config?.validEmail as string) || 'qa.tester@testcraft.dev',
      validPassword: (config?.validPassword as string) || 'Test@12345',
    }
    return (
      <LoginFormPracticalApp
        config={safeConfig}
        activeBugs={activeBugs}
        locale={locale}
      />
    )
  }

  // Fallback for unknown or missing app key
  const isAr = locale === 'ar'
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border/50 bg-secondary/10"
    >
      <FlaskConical className="h-10 w-10 text-muted-foreground mb-4 opacity-40" aria-hidden="true" />
      <p className="text-muted-foreground font-medium">
        {isAr
          ? 'هذا التطبيق العملي غير متاح حاليًا.'
          : 'This practical application is currently unavailable.'}
      </p>
    </div>
  )
}
