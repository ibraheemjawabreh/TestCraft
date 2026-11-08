import Link from 'next/link'
import type { Metadata } from 'next'
import { Activity, Award, BookOpen, FileText, Layers, Pencil, Zap } from 'lucide-react'
import { AcademyLayout } from '@/components/academy/academy-layout'
import { BadgesPreview } from '@/components/academy/badges-preview'
import { AccountAvatar } from '@/components/layout/account-avatar'
import { accountCopy } from '@/i18n/account-copy'
import { getDictionary } from '@/i18n/get-dictionary'
import { getTesterBadges } from '@/lib/academy/badges'
import { accountIdentity, isGeneratedUsername } from '@/lib/auth/account-identity'
import { requireTester } from '@/lib/auth/require-tester'
import { resolveLocale } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  return { title: accountCopy(locale).profile, robots: { index: false } }
}

export default async function ProfilePage({ params }: Props) {
  const locale = resolveLocale((await params).locale)
  const prefix = '/' + locale
  const [dictionary, { user, profile }] = await Promise.all([
    getDictionary(locale), requireTester(locale, prefix + '/profile'),
  ])
  const labels = accountCopy(locale)
  const account = accountIdentity(user, profile, locale)
  const db = await createClient()
  const [lessons, paths, badges] = await Promise.all([
    db.from('lesson_progress').select('lesson_id', { count: 'exact', head: true })
      .eq('user_id', user.id).not('completed_at', 'is', null),
    db.from('learning_path_progress').select('learning_path_id', { count: 'exact', head: true }).eq('user_id', user.id),
    getTesterBadges(user.id),
  ])
  const format = new Intl.NumberFormat(locale)
  const metrics = [
    { label: labels.lessons, value: lessons.count, icon: BookOpen },
    { label: labels.paths, value: paths.count, icon: Layers },
    { label: labels.xp, value: profile.total_xp, icon: Zap },
    { label: labels.badges, value: badges.data?.length ?? null, icon: Award },
  ]
  const history = [
    { label: labels.reports, href: '/academy/reports', icon: FileText },
    { label: labels.activity, href: '/academy/activity', icon: Activity },
    { label: labels.workspace, href: '/academy', icon: BookOpen },
  ]
  const customUsername = profile.username.trim() && !isGeneratedUsername(profile.username, user.id)

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} account={account}>
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-2xl border border-[#79603b]/40 bg-[#171719] px-5 py-8 text-[#fbf7ed] sm:px-8 sm:py-10"
          style={{ backgroundImage: 'radial-gradient(ellipse at 95% 0%, #543720 0%, transparent 58%)' }}>
          <p className="mb-5 text-xs font-bold uppercase tracking-wider text-[#ffbb70]">{labels.profile}</p>
          <div className="flex flex-wrap items-center gap-5">
            <AccountAvatar name={account.name} src={account.avatar} className="size-20 text-2xl ring-2 ring-[#a87445] sm:size-24" />
            <div className="min-w-0 flex-1 basis-44">
              <h1 dir="auto" className="break-words font-heading text-3xl font-bold sm:text-4xl">{account.name}</h1>
              <p className="mt-2 text-sm text-[#c3beb4]">{labels.learner}
                {customUsername && <> · <bdi>@{profile.username}</bdi></>}
              </p>
            </div>
            <Link href={prefix + '/settings'} prefetch={false}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ffbb70] px-4 text-sm font-semibold text-[#1b130b] hover:bg-[#ffd39f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffbb70]">
              <Pencil size={16} aria-hidden="true" />{labels.edit}
            </Link>
          </div>
        </section>

        <section aria-labelledby="learning-overview" className="space-y-3">
          <h2 id="learning-overview" className="font-heading text-xl font-semibold">{labels.overview}</h2>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon }) => value === null ? null : (
              <div className="rounded-xl border border-border bg-card p-4" key={label}>
                <dt className="flex items-start gap-2 text-sm leading-snug text-muted-foreground">
                  <Icon size={17} className="shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />{label}
                </dt>
                <dd className="mt-2 text-2xl font-bold">{format.format(value)}</dd>
              </div>
            ))}
          </dl>
          {(lessons.error || paths.error) && <p role="status" className="text-sm text-muted-foreground">{dictionary.academy.failedToLoad}</p>}
        </section>

        {badges.data ? (
          <BadgesPreview badges={badges.data} dictionary={dictionary} locale={locale}
            title={labels.badges} emptyMessage={labels.badgeHint} />
        ) : (
          <section aria-label={labels.badges} className="rounded-xl border border-border p-4">
            <p role="status" className="text-sm text-muted-foreground">{dictionary.academy.failedToLoad}</p>
          </section>
        )}

        <section className="space-y-3 border-t border-border pt-5" aria-labelledby="learning-history">
          <h2 id="learning-history" className="font-heading text-xl font-semibold">{labels.history}</h2>
          <ul className="flex flex-wrap gap-3">
            {history.map(({ label, href, icon: Icon }) => <li key={href}>
              <Link href={prefix + href} prefetch={false}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <Icon size={16} aria-hidden="true" />{label}
              </Link>
            </li>)}
          </ul>
        </section>
      </div>
    </AcademyLayout>
  )
}
