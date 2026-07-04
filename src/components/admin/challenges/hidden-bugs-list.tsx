'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Plus, Bug } from 'lucide-react'

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
import { HiddenBugForm } from '@/components/admin/challenges/hidden-bug-form'
import type { Database } from '@/types/database.types'
import type { Locale } from '@/i18n/config'

type HiddenBug = Database['public']['Tables']['hidden_bugs']['Row']

interface BugsListDictionary {
  hiddenBugs: string
  addHiddenBug: string
  editHiddenBug: string
  deleteHiddenBug: string
  confirmDelete: string
  bugTitle: string
  actualSeverity: string
  bonusXp: string
  actions: string
  noHiddenBugs: string
  saveChallenge: string
  somethingWentWrong: string
}

interface ValidationDictionary {
  [key: string]: string
}

interface HiddenBugsListProps {
  challengeId: string
  bugs: HiddenBug[]
  dictionary: BugsListDictionary
  validationDictionary: ValidationDictionary
  locale: Locale
}

const severityColor: Record<string, string> = {
  Low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  High: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  Critical: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
}

export function HiddenBugsList({
  challengeId,
  bugs,
  dictionary,
  validationDictionary,
  locale,
}: HiddenBugsListProps) {
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBug, setEditingBug] = useState<HiddenBug | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleOpenCreate() {
    setEditingBug(undefined)
    setIsFormOpen(true)
  }

  function handleOpenEdit(bug: HiddenBug) {
    setEditingBug(bug)
    setIsFormOpen(true)
  }

  async function handleDelete(id: string) {
    if (!window.confirm(dictionary.confirmDelete)) return

    setDeletingId(id)
    try {
      const res = await fetch(`/${locale}/admin/challenges/api/hidden-bugs/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4 mt-8 pt-8 border-t border-border/50">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">
          {dictionary.hiddenBugs}
        </h3>
        <Button onClick={handleOpenCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {dictionary.addHiddenBug}
        </Button>
      </div>

      {bugs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
          <Bug className="h-10 w-10 text-muted-foreground/50 mb-3" aria-hidden="true" />
          <p className="text-muted-foreground">{dictionary.noHiddenBugs}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-start">{dictionary.bugTitle}</TableHead>
                <TableHead className="text-start">{dictionary.actualSeverity}</TableHead>
                <TableHead className="text-start">{dictionary.bonusXp}</TableHead>
                <TableHead className="text-end">{dictionary.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bugs.map((bug) => (
                <TableRow key={bug.id} className="border-border/50">
                  <TableCell className="font-medium text-foreground max-w-[300px] truncate">
                    {bug.bug_title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={severityColor[bug.actual_severity] ?? ''}>
                      {bug.actual_severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    +{bug.bonus_xp} XP
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenEdit(bug)}
                        title={dictionary.editHiddenBug}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:text-destructive hover:bg-destructive/10"
                        disabled={deletingId === bug.id}
                        onClick={() => handleDelete(bug.id)}
                        title={dictionary.deleteHiddenBug}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <HiddenBugForm
          mode={editingBug ? 'edit' : 'create'}
          bug={editingBug}
          challengeId={challengeId}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          dictionary={dictionary}
          validationDictionary={validationDictionary}
          locale={locale}
        />
      )}
    </div>
  )
}
