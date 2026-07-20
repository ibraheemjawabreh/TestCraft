'use client'

import { useState } from 'react'
import NextLink from 'next/link'
import { Plus, Search, Edit2, CheckCircle2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database.types'
import type { Locale } from '@/i18n/config'

type LabTemplate = Database['public']['Tables']['lab_templates']['Row']

interface LabsTableProps {
  labs: LabTemplate[]
  locale: Locale
}

export function LabsTable({ labs, locale }: LabsTableProps) {
  const [search, setSearch] = useState('')

  const filteredLabs = labs.filter((lab) => {
    const s = search.toLowerCase()
    return (
      lab.name_en.toLowerCase().includes(s) ||
      (lab.name_ar?.toLowerCase() ?? '').includes(s) ||
      lab.slug.toLowerCase().includes(s) ||
      lab.lab_type.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search labs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 bg-card/60 border-border/50"
          />
        </div>
        <Button asChild className="shrink-0 gap-2">
          <NextLink href={`/${locale}/admin/labs/new`}>
            <Plus className="h-4 w-4" />
            New Lab
          </NextLink>
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLabs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No labs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLabs.map((lab) => (
                  <TableRow key={lab.id} className="border-border/50 hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium">
                      {locale === 'ar' && lab.name_ar ? lab.name_ar : lab.name_en}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {lab.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {lab.lab_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lab.is_active ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Inactive</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                        <NextLink href={`/${locale}/admin/labs/${lab.id}/edit`}>
                          <Edit2 className="h-4 w-4" />
                        </NextLink>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
