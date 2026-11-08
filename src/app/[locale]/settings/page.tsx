import { resolveLocale } from '@/lib/locale'
import { getDictionary } from '@/i18n/get-dictionary'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { accountIdentity } from '@/lib/auth/account-identity'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { SettingsClient } from '@/components/settings/settings-client'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireAuthenticatedUser(locale)
  const account = accountIdentity(user, profile, locale)

  return (
    <SettingsLayout dictionary={dictionary} locale={locale} profile={profile} account={account}>
      <SettingsClient
        displayName={account.name}
        email={account.email}
        googleAccount={user.app_metadata.provider === 'google' || !!user.identities?.some(identity => identity.provider === 'google')}
        profile={profile}
        dictionary={dictionary}
        locale={locale}
      />
    </SettingsLayout>
  )
}
