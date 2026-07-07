'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Eye, Pencil, BookOpen, CheckCircle2, XCircle } from 'lucide-react'
import type { LessonWithPath } from '@/lib/admin/lessons'
import type { LearningPathWithLessonCount } from '@/lib/admin/learning-paths'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface AdminLessonsTableProps {
  lessons: LessonWithPath[]
  paths: LearningPathWithLessonCount[]
  dictionary: Dictionary
  locale: Locale
}

export function AdminLessonsTable({ lessons, paths, dictionary, locale }: AdminLessonsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterPath, setFilterPath] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = lessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(search.toLowerCase())
    const matchesPath = filterPath === 'all' || lesson.learning_path_id === filterPath
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'published' && lesson.is_published) ||
      (filterStatus === 'draft' && !lesson.is_published)
    return matchesSearch && matchesPath && matchesStatus
  })

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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
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
            <option key={p.id} value={p.id}>{p.title}</option>
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">{dictionary.learning.noLessons}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-card/40 text-muted-foreground">
                <th className="py-3 px-4 text-start font-medium">{dictionary.learning.lessonTitle}</th>
                <th className="py-3 px-4 text-start font-medium hidden md:table-cell">{dictionary.learning.learningPath}</th>
                <th className="py-3 px-4 text-start font-medium hidden sm:table-cell">{dictionary.learning.difficulty}</th>
                <th className="py-3 px-4 text-center font-medium hidden lg:table-cell">{dictionary.learning.estimatedMinutes}</th>
                <th className="py-3 px-4 text-center font-medium">{dictionary.admin.challenges.status}</th>
                <th className="py-3 px-4 text-end font-medium">{dictionary.admin.challenges.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{lesson.title}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{lesson.learning_path_title ?? '—'}</td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${difficultyColor(lesson.difficulty)}`}>
                      {lesson.difficulty}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-muted-foreground hidden lg:table-cell">
                    {lesson.estimated_minutes} {dictionary.learning.minutes}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {lesson.is_published ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {dictionary.learning.published}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400">
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        {dictionary.learning.draft}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${locale}/admin/lessons/${lesson.id}`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                        title={dictionary.learning.viewLesson}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <Link
                        href={`/${locale}/admin/lessons/${lesson.id}/edit`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                        title={dictionary.learning.editLesson}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
