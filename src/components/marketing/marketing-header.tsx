import type { Locale } from '@/i18n/config'
import { getViewerProfile } from '@/lib/auth/viewer'
import { accountIdentity } from '@/lib/auth/account-identity'
import { SiteHeader } from '@/components/layout/site-header'
import { HeaderAccountMenu } from '@/components/layout/header-links'

export async function MarketingHeader({ locale }: { locale: Locale }) {
  const viewer = await getViewerProfile()
  const account = viewer ? accountIdentity(viewer.user, viewer.profile, locale) : undefined
  const role = viewer?.profile?.role
  return <SiteHeader locale={locale} role={role} accountMenu={
    account ? <HeaderAccountMenu account={account} locale={locale} admin={role === 'admin'} /> : undefined
  } />
}
