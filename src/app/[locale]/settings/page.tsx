import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { SettingsClient } from '@/components/settings/settings-client'

export default async function SettingsPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireAuthenticatedUser(locale)

  return (
    <SettingsLayout dictionary={dictionary} locale={locale} profile={profile}>
      <SettingsClient
        user={user}
        profile={profile}
        dictionary={dictionary}
        locale={locale}
      />
    </SettingsLayout>
  )
}
