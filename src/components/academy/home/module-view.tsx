import Link from 'next/link'
import {
  CheckCircle2, Lock, BookOpen, ChevronRight,
  Circle, Zap, Trophy, Clock, PlayCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LearningPathWithModules, ModuleWithProgress, LessonWithProgress } from '@/lib/academy/services/ModuleService'

interface ModuleViewProps {
  pathData: LearningPathWithModules
  dictionary: Dictionary
  locale: Locale
  username: string
}

function LessonRow({ lesson, locale, isModuleLocked }: {
  lesson: LessonWithProgress
  locale: Locale
  isModuleLocked: boolean
}) {
  const locked = isModuleLocked
  const completed = lesson.is_completed

  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 ease-smooth ${
      locked
        ? 'opacity-50 cursor-not-allowed'
        : completed
        ? 'bg-emerald-500/5 hover:bg-emerald-500/10 hover:translate-x-0.5'
        : 'bg-background/40 hover:bg-background/60 hover:translate-x-0.5 cursor-pointer'
    }`}>
      <div className="shrink-0">
        {locked ? (
          <Lock className="h-4 w-4 text-muted-foreground/50" />
        ) : completed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : lesson.status === 'in_progress' ? (
          <PlayCircle className="h-4 w-4 text-primary" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/70" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {locked ? (
          <span className="text-sm font-medium text-muted-foreground/60">{lesson.title}</span>
        ) : (
          <Link prefetch={false}
            href={`/${locale}/academy/lessons/${lesson.id}`}
            className={`text-sm font-medium ${completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground hover:text-primary transition-colors'}`}
          >
            {lesson.title}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">{lesson.estimated_minutes}{locale === 'ar' ? ' د' : 'm'}</span>
      </div>
    </div>
  )
}

function ChallengeRow({ challenge, locale, isModuleLocked }: {
  challenge: NonNullable<ModuleWithProgress['challenge']>
  locale: Locale
  isModuleLocked: boolean
}) {
  const ar = locale === 'ar'
  const locked = isModuleLocked || challenge.status === 'locked'
  const completed = challenge.status === 'completed' || challenge.status === 'approved'
  const submitted = challenge.status === 'submitted'

  const statusBadge = () => {
    if (completed) return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">{ar ? 'تم الاجتياز' : 'Passed'}</Badge>
    if (submitted) return <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">{ar ? 'قيد المراجعة' : 'Under review'}</Badge>
    if (challenge.status === 'rejected') return <Badge variant="outline" className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs">{ar ? 'أعد المحاولة' : 'Retry'}</Badge>
    if (challenge.status === 'available') return <Badge variant="outline" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">{ar ? 'جاهز' : 'Ready'}</Badge>
    return null
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ease-smooth mt-1 ${
      locked
        ? 'opacity-50 border-border/30 cursor-not-allowed'
        : completed
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : challenge.status === 'available' || challenge.status === 'in_progress' || challenge.status === 'rejected'
        ? 'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:translate-x-0.5 cursor-pointer'
        : 'border-border/50 bg-background/30'
    }`}>
      <Zap className={`h-4 w-4 shrink-0 ${locked ? 'text-muted-foreground/40' : completed ? 'text-emerald-500' : 'text-primary'}`} />
      <div className="flex-1 min-w-0">
        {locked || submitted || completed ? (
          <span className={`text-sm font-semibold ${locked ? 'text-muted-foreground/60' : 'text-foreground'}`}>
            {challenge.title}
          </span>
        ) : (
          <Link prefetch={false}
            href={`/${locale}/academy/challenges/${challenge.id}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {challenge.title}
          </Link>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{ar ? 'تحدّي الوحدة' : 'Module challenge'}</p>
      </div>
      <div className="shrink-0">{statusBadge()}</div>
    </div>
  )
}

