'use client'
import {factoryEn,factoryAr} from '@/i18n/factory'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye,
  Pencil,
  Bug,
  Search,
  Archive,
  FileWarning,
  Layers,
  Zap,
  ArrowUpRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  practicalApplication: string
}

interface ChallengesTableProps {
  challenges: ChallengeWithBugCount[]
  dictionary: ChallengesDictionary
  locale: Locale
}

type TabKey = 'practical' | 'legacy' | 'needs_fix'

// ---------------------------------------------------------------------------
// Helper: classify a challenge
// ---------------------------------------------------------------------------
function classifyChallenge(c: ChallengeWithBugCount): TabKey {
  const wf = (c as unknown as { workflow_type?: string }).workflow_type ?? 'legacy'
  if (c.is_broken) return 'needs_fix'
  if (wf === 'practical') return 'practical'
  return 'legacy'
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
function WorkflowBadge({ c }: { c: ChallengeWithBugCount }) {
  const wf = (c as unknown as { workflow_type?: string }).workflow_type ?? 'legacy'
  if (wf === 'practical') {
    return (
      <Badge
        variant="outline"
        className="gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 font-semibold"
      >
        <Zap className="h-3 w-3" />
        Practical
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30"
    >
      <Layers className="h-3 w-3" />
      Legacy / Archived
    </Badge>
  )
}

function StatusBadge({ c }: { c: ChallengeWithBugCount }) {
  const status = (c as unknown as { status?: string }).status ?? (c.is_active ? 'published' : 'draft')
  const map: Record<string, string> = {
    published: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    archived: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    draft: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
  }
  return (
    <Badge variant="outline" className={map[status] ?? map.draft}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------
interface DeleteDialogProps {
  challenge: ChallengeWithBugCount | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
  locale: Locale
}

function DeleteDialog({ challenge, open, onClose, onConfirm, isDeleting,locale }: DeleteDialogProps) {
  const t=(locale==='ar'?factoryAr:factoryEn).lab
  if (!challenge) return null
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.archive}</AlertDialogTitle>
          <AlertDialogDescription>{t.confirmArchive} <strong>{challenge.title}</strong></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{locale==='ar'?factoryAr.builder.cancel:factoryEn.builder.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? '…' : t.archive}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---------------------------------------------------------------------------
// Archive Confirmation Dialog
// ---------------------------------------------------------------------------
interface ArchiveDialogProps {
  challenge: ChallengeWithBugCount | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isArchiving: boolean
}

function ArchiveDialog({ challenge, open, onClose, onConfirm, isArchiving }: ArchiveDialogProps) {
  if (!challenge) return null
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <Archive className="h-5 w-5" />
            Archive Challenge
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to archive{' '}
                <span className="font-semibold text-foreground">{challenge.title}</span>?
              </p>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-600 dark:text-amber-400">
                <p>Archiving this challenge will hide it from active testers. All existing progress and data will be preserved.</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isArchiving}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isArchiving ? 'Archiving…' : 'Yes, Archive'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------
function PracticalActions({
  c,
  locale,
  onDelete,
}: {
  c: ChallengeWithBugCount
  locale: Locale
  onDelete: (c: ChallengeWithBugCount) => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" asChild className="h-8 px-2 gap-1 text-xs">
        <Link href={`/${locale}/admin/challenges/${c.id}/edit`}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild className="h-8 px-2 gap-1 text-xs">
        <Link href={`/${locale}/admin/challenges/${c.id}`}>
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild className="h-8 px-2 gap-1 text-xs">
        <Link href={`/${locale}/admin/challenges/${c.id}?tab=submissions`}>
          <ArrowUpRight className="h-3.5 w-3.5" />
          Submissions
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
        onClick={() => onDelete(c)}
        title="Delete challenge"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  )
}

function LegacyActions({
  c,
  locale,
  onDelete,
  onArchive,
}: {
  c: ChallengeWithBugCount
  locale: Locale
  onDelete: (c: ChallengeWithBugCount) => void
  onArchive: (c: ChallengeWithBugCount) => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" asChild className="h-8 px-2 gap-1 text-xs">
        <Link href={`/${locale}/admin/challenges/${c.id}`}>
          <Eye className="h-3.5 w-3.5" />
          View
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
        title="Archive this legacy challenge"
        onClick={() => onArchive(c)}
      >
        <Archive className="h-3.5 w-3.5" />
        Archive
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
        onClick={() => onDelete(c)}
        title="Delete challenge"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section Table
// ---------------------------------------------------------------------------
function ChallengeSection({
  title,
  subtitle,
  icon,
  challenges,
  locale,
  onDelete,
  onArchive,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  challenges: ChallengeWithBugCount[]
  locale: Locale
  onDelete: (c: ChallengeWithBugCount) => void
  onArchive?: (c: ChallengeWithBugCount) => void
}) {
  if (challenges.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card/60 border border-border/50">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">
          {challenges.length}
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-start">Challenge</TableHead>
              <TableHead className="text-start">Type</TableHead>
              <TableHead className="text-start">App / Config</TableHead>
              <TableHead className="text-start">Module</TableHead>
              <TableHead className="text-start">Bugs</TableHead>
              <TableHead className="text-start">Status</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.map((c) => {
              const wf = (c as unknown as { workflow_type?: string }).workflow_type ?? 'legacy'
              const isPractical = wf === 'practical'
              return (
                <TableRow
                  key={c.id}
                  className={[
                    'border-border/50',
                    c.is_broken ? 'bg-rose-500/5' : '',
                  ].join(' ')}
                >
                  <TableCell className="font-medium text-foreground max-w-[200px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate">{c.title}</span>
                      {c.slug && (
                        <span className="text-xs text-muted-foreground/60 font-mono">
                          /{c.slug}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <WorkflowBadge c={c} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {isPractical && c.practical_app_key ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {c.practical_app_key}
                      </Badge>
                    ) : !isPractical ? (
                      <span className="text-xs text-muted-foreground/50 italic">Legacy Lab</span>
                    ) : (
                      <span className="text-xs text-rose-500 flex items-center gap-1">
                        <FileWarning className="h-3 w-3" />
                        Missing
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.module_id ? (
                      <span className="text-xs font-mono opacity-60">{c.module_id.slice(0, 8)}…</span>
                    ) : (
                      <span className="text-xs text-rose-500 flex items-center gap-1">
                        <FileWarning className="h-3 w-3" />
                        Unlinked
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className={c.hidden_bugs_count === 0 ? 'text-rose-500' : ''}>
                      {c.hidden_bugs_count}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge c={c} />
                  </TableCell>
                  <TableCell className="text-end">
                    {isPractical ? (
                      <PracticalActions c={c} locale={locale} onDelete={onDelete} />
                    ) : (
                      <LegacyActions c={c} locale={locale} onDelete={onDelete} onArchive={onArchive!} />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function ChallengesTable({ challenges, dictionary, locale }: ChallengesTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ChallengeWithBugCount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [archiveTarget, setArchiveTarget] = useState<ChallengeWithBugCount | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return challenges
    const q = search.toLowerCase()
    return challenges.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.slug ?? '').toLowerCase().includes(q) ||
        (c.practical_app_key ?? '').toLowerCase().includes(q),
    )
  }, [challenges, search])

  // Classify into three buckets
  const practical = filtered.filter((c) => classifyChallenge(c) === 'practical')
  const legacy = filtered.filter((c) => classifyChallenge(c) === 'legacy')
  const needsFix = filtered.filter((c) => classifyChallenge(c) === 'needs_fix')

  const isEmpty = filtered.length === 0

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/admin/challenges/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      if (res.ok) {
        setDeleteTarget(null)
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Failed to delete challenge.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return
    setIsArchiving(true)
    try {
      const res = await fetch('/api/admin/challenges/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: archiveTarget.id }),
      })
      if (res.ok) {
        setArchiveTarget(null)
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Failed to archive challenge.')
      }
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <>
      {/* Archive Confirmation Dialog */}
      <ArchiveDialog
        challenge={archiveTarget}
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        isArchiving={isArchiving}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog locale={locale}
        challenge={deleteTarget}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      <div className="space-y-8">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={dictionary.searchPlaceholder || 'Search challenges…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 bg-card/60 border-border/50"
          />
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
            <Bug className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">{dictionary.noChallenges}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* ── Needs Fix ─────────────────────────────────────────── */}
            {needsFix.length > 0 && (
              <ChallengeSection
                title="Needs Fix"
                subtitle="Broken, unlinked, or misconfigured challenges that must not appear to testers."
                icon={<FileWarning className="h-4 w-4 text-rose-500" />}
                challenges={needsFix}
                locale={locale}
                onDelete={setDeleteTarget}
              />
            )}

            {/* ── Practical Challenges ──────────────────────────────── */}
            <ChallengeSection
              title="Practical Challenges"
              subtitle="Official challenges created through the Practical Challenge Builder."
              icon={<Zap className="h-4 w-4 text-violet-500" />}
              challenges={practical}
              locale={locale}
              onDelete={setDeleteTarget}
            />

            {/* ── Legacy Challenges ─────────────────────────────────── */}
            <ChallengeSection
              title="Legacy Challenges"
              subtitle="Old challenges preserved for historical data. Read-only — do not assign to new testers."
              icon={<Layers className="h-4 w-4 text-zinc-500" />}
              challenges={legacy}
              locale={locale}
              onDelete={setDeleteTarget}
              onArchive={setArchiveTarget}
            />
          </div>
        )}
      </div>
    </>
  )
}
