'use client'

import { LogOut, Trash2 } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AccountSettingsProps {
  profile: Profile
  dictionary: Dictionary
}

export function AccountSettings({ profile, dictionary }: AccountSettingsProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      {/* Account Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {dictionary.settings.account}
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-border/40">
            <span className="text-sm font-medium text-foreground">{dictionary.settings.role}</span>
            <span className="text-sm text-muted-foreground capitalize">{profile.role}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-border/40">
            <span className="text-sm font-medium text-foreground">{dictionary.settings.createdAt}</span>
            <span className="text-sm text-muted-foreground">{formatDate(profile.created_at)}</span>
          </div>
          
          <form action="/auth/signout" method="POST" className="pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary/80"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {dictionary.settings.signOut}
            </button>
          </form>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-destructive">
          {dictionary.settings.dangerZone}
        </h2>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground mb-4">
            {dictionary.settings.deleteAccountComingSoon}
          </p>
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-all disabled:opacity-50 cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {dictionary.settings.deleteAccount}
          </button>
        </div>
      </section>
    </div>
  )
}
