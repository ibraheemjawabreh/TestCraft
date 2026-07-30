'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, RefreshCw, Database, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AdminDashboardStats } from '@/lib/admin/dashboard'

interface MVPChecklistProps {
  stats: AdminDashboardStats
}

export function MVPChecklist({ stats }: MVPChecklistProps) {
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const items = [
    { label: 'Learning Path exists', isReady: stats.totalPaths > 0, info: `${stats.totalPaths} active path(s)` },
    { label: 'Learning Modules exist', isReady: stats.totalModules > 0, info: `${stats.totalModules} published module(s)` },
    { label: 'Lessons exist', isReady: stats.totalLessons > 0, info: `${stats.totalLessons} published lesson(s)` },
    { label: 'Practical Challenges exist', isReady: stats.totalChallenges > 0, info: `${stats.totalChallenges} active challenge(s)` },
    { label: 'Challenges Published', isReady: stats.activeChallenges > 0, info: 'Ready for testers' },
    { label: 'Practical Apps Linked', isReady: stats.totalChallenges > 0, info: 'login_form app configured' },
    { label: 'Review Queue Ready', isReady: true, info: `${stats.pendingReviews} pending review(s)` },
    { label: 'XP Reward System', isReady: true, info: 'Idempotency protected' },
  ]

  const totalReady = items.filter((i) => i.isReady).length
  const allReady = totalReady === items.length

  const handleSeed = async () => {
    setSeeding(true)
    setSeedMessage(null)
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      const data = await res.json()
      setSeedMessage(data.message || 'Seeder completed.')
      if (data.success) {
        window.location.reload()
      }
    } catch (err) {
      setSeedMessage('Failed to trigger seeder.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <Card className="border-border/50 bg-card/70 backdrop-blur-xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-amber-500" />
            MVP System Readiness
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {totalReady} of {items.length} checklist checks passing
          </p>
        </div>
        <Button
          onClick={handleSeed}
          disabled={seeding}
          size="sm"
          variant="outline"
          className="gap-2 border-primary/30 hover:bg-primary/10"
        >
          {seeding ? (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Database className="h-4 w-4 text-primary" />
          )}
          {seeding ? 'Seeding...' : 'Seed Demo Curriculum'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {seedMessage && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-xs text-foreground font-medium">
            {seedMessage}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                item.isReady
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
              }`}
            >
              {item.isReady ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.info}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
