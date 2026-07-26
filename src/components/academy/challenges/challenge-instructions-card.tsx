import { BookOpen, Target } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'

interface ChallengeInstructionsCardProps {
  dictionary: Dictionary
  scenario: string | null
  instructions: string | null
}

export function ChallengeInstructionsCard({
  dictionary,
  scenario,
  instructions,
}: ChallengeInstructionsCardProps) {
  if (!scenario && !instructions) return null

  return (
    <div className="space-y-6">
      {scenario && (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {dictionary.challengeLab.scenario}
            </h3>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {scenario}
          </div>
        </div>
      )}

      {instructions && (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {dictionary.challengeLab.instructions}
            </h3>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {instructions}
          </div>
        </div>
      )}
    </div>
  )
}
