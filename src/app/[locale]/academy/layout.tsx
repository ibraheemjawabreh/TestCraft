import { requireTester } from '@/lib/auth/require-tester'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { AcademyLayout } from '@/components/academy/academy-layout'

export default async function Layout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { profile } = await requireTester(locale)

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      {children}
    </AcademyLayout>
  )
}
