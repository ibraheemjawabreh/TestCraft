import Image from 'next/image'
import { Star, Zap, Target } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ProfileProgressCardProps {
  profile: Profile
  attemptedChallenges: number
  reviewedReports: number
  dictionary: Dictionary
}

export function ProfileProgressCard({
  profile,
  attemptedChallenges,
  reviewedReports,
  dictionary,
}: ProfileProgressCardProps) {
  const level = profile.current_level ?? 1
  const xp = profile.total_xp ?? 0
  // XP needed for next level (simple linear: level * 500)
  const xpForNextLevel = level * 500
  const xpProgress = Math.min((xp % xpForNextLevel) / xpForNextLevel, 1)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
      {/* Decorative gradient */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-[60px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent/5 blur-[50px] pointer-events-none"
      />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <div className="relative shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-primary/30"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary ring-2 ring-primary/30">
              <span className="text-xl font-bold text-primary-foreground">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Level badge */}
          <div className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-md">
            {level}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground truncate">
            {profile.username}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {dictionary.academy.currentLevel} {level}
          </p>

          {/* XP Progress bar */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-primary">{xp.toLocaleString('en-US')} XP</span>
              <span>{xpForNextLevel.toLocaleString('en-US')} XP</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.max(xpProgress * 100, 3)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex sm:flex-col gap-4 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{dictionary.academy.totalXp}</p>
              <p className="text-sm font-semibold text-foreground">{xp.toLocaleString('en-US')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Target className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{dictionary.academy.attemptedChallenges}</p>
              <p className="text-sm font-semibold text-foreground">{attemptedChallenges}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Star className="h-4 w-4 text-green-500" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{dictionary.academy.reviewedReports}</p>
              <p className="text-sm font-semibold text-foreground">{reviewedReports}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
