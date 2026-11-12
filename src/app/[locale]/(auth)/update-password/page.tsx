import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/auth-card'
import { PasswordRecoveryForm } from '@/components/auth/password-recovery-form'
import { getDictionary } from '@/i18n/get-dictionary'
import { getVerifiedViewer } from '@/lib/auth/viewer'
import { resolveLocale } from '@/lib/locale'

export const metadata = { robots: { index: false, follow: false } }

export default async function UpdatePasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale)
  const [viewer, dictionary] = await Promise.all([getVerifiedViewer(), getDictionary(locale)])
  if (!viewer) redirect('/' + locale + '/forgot-password?error=invalid_link')
  return <AuthCard title={dictionary.settings.newPassword}>
    <PasswordRecoveryForm locale={locale} dictionary={{ auth: dictionary.auth, common: dictionary.common, settings: dictionary.settings, validation: dictionary.validation }} update />
  </AuthCard>
}
