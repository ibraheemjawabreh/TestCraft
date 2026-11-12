import Link from 'next/link'
import { ArrowRight, BookOpen, ChartNoAxesColumn, Clock3, Layers3, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormattedDate } from '@/components/ui/formatted-date'
import { getDictionary } from '@/i18n/get-dictionary'
import { getDisplayName } from '@/lib/auth/account-identity'
import { requireTester } from '@/lib/auth/require-tester'
import { localizedString } from '@/lib/i18n/content'
import { resolveLocale } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'

function firstRelated<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export const metadata = { robots: { index: false, follow: false } }

export default async function StudentHome({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale)
  const prefix = '/' + locale
  const ar = locale === 'ar'
  const t = ar ? {
    home: 'رئيسية الطالب', greeting: 'أهلًا،', introduction: 'تابع تعلّمك وراجع تقدّمك في مكان واحد.',
    continue: 'تابع التعلّم', recent: 'آخر درس فتحته', noRecent: 'ابدأ بمسار منشور وسيظهر آخر درس تفتحه هنا.',
    browse: 'استعرض مسارات التعلّم', progress: 'عرض التقدّم', paths: 'المسارات التي بدأتها',
    noPaths: 'ستظهر المسارات هنا عندما تسجّل فيها تقدّمًا.', lessons: 'الدروس المكتملة', xp: 'نقاط الخبرة',
    openLesson: 'فتح آخر درس', allPaths: 'كل المسارات',
  } : {
    home: 'Student Home', greeting: 'Welcome,', introduction: 'Pick up your learning and see how far you have come.',
    continue: 'Continue learning', recent: 'Last lesson opened', noRecent: 'Start a published path and your last lesson will appear here.',
    browse: 'Explore learning paths', progress: 'View progress', paths: 'Paths you have started',
    noPaths: 'Your paths will appear here as you record progress.', lessons: 'Completed lessons', xp: 'Experience points',
    openLesson: 'Open last lesson', allPaths: 'All paths',
  }
  const [dictionary, { user, profile }, db] = await Promise.all([
    getDictionary(locale), requireTester(locale, prefix + '/academy/home'), createClient(),
  ])
  const [recent, paths, completed] = await Promise.all([
    db.from('lesson_progress')
      .select('last_opened_at,lessons!inner(id,title,title_en,title_ar)')
      .eq('user_id', user.id).eq('lessons.is_published', true)
      .order('last_opened_at', { ascending: false, nullsFirst: false }).order('lesson_id')
      .limit(1).maybeSingle(),
    db.from('learning_path_progress')
      .select('completion_percentage,learning_paths!inner(id,slug,title,title_en,title_ar)')
      .eq('user_id', user.id).eq('learning_paths.is_active', true)
      .order('last_activity_at', { ascending: false, nullsFirst: false }).order('learning_path_id')
      .limit(6),
    db.from('lesson_progress').select('lesson_id', { count: 'exact', head: true })
      .eq('user_id', user.id).not('completed_at', 'is', null),
  ])
  const lastLesson = firstRelated(recent.data?.lessons)
  const started = paths.data ?? []
  const number = new Intl.NumberFormat(locale)
  const percent = new Intl.NumberFormat(locale, { style: 'percent' })
  const nextHref = prefix + (lastLesson || started.length > 0 ? '/learn' : '/learning-paths')

  return <div className="mx-auto max-w-5xl space-y-8">
    <header className="academy-hero rounded-2xl p-6 sm:p-9">
      <p className="mb-3 text-sm font-semibold text-primary">{t.home}</p>
      <h1 className="break-words font-heading text-3xl font-bold sm:text-5xl">{t.greeting} <bdi>{getDisplayName(user, profile.username, locale)}</bdi></h1>
      <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{t.introduction}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild><Link href={nextHref} prefetch={false}><BookOpen size={17} aria-hidden="true" />{lastLesson || started.length > 0 ? t.continue : t.browse}</Link></Button>
        <Button variant="outline" asChild><Link href={prefix + '/academy/progress'} prefetch={false}><ChartNoAxesColumn size={17} aria-hidden="true" />{t.progress}</Link></Button>
      </div>
    </header>

    <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
      <section aria-labelledby="recent-lesson" className="min-w-0 rounded-xl border bg-card p-5">
        <h2 id="recent-lesson" className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Clock3 size={18} className="text-primary" aria-hidden="true" />{t.recent}
        </h2>
        {lastLesson ? <>
          <p className="mt-3 break-words font-medium" dir="auto">{localizedString(lastLesson, locale, 'title', 'title')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <FormattedDate value={recent.data?.last_opened_at ?? null} locale={locale} fallback="—" dateStyle="medium" />
          </p>
          <Link className="mt-3 inline-flex items-center gap-2 rounded text-sm font-semibold text-primary hover:underline" prefetch={false}
            href={prefix + '/academy/lessons/' + lastLesson.id}>{t.openLesson}<ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" /></Link>
        </> : <p className="mt-3 text-sm text-muted-foreground" role={recent.error ? 'status' : undefined}>
          {recent.error ? dictionary.academy.failedToLoad : t.noRecent}
        </p>}
      </section>
      <dl className="grid grid-cols-2 gap-3">
        {[{ title: t.lessons, value: completed.count, icon: BookOpen }, { title: t.xp, value: profile.total_xp, icon: Zap }].map(({ title, value, icon: Icon }) =>
          <div key={title} className="min-w-0 rounded-xl border bg-card p-4">
            <Icon size={19} className="mb-2 text-primary" aria-hidden="true" />
            <dt className="text-sm text-muted-foreground">{title}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{value == null ? '—' : number.format(value)}</dd>
          </div>)}
      </dl>
    </div>

    <section aria-labelledby="started-paths" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="started-paths" className="flex items-center gap-2 font-heading text-xl font-semibold"><Layers3 size={19} className="text-primary" aria-hidden="true" />{t.paths}</h2>
        <Link href={prefix + '/learning-paths'} prefetch={false} className="rounded text-sm font-semibold text-primary hover:underline">{t.allPaths}</Link>
      </div>
      {started.length ? <ul className="grid gap-3 sm:grid-cols-2">{started.map(({ learning_paths: path, completion_percentage: completion }) => {
        const entry = firstRelated(path)
        if (!entry) return null
        const name = localizedString(entry, locale, 'title', 'title')
        return <li key={entry.id} className="min-w-0 rounded-xl border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <Link className="min-w-0 break-words rounded font-semibold hover:text-primary" dir="auto" prefetch={false}
              href={prefix + '/learning-paths/' + entry.slug}>{name}</Link>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{percent.format(completion / 100)}</span>
          </div>
          <progress className="mt-3 h-2 w-full accent-primary" aria-label={name} value={completion} max={100} />
        </li>
      })}</ul> : <p className="rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground" role={paths.error ? 'status' : undefined}>
        {paths.error ? dictionary.academy.failedToLoad : t.noPaths}
      </p>}
    </section>
  </div>
}
