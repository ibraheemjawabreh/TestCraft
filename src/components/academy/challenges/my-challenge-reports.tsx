import { BookOpen } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Database } from '@/types/database.types'

type BugReport = Database['public']['Tables']['bug_reports']['Row']

interface MyChallengeReportsProps {
  dictionary: Dictionary
  reports: BugReport[]
}

export function MyChallengeReports({ dictionary, reports }: MyChallengeReportsProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {dictionary.challengeLab.myReports}
        </h3>
      </div>

      {reports && reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-lg border border-border/50 bg-background/40 p-3"
            >
              <p className="text-sm font-medium text-foreground truncate" title={report.title}>
                {report.title}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span 
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    report.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    report.status === 'Reviewed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    report.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    'bg-secondary/50 text-muted-foreground'
                  }`}
                >
                  {report.status ? dictionary.challengeLab[report.status.toLowerCase() as 'pending' | 'reviewed' | 'rejected'] : report.status}
                </span>
                
                <span className="text-muted-foreground">
                  {new Date(report.created_at ?? '').toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground bg-secondary/30 p-4 rounded-lg border border-dashed border-border/50 text-center">
          {dictionary.challengeLab.noReports}
        </p>
      )}
    </div>
  )
}
