import { type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChallengeStatProps {
  title: string
  value: number
  icon: ReactNode
}

export function ChallengeStat({ title, value, icon }: ChallengeStatProps) {
  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
      </CardContent>
    </Card>
  )
}
