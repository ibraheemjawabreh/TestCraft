'use client'

import { useFormContext } from 'react-hook-form'
import type { PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'
import type { Locale } from '@/i18n/config'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bug, AlertTriangle } from 'lucide-react'
import { getPracticalAppDefinition } from '@/lib/practical-challenges/registry'

type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical'

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  Low: 'text-blue-400',
  Medium: 'text-amber-400',
  High: 'text-orange-400',
  Critical: 'text-red-400',
}

export function IntentionalBugsSection({ locale }: { locale: Locale }) {
  const form = useFormContext<PracticalChallengeFormValues>()
  const appKey = form.watch('practical_app_key')

  if (!appKey) return null

  const appDef = getPracticalAppDefinition(appKey)
  if (!appDef) return null

  const isAr = locale === 'ar'
  const currentBugs = form.watch('embedded_bugs') || []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-destructive" />
          <CardTitle>{isAr ? 'الأخطاء المقصودة' : 'Intentional Bugs'}</CardTitle>
        </div>
        <CardDescription>
          {isAr
            ? 'اختر الأخطاء التي تريد تفعيلها في هذا التحدي. يجب تفعيل خطأ واحد على الأقل قبل النشر.'
            : 'Select the bugs to activate in this challenge. At least one bug is required before publishing.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {appDef.bugPresets.map((preset) => {
            const isSelected = currentBugs.some(b => b.bug_key === preset.key)
            const bugData = currentBugs.find(b => b.bug_key === preset.key)
            const title = isAr ? preset.titleAr : preset.titleEn
            const description = isAr ? preset.descriptionAr : preset.descriptionEn

            return (
              <div
                key={preset.key}
                className={`rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-border/50 bg-card/50 hover:border-border'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                    <h4 className="text-base font-semibold text-foreground leading-tight">
                      {title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Label htmlFor={`bug-${preset.key}`} className="text-sm font-medium">
                      {isSelected ? (isAr ? 'مفعل' : 'Enabled') : (isAr ? 'معطل' : 'Disabled')}
                    </Label>
                    <Switch
                      id={`bug-${preset.key}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          form.setValue('embedded_bugs', [
                            ...currentBugs,
                            {
                              bug_key: preset.key,
                              bug_title: preset.titleEn,
                              description: preset.descriptionEn,
                              actual_severity: preset.actual_severity,
                              bonus_xp: preset.bonus_xp,
                              is_active: true,
                            },
                          ])
                        } else {
                          form.setValue(
                            'embedded_bugs',
                            currentBugs.filter(b => b.bug_key !== preset.key)
                          )
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Inline controls when selected */}
                    {isSelected && (
                      <div className="mt-3 flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-3.5 w-3.5 ${SEVERITY_COLORS[bugData?.actual_severity as SeverityLevel || preset.actual_severity]}`} />
                          <Select
                            value={bugData?.actual_severity || preset.actual_severity}
                            onValueChange={(val) => {
                              form.setValue(
                                'embedded_bugs',
                                currentBugs.map(b =>
                                  b.bug_key === preset.key
                                    ? { ...b, actual_severity: val as SeverityLevel }
                                    : b
                                )
                              )
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">+</span>
                          <Input
                            type="number"
                            min={0}
                            max={1000}
                            className="h-7 text-xs w-20"
                            value={bugData?.bonus_xp ?? preset.bonus_xp ?? ''}
                            onChange={(e) => {
                              const rawVal = e.target.value
                              const val = rawVal === '' ? '' : parseInt(rawVal, 10)
                              form.setValue(
                                'embedded_bugs',
                                currentBugs.map(b =>
                                  b.bug_key === preset.key ? { ...b, bonus_xp: val as number } : b
                                )
                              )
                            }}
                          />
                          <span className="text-xs text-muted-foreground">XP</span>
                        </div>
                      </div>
                    )}
              </div>
            )
          })}
        </div>

        {currentBugs.length === 0 && (
          <p className="text-xs text-amber-500 mt-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {isAr
              ? 'يجب تفعيل خطأ واحد على الأقل قبل نشر التحدي.'
              : 'At least one bug must be enabled before publishing.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
