'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Search,
  Filter,
  Plus,
  Route,
  Layers,
  BookOpen,
  Sword,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
  Clock,
  Zap,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type {
  CurriculumPath,
  CurriculumModule,
  CurriculumLesson,
  CurriculumChallenge,
  CurriculumStats,
} from '@/lib/admin/curriculum'
import {
  reorderPaths,
  reorderModules,
  reorderLessons,
  deleteLearningPath,
  deleteModule,
  deleteLesson,
  togglePathActive,
  toggleModulePublished,
  toggleLessonPublished,
} from '@/lib/admin/curriculum'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import { CurriculumModals } from './CurriculumModals'

// ── Types ────────────────────────────────────────────────────────────────────

interface CurriculumDict {
  curriculum: {
    title: string
    subtitle: string
    createPath: string
    addModule: string
    addLesson: string
    addChallenge: string
    searchPlaceholder: string
    filterAll: string
    filterPublished: string
    filterDrafts: string
    noPathsYet: string
    modules: string
    lessons: string
    challenges: string
    published: string
    drafts: string
    totalPaths: string
    totalModules: string
    totalLessons: string
    totalChallenges: string
    edit: string
    delete: string
    publish: string
    unpublish: string
    confirmDelete: string
    deleteSuccess: string
    deleteFailed: string
    reorderSuccess: string
    reorderFailed: string
    toggleSuccess: string
    toggleFailed: string
    xp: string
    minutes: string
    active: string
    inactive: string
    beginner: string
    intermediate: string
    advanced: string
    emptyModule: string
    noChallenge: string
    sortOrder: string
  }
}

interface CurriculumManagerProps {
  initialPaths: CurriculumPath[]
  initialStats: CurriculumStats
  dictionary: Dictionary
  locale: Locale
}

// ── Sortable Wrapper ─────────────────────────────────────────────────────────

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as any,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-start gap-0">
        <button
          {...listeners}
          className="mt-4 flex-shrink-0 cursor-grab rounded p-1 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing transition-colors"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

// ── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ stats, dict }: { stats: CurriculumStats; dict: CurriculumDict['curriculum'] }) {
  const items = [
    { label: dict.totalPaths, value: stats.totalPaths, icon: <Route className="h-4 w-4" /> },
    { label: dict.totalModules, value: stats.totalModules, icon: <Layers className="h-4 w-4" /> },
    { label: dict.totalLessons, value: stats.totalLessons, icon: <BookOpen className="h-4 w-4" /> },
    { label: dict.totalChallenges, value: stats.totalChallenges, icon: <Sword className="h-4 w-4" /> },
    { label: dict.published, value: stats.published, icon: <Eye className="h-4 w-4" /> },
    { label: dict.drafts, value: stats.drafts, icon: <EyeOff className="h-4 w-4" /> },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="admin-surface rounded-xl p-4 flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f97316]/15 text-[#ea580c] flex-shrink-0">
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground truncate">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Challenge Item ───────────────────────────────────────────────────────────

function ChallengeItemRow({
  challenge,
  dict,
  locale,
}: {
  challenge: CurriculumChallenge
  dict: CurriculumDict['curriculum']
  locale: Locale
}) {
  const title = locale === 'ar'
    ? challenge.title_ar || challenge.title_en || challenge.title
    : challenge.title_en || challenge.title

  const difficultyColors: Record<string, string> = {
    Beginner: 'text-green-400 bg-green-500/10',
    Intermediate: 'text-yellow-400 bg-yellow-500/10',
    Advanced: 'text-red-400 bg-red-500/10',
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 transition-all hover:border-amber-500/30">
      <Sword className="h-4 w-4 text-amber-500 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[challenge.difficulty] || 'text-slate-400 bg-slate-500/10'}`}>
        {challenge.difficulty}
      </span>
      <div className="flex items-center gap-1 text-xs text-amber-500">
        <Zap className="h-3.5 w-3.5" />
        {challenge.base_xp_reward} {dict.xp}
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${challenge.is_active ? 'text-green-400 bg-green-500/10' : 'text-slate-400 bg-slate-500/10'}`}>
        {challenge.is_active ? dict.active : dict.inactive}
      </span>
    </div>
  )
}

// ── Lesson Item ──────────────────────────────────────────────────────────────

function LessonItemRow({
  lesson,
  dict,
  locale,
  onTogglePublish,
  onDelete,
}: {
  lesson: CurriculumLesson
  dict: CurriculumDict['curriculum']
  locale: Locale
  onTogglePublish: (id: string, published: boolean) => void
  onDelete: (id: string) => void
}) {
  const title = locale === 'ar'
    ? lesson.title_ar || lesson.title_en
    : lesson.title_en || lesson.title_ar

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/30 px-4 py-2.5 transition-all hover:border-border/50 hover:bg-card/50 group">
      <BookOpen className="h-4 w-4 text-primary/60 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title || 'Untitled'}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {lesson.estimated_minutes} {dict.minutes}
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${lesson.is_published ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
        {lesson.is_published ? dict.published : dict.drafts}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onTogglePublish(lesson.id, !lesson.is_published)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          title={lesson.is_published ? dict.unpublish : dict.publish}
        >
          {lesson.is_published ? <ToggleRight className="h-3.5 w-3.5 text-green-400" /> : <ToggleLeft className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onDelete(lesson.id)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title={dict.delete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Module Card ──────────────────────────────────────────────────────────────

function ModuleCardComponent({
  module: mod,
  dict,
  locale,
  onToggleModulePublish,
  onToggleLessonPublish,
  onDeleteModule,
  onDeleteLesson,
  onAddLesson,
  onReorderLessons,
}: {
  module: CurriculumModule
  dict: CurriculumDict['curriculum']
  locale: Locale
  onToggleModulePublish: (id: string, published: boolean) => void
  onToggleLessonPublish: (id: string, published: boolean) => void
  onDeleteModule: (id: string) => void
  onDeleteLesson: (id: string) => void
  onAddLesson: (moduleId: string, pathId: string) => void
  onReorderLessons: (moduleId: string, lessonIds: string[]) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const title = locale === 'ar' ? mod.title_ar || mod.title_en : mod.title_en
  const description = locale === 'ar' ? mod.description_ar || mod.description_en : mod.description_en

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const lessonIds = mod.lessons.map((l) => l.id)

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = lessonIds.indexOf(active.id as string)
    const newIndex = lessonIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(lessonIds, oldIndex, newIndex)
    onReorderLessons(mod.id, newOrder)
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden transition-all hover:border-border/60">
      {/* Module Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Layers className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
          {description && <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{mod.lessons.length} {dict.lessons}</span>
          <span>•</span>
          <span>{mod.challenges.length} {dict.challenges}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mod.is_published ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
          {mod.is_published ? dict.published : dict.drafts}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onToggleModulePublish(mod.id, !mod.is_published)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            title={mod.is_published ? dict.unpublish : dict.publish}
          >
            {mod.is_published ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDeleteModule(mod.id)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title={dict.delete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Module Content (collapsible) */}
      {expanded && (
        <div className="border-t border-border/20 px-4 pb-4 pt-3 space-y-2">
          {/* Lessons with drag-and-drop */}
          {mod.lessons.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
              <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {mod.lessons.map((lesson) => (
                    <SortableItem key={lesson.id} id={lesson.id}>
                      <LessonItemRow
                        lesson={lesson}
                        dict={dict}
                        locale={locale}
                        onTogglePublish={onToggleLessonPublish}
                        onDelete={onDeleteLesson}
                      />
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-xs text-muted-foreground italic py-2 px-2">{dict.emptyModule}</p>
          )}

          {/* Module Challenge */}
          {mod.challenges.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {mod.challenges.map((ch) => (
                <ChallengeItemRow key={ch.id} challenge={ch} dict={dict} locale={locale} />
              ))}
            </div>
          )}

          {/* Add Lesson Button */}
          <button
            onClick={() => onAddLesson(mod.id, mod.learning_path_id)}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary/70 hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {dict.addLesson}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Learning Path Card ───────────────────────────────────────────────────────

function PathCard({
  path,
  dict,
  locale,
  onTogglePathActive,
  onToggleModulePublish,
  onToggleLessonPublish,
  onDeletePath,
  onDeleteModule,
  onDeleteLesson,
  onAddModule,
  onAddLesson,
  onReorderModules,
  onReorderLessons,
}: {
  path: CurriculumPath
  dict: CurriculumDict['curriculum']
  locale: Locale
  onTogglePathActive: (id: string, active: boolean) => void
  onToggleModulePublish: (id: string, published: boolean) => void
  onToggleLessonPublish: (id: string, published: boolean) => void
  onDeletePath: (id: string) => void
  onDeleteModule: (id: string) => void
  onDeleteLesson: (id: string) => void
  onAddModule: (pathId: string) => void
  onAddLesson: (moduleId: string, pathId: string) => void
  onReorderModules: (pathId: string, moduleIds: string[]) => void
  onReorderLessons: (moduleId: string, lessonIds: string[]) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const title = locale === 'ar' ? path.title_ar || path.title_en : path.title_en || path.title_ar
  const description = locale === 'ar' ? path.description_ar || path.description_en : path.description_en || path.description_ar

  const totalLessons = path.modules.reduce((s, m) => s + m.lessons.length, 0)
  const totalChallenges = path.modules.reduce((s, m) => s + m.challenges.length, 0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const moduleIds = path.modules.map((m) => m.id)

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = moduleIds.indexOf(active.id as string)
    const newIndex = moduleIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(moduleIds, oldIndex, newIndex)
    onReorderModules(path.id, newOrder)
  }

  return (
    <div className="admin-surface rounded-2xl overflow-hidden transition-all">
      {/* Path Header */}
      <div className="flex items-start gap-4 p-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <Route className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
            <h3 className="text-lg font-bold text-foreground truncate">{title || 'Untitled Path'}</h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${path.is_active ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
              {path.is_active ? dict.active : dict.inactive}
            </span>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {path.modules.length} {dict.modules}</span>
            <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {totalLessons} {dict.lessons}</span>
            <span className="flex items-center gap-1"><Sword className="h-3.5 w-3.5" /> {totalChallenges} {dict.challenges}</span>
            <span className="text-muted-foreground/50">slug: {path.slug}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onTogglePathActive(path.id, !path.is_active)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            title={path.is_active ? dict.unpublish : dict.publish}
          >
            {path.is_active ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => onDeletePath(path.id)}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title={dict.delete}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modules Section */}
      {expanded && (
        <div className="border-t border-border/20 px-6 pb-6 pt-4 space-y-3">
          {path.modules.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
              <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
                {path.modules.map((mod) => (
                  <SortableItem key={mod.id} id={mod.id}>
                    <ModuleCardComponent
                      module={mod}
                      dict={dict}
                      locale={locale}
                      onToggleModulePublish={onToggleModulePublish}
                      onToggleLessonPublish={onToggleLessonPublish}
                      onDeleteModule={onDeleteModule}
                      onDeleteLesson={onDeleteLesson}
                      onAddLesson={onAddLesson}
                      onReorderLessons={onReorderLessons}
                    />
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          ) : null}

          {/* Add Module Button */}
          <button
            onClick={() => onAddModule(path.id)}
            className="flex items-center gap-2 text-sm font-medium text-primary/70 hover:text-primary transition-colors mt-2"
          >
            <Plus className="h-4 w-4" />
            {dict.addModule}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Curriculum Manager ──────────────────────────────────────────────────

export function CurriculumManager({
  initialPaths,
  initialStats,
  dictionary,
  locale,
}: CurriculumManagerProps) {
  const dict = (dictionary as any).curriculum
  const [paths, setPaths] = useState<CurriculumPath[]>(initialPaths)
  const [stats, setStats] = useState<CurriculumStats>(initialStats)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'path' | 'module' | 'lesson' | 'challenge' | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [modalData, setModalData] = useState<any>(null)

  // ── Toast ────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Filter & Search ──────────────────────────────────────────────────────
  const filteredPaths = useMemo(() => {
    let result = paths

    if (filter === 'published') {
      result = result.filter((p) => p.is_active)
    } else if (filter === 'drafts') {
      result = result.filter((p) => !p.is_active)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) => {
        const pathMatch = (p.title_en?.toLowerCase().includes(q)) || (p.title_ar?.toLowerCase().includes(q)) || p.slug.toLowerCase().includes(q)
        const moduleMatch = p.modules.some(
          (m) => m.title_en.toLowerCase().includes(q) || m.title_ar?.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q)
        )
        const lessonMatch = p.modules.some((m) =>
          m.lessons.some((l) => l.title_en?.toLowerCase().includes(q) || l.title_ar?.toLowerCase().includes(q))
        )
        return pathMatch || moduleMatch || lessonMatch
      })
    }

    return result
  }, [paths, filter, searchQuery])

  // ── DnD sensors for paths ────────────────────────────────────────────────
  const pathSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const pathIds = filteredPaths.map((p) => p.id)

  async function handlePathDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = paths.findIndex((p) => p.id === active.id)
    const newIndex = paths.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newPaths = arrayMove(paths, oldIndex, newIndex).map((p, i) => ({ ...p, sort_order: i }))
    setPaths(newPaths)

    const result = await reorderPaths(newPaths.map((p) => p.id))
    if (result.error) {
      showToast(dict.reorderFailed, 'error')
      setPaths(paths) // revert
    }
  }

  // ── Module Reorder ───────────────────────────────────────────────────────
  const handleReorderModules = useCallback(async (pathId: string, moduleIds: string[]) => {
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id !== pathId) return p
        const reordered = moduleIds.map((id, i) => {
          const mod = p.modules.find((m) => m.id === id)!
          return { ...mod, sort_order: i }
        })
        return { ...p, modules: reordered }
      })
    )
    const result = await reorderModules(moduleIds)
    if (result.error) showToast(dict.reorderFailed, 'error')
  }, [dict.reorderFailed, showToast])

  // ── Lesson Reorder ───────────────────────────────────────────────────────
  const handleReorderLessons = useCallback(async (moduleId: string, lessonIds: string[]) => {
    setPaths((prev) =>
      prev.map((p) => ({
        ...p,
        modules: p.modules.map((m) => {
          if (m.id !== moduleId) return m
          const reordered = lessonIds.map((id, i) => {
            const lesson = m.lessons.find((l) => l.id === id)!
            return { ...lesson, sort_order: i }
          })
          return { ...m, lessons: reordered }
        }),
      }))
    )
    const result = await reorderLessons(lessonIds)
    if (result.error) showToast(dict.reorderFailed, 'error')
  }, [dict.reorderFailed, showToast])

  // ── Toggle Path Active ───────────────────────────────────────────────────
  const handleTogglePathActive = useCallback(async (id: string, active: boolean) => {
    setPaths((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: active } : p)))
    const result = await togglePathActive(id, active)
    if (result.error) {
      showToast(dict.toggleFailed, 'error')
      setPaths((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !active } : p)))
    } else {
      showToast(dict.toggleSuccess, 'success')
      setStats((s) => ({
        ...s,
        published: s.published + (active ? 1 : -1),
        drafts: s.drafts + (active ? -1 : 1),
      }))
    }
  }, [dict.toggleFailed, dict.toggleSuccess, showToast])

  // ── Toggle Module Published ──────────────────────────────────────────────
  const handleToggleModulePublish = useCallback(async (id: string, published: boolean) => {
    setPaths((prev) =>
      prev.map((p) => ({
        ...p,
        modules: p.modules.map((m) => (m.id === id ? { ...m, is_published: published } : m)),
      }))
    )
    const result = await toggleModulePublished(id, published)
    if (result.error) {
      showToast(dict.toggleFailed, 'error')
    } else {
      showToast(dict.toggleSuccess, 'success')
      setStats((s) => ({
        ...s,
        published: s.published + (published ? 1 : -1),
        drafts: s.drafts + (published ? -1 : 1),
      }))
    }
  }, [dict.toggleFailed, dict.toggleSuccess, showToast])

  // ── Toggle Lesson Published ──────────────────────────────────────────────
  const handleToggleLessonPublish = useCallback(async (id: string, published: boolean) => {
    setPaths((prev) =>
      prev.map((p) => ({
        ...p,
        modules: p.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === id ? { ...l, is_published: published } : l)),
        })),
      }))
    )
    const result = await toggleLessonPublished(id, published)
    if (result.error) {
      showToast(dict.toggleFailed, 'error')
    } else {
      showToast(dict.toggleSuccess, 'success')
      setStats((s) => ({
        ...s,
        published: s.published + (published ? 1 : -1),
        drafts: s.drafts + (published ? -1 : 1),
      }))
    }
  }, [dict.toggleFailed, dict.toggleSuccess, showToast])

  // ── Delete Path ──────────────────────────────────────────────────────────
  const handleDeletePath = useCallback(async (id: string) => {
    if (!confirm(dict.confirmDelete)) return
    const prev = paths
    setPaths((p) => p.filter((x) => x.id !== id))
    const result = await deleteLearningPath(id)
    if (result.error) {
      showToast(dict.deleteFailed, 'error')
      setPaths(prev)
    } else {
      showToast(dict.deleteSuccess, 'success')
      // Recalc stats after full page reload would be ideal, but we approximate
      const deleted = prev.find((p) => p.id === id)
      if (deleted) {
        const lessonsCount = deleted.modules.reduce((s, m) => s + m.lessons.length, 0)
        const challengesCount = deleted.modules.reduce((s, m) => s + m.challenges.length, 0)
        setStats((s) => ({
          ...s,
          totalPaths: s.totalPaths - 1,
          totalModules: s.totalModules - deleted.modules.length,
          totalLessons: s.totalLessons - lessonsCount,
          totalChallenges: s.totalChallenges - challengesCount,
        }))
      }
    }
  }, [dict.confirmDelete, dict.deleteFailed, dict.deleteSuccess, paths, showToast])

  // ── Delete Module ────────────────────────────────────────────────────────
  const handleDeleteModule = useCallback(async (id: string) => {
    if (!confirm(dict.confirmDelete)) return
    setPaths((prev) =>
      prev.map((p) => ({
        ...p,
        modules: p.modules.filter((m) => m.id !== id),
      }))
    )
    const result = await deleteModule(id)
    if (result.error) {
      showToast(dict.deleteFailed, 'error')
    } else {
      showToast(dict.deleteSuccess, 'success')
      setStats((s) => ({ ...s, totalModules: s.totalModules - 1 }))
    }
  }, [dict.confirmDelete, dict.deleteFailed, dict.deleteSuccess, showToast])

  // ── Delete Lesson ────────────────────────────────────────────────────────
  const handleDeleteLesson = useCallback(async (id: string) => {
    if (!confirm(dict.confirmDelete)) return
    setPaths((prev) =>
      prev.map((p) => ({
        ...p,
        modules: p.modules.map((m) => ({
          ...m,
          lessons: m.lessons.filter((l) => l.id !== id),
        })),
      }))
    )
    const result = await deleteLesson(id)
    if (result.error) {
      showToast(dict.deleteFailed, 'error')
    } else {
      showToast(dict.deleteSuccess, 'success')
      setStats((s) => ({ ...s, totalLessons: s.totalLessons - 1 }))
    }
  }, [dict.confirmDelete, dict.deleteFailed, dict.deleteSuccess, showToast])

  // ── Modals Handlers ──────────────────────────────────────────────────────
  const handleAddPath = useCallback(() => {
    setModalType('path')
    setModalMode('create')
    setModalData(null)
    setModalOpen(true)
  }, [])

  const handleAddModule = useCallback((pathId: string) => {
    setModalType('module')
    setModalMode('create')
    setModalData({ pathId })
    setModalOpen(true)
  }, [])

  const handleAddLesson = useCallback((moduleId: string, pathId: string) => {
    setModalType('lesson')
    setModalMode('create')
    setModalData({ moduleId, pathId })
    setModalOpen(true)
  }, [])

  const handleModalSuccess = useCallback(() => {
    // When a modal succeeds, we just reload the page to get the freshest tree 
    // rather than doing manual optimistic updates for complex nested forms.
    window.location.reload()
  }, [])

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 end-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
            : 'bg-red-500/15 text-red-400 border border-red-500/30'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <StatsBar stats={stats} dict={dict} />

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            placeholder={dict.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-card/30 py-2.5 ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1 mr-2">
            {(['all', 'published', 'drafts'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                {f === 'all' ? dict.filterAll : f === 'published' ? dict.filterPublished : dict.filterDrafts}
              </button>
            ))}
          </div>
          <button
            onClick={handleAddPath}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {dict.createPath}
          </button>
        </div>
      </div>

      {/* Path List with DnD */}
      {filteredPaths.length > 0 ? (
        <DndContext sensors={pathSensors} collisionDetection={closestCenter} onDragEnd={handlePathDragEnd}>
          <SortableContext items={pathIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {filteredPaths.map((path) => (
                <SortableItem key={path.id} id={path.id}>
                  <PathCard
                    path={path}
                    dict={dict}
                    locale={locale}
                    onTogglePathActive={handleTogglePathActive}
                    onToggleModulePublish={handleToggleModulePublish}
                    onToggleLessonPublish={handleToggleLessonPublish}
                    onDeletePath={handleDeletePath}
                    onDeleteModule={handleDeleteModule}
                    onDeleteLesson={handleDeleteLesson}
                    onAddModule={handleAddModule}
                    onAddLesson={handleAddLesson}
                    onReorderModules={handleReorderModules}
                    onReorderLessons={handleReorderLessons}
                  />
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="admin-surface rounded-2xl p-12 text-center">
          <Route className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">{dict.noPathsYet}</p>
        </div>
      )}

      {/* Modals */}
      <CurriculumModals
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        modalType={modalType}
        mode={modalMode}
        contextData={modalData}
        paths={paths}
        locale={locale}
        dictionary={dictionary}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
