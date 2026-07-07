'use client'

import { User, Shield, SlidersHorizontal, Info } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'

export type SettingsTab = 'profile' | 'security' | 'preferences' | 'account'

interface SettingsSidebarProps {
  activeTab: SettingsTab
  onChangeTab: (tab: SettingsTab) => void
  dictionary: Dictionary
}

export function SettingsSidebar({ activeTab, onChangeTab, dictionary }: SettingsSidebarProps) {
  const tabs = [
    { id: 'profile' as const, label: dictionary.settings.profile, icon: User },
    { id: 'security' as const, label: dictionary.settings.security, icon: Shield },
    { id: 'preferences' as const, label: dictionary.settings.preferences, icon: SlidersHorizontal },
    { id: 'account' as const, label: dictionary.settings.account, icon: Info },
  ]

  return (
    <nav className="flex flex-row overflow-x-auto pb-4 md:pb-0 md:flex-col gap-2 md:w-64 shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors text-start whitespace-nowrap ${
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent'
            }`}
          >
            <tab.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} aria-hidden="true" />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
