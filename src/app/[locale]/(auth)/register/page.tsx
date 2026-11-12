import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { getDictionary } from '@/i18n/get-dictionary'
import { resolveLocale } from '@/lib/locale'
import { safeLearningRedirect } from '@/lib/auth/learning-redirect'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ redirectTo?: string; error?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dictionary = await getDictionary(resolveLocale((await params).locale))
  return { title: dictionary.auth.register }
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const locale = resolveLocale((await params).locale)
  const [dictionary, query] = await Promise.all([getDictionary(locale), searchParams])
  const destination = safeLearningRedirect(query.redirectTo, locale)
  return <AuthCard title={dictionary.auth.createAccount}>
    {query.error === 'auth_failed' && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
      {locale === 'ar' ? 'تعذّر التحقّق من الرابط. حاول مجددًا.' : 'This sign-in link could not be verified. Try again.'}
    </p>}
    <RegisterForm dictionary={dictionary} locale={locale} destination={destination} />
  </AuthCard>
}
