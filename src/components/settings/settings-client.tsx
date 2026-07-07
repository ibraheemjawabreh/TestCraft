'use client'

import { useState } from 'react'
import { SettingsSidebar, type SettingsTab } from './settings-sidebar'
import { ProfileSettingsForm } from './profile-settings-form'
import { SecuritySettingsForm } from './security-settings-form'
import { PreferencesSettings } from './preferences-settings'
import { AccountSettings } from './account-settings'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface SettingsClientProps {
  user: User
  profile: Profile
  dictionary: Dictionary
  locale: Locale
}

export function SettingsClient({ user, profile, dictionary, locale }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <SettingsSidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        dictionary={dictionary}
      />
      <div className="flex-1 min-w-0 w-full">
        {activeTab === 'profile' && (
          <ProfileSettingsForm profile={profile} dictionary={dictionary} />
        )}
        {activeTab === 'security' && (
          <SecuritySettingsForm user={user} dictionary={dictionary} />
        )}
        {activeTab === 'preferences' && (
          <PreferencesSettings dictionary={dictionary} locale={locale} />
        )}
        {activeTab === 'account' && (
          <AccountSettings profile={profile} dictionary={dictionary} />
        )}
      </div>
    </div>
  )
}