function ModuleCard({ mod, locale }: {
  mod: ModuleWithProgress
  locale: Locale
}) {
  const ar = locale === 'ar'
  const locked = mod.status === 'locked'
  const completed = mod.status === 'completed'
  const active = mod.status === 'in_progress' || mod.status === 'available'

  return (
    <div className={`rounded-2xl border transition-all duration-300 ease-smooth overflow-hidden card-glow-hover ${
      locked
        ? 'border-border/30 bg-card/30 opacity-70'
        : completed
        ? 'border-emerald-500/20 bg-emerald-500/3 shadow-sm'
        : active
        ? 'border-primary/25 bg-card/70 shadow-md ring-1 ring-primary/10'
        : 'border-border/60 bg-card/70 shadow-md'
    }`}>
      {/* Module Header */}
      <div className={`flex items-center gap-4 px-6 py-4 ${
        completed ? 'bg-emerald-500/5' : active ? 'bg-primary/3' : ''
      }`}>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
          locked
            ? 'border-muted-foreground/20 bg-muted/30'
            : completed
            ? 'border-emerald-500/50 bg-emerald-500/10'
            : 'border-primary/40 bg-primary/10'
        }`}>
          {locked ? (
            <Lock className="h-4 w-4 text-muted-foreground/50" />
          ) : completed ? (
            <Trophy className="h-4 w-4 text-emerald-500" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-heading font-bold text-base ${locked ? 'text-muted-foreground/60' : 'text-foreground'}`}>
              {mod.title}
            </h3>
            {completed && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                {ar ? 'مكتملة' : 'Completed'}
              </Badge>
            )}
            {locked && (
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/20">
                {ar ? 'مقفلة' : 'Locked'}
              </Badge>
            )}
          </div>
          {mod.description && !locked && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{mod.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!locked && mod.total_lessons > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              {mod.completed_lessons}/{mod.total_lessons}
            </div>
          )}
          {!locked && mod.total_lessons > 0 && (
            <div className="w-16 h-1.5 progress-bar-track bg-muted overflow-hidden hidden sm:block">
              <div
                className={`progress-bar-fill ${completed ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${mod.completion_percentage}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Module Content — lessons and challenge */}
      {!locked && (
        <div className="px-4 pb-4 pt-1 space-y-1">
          {mod.lessons.map(lesson => (
            <LessonRow key={lesson.id} lesson={lesson} locale={locale} isModuleLocked={false} />
          ))}
          {mod.challenge && (
            <ChallengeRow challenge={mod.challenge} locale={locale} isModuleLocked={false} />
          )}
        </div>
      )}

      {/* Locked placeholder */}
      {locked && (
        <div className="px-6 pb-4 pt-1">
          <p className="text-xs text-muted-foreground/60">
            {ar ? 'أكمل الوحدة السابقة لفتح هذه الوحدة.' : 'Complete the previous module to unlock it.'}
          </p>
        </div>
      )}
    </div>
  )
}

export function ModuleView({ pathData, dictionary, locale, username }: ModuleViewProps) {
  const ar = locale === 'ar'
  const activeModule = pathData.modules.find(m => m.status === 'in_progress' || m.status === 'available')
  const currentLesson = activeModule?.lessons.find(l => l.status === 'in_progress' || l.status === 'not_started')

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="academy-hero space-y-2 rounded-2xl p-6 sm:p-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {dictionary.academy.home.title.replace('{username}', username)}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{dictionary.academy.home.subtitle}</p>
      </div>

      {/* Continue Learning Card */}
      {activeModule && currentLesson && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between gap-4 flex-wrap shadow-sm card-glow-hover academy-practice-card">
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary/70 uppercase tracking-wide flex items-center gap-1.5">
              <PlayCircle className="h-3.5 w-3.5 animate-subtle-bounce" />
              {ar ? 'تابع التعلّم' : 'Continue Learning'}
            </p>
            <p className="font-heading font-bold text-lg text-foreground">{currentLesson.title}</p>
            <p className="text-sm text-muted-foreground">{activeModule.title}</p>
          </div>
          <Link prefetch={false}
            href={`/${locale}/academy/lessons/${currentLesson.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all duration-300 ease-smooth hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] shrink-0"
          >
            {ar ? 'افتح الدرس' : 'Open Lesson'}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      )}

      {/* Path Progress Bar */}
      <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3 card-glow-hover">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">{pathData.title}</span>
          <span className="text-muted-foreground">
            {pathData.completed_modules}/{pathData.total_modules} {ar ? 'وحدات' : 'modules'} · {pathData.completion_percentage}%
          </span>
        </div>
        <div className="w-full h-2.5 progress-bar-track bg-muted">
          <div
            className="progress-bar-fill bg-gradient-to-r from-primary/80 to-primary"
            style={{ width: `${pathData.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {pathData.modules.map(mod => (
          <ModuleCard key={mod.id} mod={mod} locale={locale} />
        ))}
        {pathData.modules.length === 0 && (
          <div className="rounded-2xl border border-border/40 bg-card/40 p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{ar ? 'لا توجد وحدات متاحة بعد.' : 'No modules are available yet.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
