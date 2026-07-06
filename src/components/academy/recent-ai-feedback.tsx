import { Bot, Zap } from 'lucide-react'
import { AcademyEmptyState } from './academy-empty-state'
import type { Dictionary } from '@/i18n/types'
import type { EvaluationWithReport } from '@/lib/academy/evaluations'

interface RecentAiFeedbackProps {
  evaluations: EvaluationWithReport[]
  dictionary: Dictionary
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100)
  const colorClass =
    pct >= 80
      ? 'text-green-400 bg-green-500/10 border-green-500/20'
      : pct >= 50
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-red-400 bg-red-500/10 border-red-500/20'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {pct}%
    </span>
  )
}

export function RecentAiFeedback({ evaluations, dictionary }: RecentAiFeedbackProps) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {dictionary.academy.recentAiFeedback}
        </h2>
      </div>

      {evaluations.length === 0 ? (
        <AcademyEmptyState
          icon={Bot}
          message={dictionary.academy.noFeedback}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {evaluations.map((evaluation) => {
            const feedbackExcerpt =
              evaluation.quality_feedback.length > 140
                ? `${evaluation.quality_feedback.slice(0, 140)}…`
                : evaluation.quality_feedback

            return (
              <div
                key={evaluation.id}
                className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl"
              >
                {/* Decorative */}
                <div
                  aria-hidden="true"
                  className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-cyan-500/8 blur-xl pointer-events-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                    <Bot className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  </div>
                  <ScoreBadge score={evaluation.ai_score} />
                </div>

                {evaluation.report_title && (
                  <p className="text-sm font-medium text-foreground truncate">
                    {evaluation.report_title}
                  </p>
                )}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feedbackExcerpt}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Zap className="h-3 w-3" aria-hidden="true" />
                    +{evaluation.earned_xp} {dictionary.academy.xp}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(evaluation.evaluated_at)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
