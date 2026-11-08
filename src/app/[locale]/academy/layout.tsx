import { resolveLocale } from '@/lib/locale'
import { requireTester } from '@/lib/auth/require-tester'
import { getDictionary } from '@/i18n/get-dictionary'
import { AcademyLayout } from '@/components/academy/academy-layout'
import { accountIdentity } from '@/lib/auth/account-identity'

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} account={accountIdentity(user, profile, locale)}>
      {children}
    </AcademyLayout>
  )
}
