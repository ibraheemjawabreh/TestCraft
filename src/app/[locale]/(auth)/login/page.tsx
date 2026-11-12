import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { LoginForm } from '@/components/auth/LoginForm'
import { getDictionary } from '@/i18n/get-dictionary'
import { resolveLocale } from '@/lib/locale'
import { safeLearningRedirect } from '@/lib/auth/learning-redirect'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ redirectTo?: string; error?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dictionary = await getDictionary(resolveLocale((await params).locale))
  return { title: dictionary.auth.login }
}

export default async function LoginPage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale)
  const [dictionary, query] = await Promise.all([getDictionary(locale), searchParams])
  const destination = safeLearningRedirect(query.redirectTo, locale)
  return <AuthCard title={dictionary.auth.welcomeBack} description={dictionary.auth.continueYourJourney}>
    {query.error === 'profile_unavailable' && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
      {locale === 'ar' ? 'تعذّر تحميل حسابك. حاول تسجيل الدخول مجددًا.' : 'We could not load your account. Try signing in again.'}
    </p>}
    <LoginForm dictionary={dictionary} locale={locale} destination={destination} />
  </AuthCard>
}
