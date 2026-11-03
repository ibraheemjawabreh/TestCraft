'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Eye,
  Pencil,
  BookOpen,
  Plus,
  Copy,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { LessonWithPath } from '@/lib/admin/lessons'
import type { LearningPathWithLessonCount } from '@/lib/admin/learning-paths'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import { duplicateLesson, deleteLesson } from '@/lib/admin/lessons'
import { LessonStatusBadge } from './lesson-status-badge'

interface AdminLessonsTableProps {
  lessons: LessonWithPath[]
  paths: LearningPathWithLessonCount[]
  dictionary: Dictionary
  locale: Locale
}

export function AdminLessonsTable({ lessons, paths, dictionary, locale }: AdminLessonsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filterPath, setFilterPath] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeActionId, setActiveActionId] = useState<string | null>(null)

  const filtered = lessons.filter((lesson) => {
    const lessonTitle = (locale === 'ar' ? lesson.title_ar || lesson.title_en : lesson.title_en || lesson.title_ar) ?? ''
    const matchesSearch =
      lessonTitle.toLowerCase().includes(search.toLowerCase()) ||
      (lesson.slug && lesson.slug.toLowerCase().includes(search.toLowerCase())) ||
      (lesson.module_title && lesson.module_title.toLowerCase().includes(search.toLowerCase()))

    const matchesPath = filterPath === 'all' || lesson.learning_path_id === filterPath
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'published' && lesson.is_published) ||
      (filterStatus === 'draft' && !lesson.is_published)
    return matchesSearch && matchesPath && matchesStatus
  })

  const handleDuplicate = (id: string) => {
    setActiveActionId(id)
    startTransition(async () => {
      const res = await duplicateLesson(id)
      setActiveActionId(null)
      if (res.data) {
        router.refresh()
      } else if (res.error) {
        alert(`Failed to duplicate: ${res.error}`)
      }
    })
  }

  const handleDelete = (id: string, title: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)
    if (!confirmed) return

    setActiveActionId(id)
    startTransition(async () => {
      const res = await deleteLesson(id)
      setActiveActionId(null)
      if (!res.error) {
        router.refresh()
      } else {
        alert(`Failed to delete: ${res.error}`)
      }
    })
  }

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'Beginner': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'Intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'Advanced': return 'text-red-400 bg-red-500/10 border-red-500/20'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder={dictionary.learning.searchLessons}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background/60 py-2.5 ps-10 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <select
            value={filterPath}
            onChange={(e) => setFilterPath(e.target.value)}
            className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="all">{dictionary.learning.allPaths}</option>
            {paths.map((p) => (
              <option key={p.id} value={p.id}>{locale === 'ar' ? p.title_ar || p.title_en : p.title_en || p.title_ar}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="all">{dictionary.learning.allStatuses}</option>
            <option value="published">{dictionary.learning.published}</option>
            <option value="draft">{dictionary.learning.draft}</option>
          </select>
        </div>

        <Link
          href={`/${locale}/admin/lessons/new`}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create Lesson
        </Link>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/40 bg-card/30">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">{dictionary.learning.noLessons}</p>
          <Link
            href={`/${locale}/admin/lessons/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Lesson
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30 text-muted-foreground">
                <th className="py-3.5 px-4 text-start font-medium">{dictionary.learning.lesson}</th>
                <th className="py-3.5 px-4 text-start font-medium hidden md:table-cell">Module & Path</th>
                <th className="py-3.5 px-4 text-center font-medium hidden sm:table-cell">Bilingual</th>
                <th className="py-3.5 px-4 text-start font-medium hidden lg:table-cell">{dictionary.learning.difficulty}</th>
                <th className="py-3.5 px-4 text-center font-medium">Status</th>
                <th className="py-3.5 px-4 text-end font-medium">{dictionary.admin.challenges.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((lesson) => {
                const enDone = Boolean(lesson.title_en && lesson.content_en)
                const arDone = Boolean(lesson.title_ar && lesson.content_ar)
                const displayTitle = (locale === 'ar' ? lesson.title_ar || lesson.title_en : lesson.title_en || lesson.title_ar) || 'Untitled'

                return (
                  <tr key={lesson.id} className="hover:bg-secondary/20 transition-colors">
                    {/* Lesson Title & Order */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/${locale}/admin/lessons/${lesson.id}/edit`}
                          className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {displayTitle}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-mono">
                          <span>#{lesson.sort_order}</span>
                          <span>·</span>
                          <span className="truncate max-w-[180px]">{lesson.slug}</span>
                        </div>
                      </div>
                    </td>

                    {/* Module & Path */}
                    <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-foreground/90">{lesson.module_title ?? 'No Module'}</span>
                        <span className="text-muted-foreground/70">{lesson.learning_path_title ?? '—'}</span>
                      </div>
                    </td>

                    {/* Bilingual Availability Indicators */}
                    <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                      <div className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                            enDone ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-secondary text-muted-foreground/50'
                          }`}
                          title={enDone ? 'English complete' : 'English missing'}
                        >
                          EN
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                            arDone ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-secondary text-muted-foreground/50'
                          }`}
                          title={arDone ? 'Arabic complete' : 'Arabic missing'}
                        >
                          AR
                        </span>
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3.5 px-4 hidden lg:table-cell">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${difficultyColor(lesson.difficulty)}`}>
                        {lesson.difficulty}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <LessonStatusBadge locale={locale} isPublished={lesson.is_published} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/${locale}/admin/lessons/${lesson.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Preview student view"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Link
                          href={`/${locale}/admin/lessons/${lesson.id}/edit`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Edit lesson in studio"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(lesson.id)}
                          disabled={isPending && activeActionId === lesson.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40"
                          title="Duplicate into new draft"
                        >
                          {isPending && activeActionId === lesson.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(lesson.id, displayTitle)}
                          disabled={isPending && activeActionId === lesson.id}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                          title="Delete lesson"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
