'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { ChallengeCard } from '@/components/academy/challenge-card'
import { AcademyEmptyState } from '@/components/academy/academy-empty-state'
import { Sword } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { ChallengeWithStatus } from '@/lib/academy/challenges'
import type { Database } from '@/types/database.types'

type DifficultyLevel = Database['public']['Enums']['difficulty_level']
type ChallengeSort = 'newest' | 'difficulty' | 'xp'

interface ChallengesClientProps {
  challenges: ChallengeWithStatus[]
  dictionary: Dictionary
  locale: Locale
}

const DIFFICULTY_ORDER: Record<DifficultyLevel, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
}

export function ChallengesClient({ challenges, dictionary, locale }: ChallengesClientProps) {
  const [search, setSearch] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | 'all'>('all')
  const [sort, setSort] = useState<ChallengeSort>('newest')

  const filtered = useMemo(() => {
    let result = [...challenges]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      )
    }

    if (difficultyFilter !== 'all') {
      result = result.filter((c) => c.difficulty === difficultyFilter)
    }

    result.sort((a, b) => {
      if (sort === 'difficulty') {
        return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
      }
      if (sort === 'xp') {
        return b.base_xp_reward - a.base_xp_reward
      }
      // newest = default order (already sorted by XP desc from server, treat as "featured")
      return b.base_xp_reward - a.base_xp_reward
    })

    return result
  }, [challenges, search, difficultyFilter, sort])

  const selectClass =
    'academy-filter rounded-lg px-3 py-2 text-sm text-foreground transition-colors'

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dictionary.academy.searchPlaceholder}
            className="academy-filter block w-full rounded-lg py-2 ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as DifficultyLevel | 'all')}
            className={selectClass}
            aria-label={dictionary.academy.filterByDifficulty}
          >
            <option value="all">{dictionary.academy.allDifficulties}</option>
            <option value="Beginner">{dictionary.academy.beginner}</option>
            <option value="Intermediate">{dictionary.academy.intermediate}</option>
            <option value="Advanced">{dictionary.academy.advanced}</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ChallengeSort)}
            className={selectClass}
            aria-label={dictionary.academy.sortBy}
          >
            <option value="newest">{dictionary.academy.sortNewest}</option>
            <option value="difficulty">{dictionary.academy.sortDifficulty}</option>
            <option value="xp">{dictionary.academy.sortXp}</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <AcademyEmptyState icon={Sword} message={dictionary.academy.noChallenges} />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} / {challenges.length} {dictionary.academy.activeChallenges}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                dictionary={dictionary}
                locale={locale}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
