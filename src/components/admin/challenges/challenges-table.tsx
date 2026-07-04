'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Pencil, ToggleLeft, ToggleRight, Bug, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { ChallengeWithBugCount } from '@/lib/admin/challenges'
import type { Locale } from '@/i18n/config'

interface ChallengesDictionary {
  searchPlaceholder: string
  difficulty: string
  status: string
  all: string
  active: string
  inactive: string
  beginner: string
  intermediate: string
  advanced: string
  challengeTitle: string
  baseXpReward: string
  bugsCount: string
  actions: string
  viewDetails: string
  edit: string
  activate: string
  deactivate: string
  noChallenges: string
  xp: string
}

interface ChallengesTableProps {
  challenges: ChallengeWithBugCount[]
  dictionary: ChallengesDictionary
  locale: Locale
}

type DifficultyFilter = 'all' | 'Beginner' | 'Intermediate' | 'Advanced'
type StatusFilter = 'all' | 'active' | 'inactive'

const difficultyColor: Record<string, string> = {
  Beginner: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  Intermediate: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Advanced: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
}

export function ChallengesTable({ challenges, dictionary, locale }: ChallengesTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase())
      const matchesDifficulty = difficultyFilter === 'all' || c.difficulty === difficultyFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.is_active) ||
        (statusFilter === 'inactive' && !c.is_active)
      return matchesSearch && matchesDifficulty && matchesStatus
    })
  }, [challenges, search, difficultyFilter, statusFilter])

  async function handleToggle(id: string, currentStatus: boolean | null) {
    setTogglingId(id)
    try {
      const res = await fetch(`/${locale}/admin/challenges/api/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder={dictionary.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 bg-card/60 border-border/50"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={(v) => setDifficultyFilter(v as DifficultyFilter)}>
          <SelectTrigger className="w-full sm:w-[160px] bg-card/60 border-border/50">
            <SelectValue placeholder={dictionary.difficulty} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{dictionary.all}</SelectItem>
            <SelectItem value="Beginner">{dictionary.beginner}</SelectItem>
            <SelectItem value="Intermediate">{dictionary.intermediate}</SelectItem>
            <SelectItem value="Advanced">{dictionary.advanced}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[140px] bg-card/60 border-border/50">
            <SelectValue placeholder={dictionary.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{dictionary.all}</SelectItem>
            <SelectItem value="active">{dictionary.active}</SelectItem>
            <SelectItem value="inactive">{dictionary.inactive}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
          <Bug className="h-10 w-10 text-muted-foreground/50 mb-3" aria-hidden="true" />
          <p className="text-muted-foreground">{dictionary.noChallenges}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-start">{dictionary.challengeTitle}</TableHead>
                <TableHead className="text-start">{dictionary.difficulty}</TableHead>
                <TableHead className="text-start">{dictionary.xp}</TableHead>
                <TableHead className="text-start">{dictionary.bugsCount}</TableHead>
                <TableHead className="text-start">{dictionary.status}</TableHead>
                <TableHead className="text-end">{dictionary.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((challenge) => (
                <TableRow key={challenge.id} className="border-border/50">
                  <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                    {challenge.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={difficultyColor[challenge.difficulty] ?? ''}>
                      {challenge.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {challenge.base_xp_reward}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {challenge.hidden_bugs_count}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        challenge.is_active
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30'
                      }
                    >
                      {challenge.is_active ? dictionary.active : dictionary.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                        <Link href={`/${locale}/admin/challenges/${challenge.id}`} title={dictionary.viewDetails}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                        <Link href={`/${locale}/admin/challenges/${challenge.id}/edit`} title={dictionary.edit}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={togglingId === challenge.id}
                        onClick={() => handleToggle(challenge.id, challenge.is_active)}
                        title={challenge.is_active ? dictionary.deactivate : dictionary.activate}
                      >
                        {challenge.is_active ? (
                          <ToggleRight className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
