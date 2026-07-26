'use client'

import { useFormContext } from 'react-hook-form'
import type { PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'
import type { Dictionary } from '@/i18n/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, RotateCcw, Flag } from 'lucide-react'
import { PracticalAppRenderer } from '@/components/practical-apps/PracticalAppRenderer'

export function ChallengeTesterPreview({ dictionary, locale }: { dictionary: Dictionary, locale: 'en' | 'ar' }) {
  const form = useFormContext<PracticalChallengeFormValues>()
  const appKey = form.watch('practical_app_key')
  const config = form.watch('practical_app_config') as any
  const embeddedBugs = form.watch('embedded_bugs') || []
  
  const title = form.watch(locale === 'ar' ? 'title_ar' : 'title_en') || 'Challenge Title'
  const difficulty = form.watch('difficulty') || 'Beginner'
  const xp = form.watch('base_xp_reward') || 0
  const scenario = form.watch(locale === 'ar' ? 'scenario_ar' : 'scenario_en') || 'Scenario goes here...'
  const instructions = form.watch(locale === 'ar' ? 'instructions_ar' : 'instructions_en') || 'Instructions go here...'

  if (!appKey) return null

  // Extract just the keys for the renderer
  const activeBugs = embeddedBugs.map(b => b.bug_key)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <CardTitle>Tester Preview</CardTitle>
        </div>
        <CardDescription>
          This is exactly what the tester will see and interact with. Test the bugs here before publishing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-6 bg-secondary/10 border border-border/50 rounded-xl space-y-8">
          
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground font-medium">
              <span>{difficulty}</span>
              <span>&bull;</span>
              <span>{xp} XP</span>
            </div>
          </div>

          {/* Scenario & Instructions */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-1">Mission:</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scenario}</p>
            </div>
            {instructions && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-1">Instructions:</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{instructions}</p>
              </div>
            )}
          </div>

          {/* Test Account */}
          {(config?.validEmail || config?.validPassword) && (
            <div className="p-4 bg-card border rounded-lg">
              <h3 className="text-sm font-bold text-foreground mb-2">Test Account:</h3>
              <div className="space-y-1 text-sm font-mono text-muted-foreground">
                {config.validEmail && <div>Email: {config.validEmail}</div>}
                {config.validPassword && <div>Password: {config.validPassword}</div>}
              </div>
            </div>
          )}

          {/* The App */}
          <div className="py-4 border-y border-border/50">
            <PracticalAppRenderer
              appKey={appKey}
              config={config}
              activeBugs={activeBugs}
              dictionary={dictionary}
              locale={locale}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" type="button">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Application
            </Button>
            <Button variant="default" type="button" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Flag className="h-4 w-4 mr-2" />
              Report a Bug
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}
