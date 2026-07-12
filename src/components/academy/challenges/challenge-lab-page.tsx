import Link from 'next/link'
import { ArrowLeft, Zap, FileText, FlaskConical } from 'lucide-react'

import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { ChallengeLabResult } from '@/lib/academy/challenge-lab'

import { AcademyLayout } from '@/components/academy/academy-layout'
import { ChallengeInstructionsCard } from '@/components/academy/challenges/challenge-instructions-card'
import { BugReportForm } from '@/components/academy/challenges/bug-report-form'
import { MyChallengeReports } from '@/components/academy/challenges/my-challenge-reports'
import { LoginFormBugHuntLab } from '@/components/academy/challenges/login-form-bug-hunt-lab'

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
  const { challenge, previousReports } = data

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

  // Render the appropriate lab based on lab_template
  const renderLab = () => {
    switch (challenge.lab_template) {
      case 'login_form_bug_hunt':
        return <LoginFormBugHuntLab dictionary={dictionary} />
      default:
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border/50 bg-secondary/10">
            <FlaskConical className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium">
              {dictionary.challengeLab.unknownLab}
            </p>
          </div>
        )
    }
  }

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={username}>
      <div className="space-y-6">
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
                  {difficultyConf.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  {challenge.base_xp_reward} {dictionary.academy.xp}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
                {challenge.title}
              </h1>
              <div className="mt-4 prose prose-invert max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap">{challenge.description}</p>
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
              {renderLab()}
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
    </AcademyLayout>
  )
}
