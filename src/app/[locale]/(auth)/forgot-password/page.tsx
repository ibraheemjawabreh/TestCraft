import { AuthCard } from '@/components/auth/auth-card'
import { PasswordRecoveryForm } from '@/components/auth/password-recovery-form'
import { getDictionary } from '@/i18n/get-dictionary'
import { resolveLocale } from '@/lib/locale'

export default async function ForgotPasswordPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }>
}) {
  const locale = resolveLocale((await params).locale)
  const [dictionary, query] = await Promise.all([getDictionary(locale), searchParams])
  const ar = locale === 'ar'
  return <AuthCard title={ar ? 'استعادة كلمة المرور' : 'Reset your password'}
    description={ar ? 'أدخل بريدك لإرسال رابط الاستعادة.' : 'Enter your email to request a recovery link.'}>
    {query.error === 'invalid_link' && <p className="mb-4 text-sm text-destructive" role="alert">
      {ar ? 'انتهت صلاحية الرابط أو تعذّر التحقّق منه. اطلب رابطًا جديدًا.' : 'This link could not be verified. Request a new one.'}
    </p>}
    <PasswordRecoveryForm locale={locale} dictionary={{ auth: dictionary.auth, common: dictionary.common, settings: dictionary.settings, validation: dictionary.validation }} />
  </AuthCard>
}
