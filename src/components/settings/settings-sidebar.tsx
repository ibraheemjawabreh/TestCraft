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
    <nav aria-label={dictionary.settings.title} className="grid w-full shrink-0 grid-cols-2 gap-2 md:flex md:w-56 md:flex-col">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChangeTab(tab.id)}
            className={`flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm font-medium transition-colors sm:px-4 ${
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent'
            }`}
          >
            <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : ''}`} aria-hidden="true" />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
