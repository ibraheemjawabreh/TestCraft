import Link from 'next/link'
import { ArrowLeft, Zap, FileText, FlaskConical } from 'lucide-react'

import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { ChallengeLabResult } from '@/lib/academy/challenge-lab'

import dynamic from 'next/dynamic'
import { AcademyLayout } from '@/components/academy/academy-layout'
import { ChallengeInstructionsCard } from '@/components/academy/challenges/challenge-instructions-card'
import { MyChallengeReports } from '@/components/academy/challenges/my-challenge-reports'
import { PracticalAppRenderer } from '@/components/practical-apps/PracticalAppRenderer'

const BugReportForm = dynamic(
  () => import('@/components/academy/challenges/bug-report-form').then(mod => mod.BugReportForm),
  { ssr: false }
)

interface ChallengeLabPageProps {
  data: ChallengeLabResult
  dictionary: Dictionary
  locale: Locale
  username: string
}

export function ChallengeLabPage({
  data,
  dictionary,
  locale,
  username,
}: ChallengeLabPageProps) {
  const { challenge, previousReports, activeBugs } = data

  const DIFFICULTY_CONFIG = {
    Beginner: {
      label: dictionary.academy.beginner,
      colorClass: 'text-green-400 bg-green-500/10 border-green-500/20',
    },
    Intermediate: {
      label: dictionary.academy.intermediate,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    Advanced: {
      label: dictionary.academy.advanced,
      colorClass: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
  } as const

  const difficultyConf = DIFFICULTY_CONFIG[challenge.difficulty]

  return (
    <div key={challenge.id} className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href={`/${locale}/academy/challenges`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {dictionary.academy.backToChallenges}
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Challenge Header */}
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
            <div className="flex flex-wrap gap-3 mb-4">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${difficultyConf.colorClass}`}
              >
                <span>{difficultyConf.label}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{challenge.base_xp_reward} {dictionary.academy.xp}</span>
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
              {challenge.title}
            </h1>
            <div className="mt-4 prose prose-invert max-w-none text-muted-foreground">
              <div className="whitespace-pre-wrap">{challenge.description}</div>
            </div>
          </div>

          {/* Scenario and Instructions */}
          <ChallengeInstructionsCard 
            dictionary={dictionary} 
            scenario={challenge.scenario} 
            instructions={challenge.instructions} 
          />

          {/* The Lab Environment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                {dictionary.challengeLab.lab}
              </h2>
            </div>
            
            {challenge.practical_app_key === 'login_form' && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm mb-4">
                <p className="font-semibold mb-2 text-foreground">
                  <span>{locale === 'ar' ? 'بيانات الدخول لبيئة الاختبار:' : 'Test Environment Credentials:'}</span>
                </p>
                <ul className="list-inside space-y-1 text-muted-foreground" style={{ listStyleType: 'disc' }}>
                  <li>
                    <span>{locale === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</span>{' '}
                    <span className="font-mono text-foreground px-1 bg-background rounded border border-border/50">
                      {(challenge.practical_app_config as any)?.validEmail || 'qa.tester@testcraft.dev'}
                    </span>
                  </li>
                  <li>
                    <span>{locale === 'ar' ? 'كلمة المرور:' : 'Password:'}</span>{' '}
                    <span className="font-mono text-foreground px-1 bg-background rounded border border-border/50">
                      {(challenge.practical_app_config as any)?.validPassword || 'Test@12345'}
                    </span>
                  </li>
                </ul>
              </div>
            )}

            <PracticalAppRenderer 
              appKey={challenge.practical_app_key}
              config={challenge.practical_app_config}
              activeBugs={activeBugs}
              dictionary={dictionary}
              locale={locale}
            />
          </div>

          {/* Submit Report Form */}
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
            <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                {dictionary.challengeLab.submitBugReport}
              </h2>
            </div>
            
            <BugReportForm 
              challengeId={challenge.id} 
              labTemplateId={null}
              dictionary={dictionary}
            />
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MyChallengeReports dictionary={dictionary} reports={previousReports} locale={locale} />
        </div>
      </div>
    </div>
  )
}
