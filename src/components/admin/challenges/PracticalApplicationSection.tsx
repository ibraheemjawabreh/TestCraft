'use client'

import { useFormContext } from 'react-hook-form'
import type { PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'
import type { Dictionary } from '@/i18n/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAllPracticalApps } from '@/lib/practical-challenges/registry'
import { FlaskConical } from 'lucide-react'

export function PracticalApplicationSection({ dictionary }: { dictionary: Dictionary }) {
  const form = useFormContext<PracticalChallengeFormValues>()
  const apps = getAllPracticalApps()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <CardTitle>Practical Application</CardTitle>
        </div>
        <CardDescription>
          Select the interactive application for this challenge. The tester will see a working version of this app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="practical_app_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Type</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value)
                  // Reset config and bugs when app changes
                  const app = apps.find(a => a.key === value)
                  if (app) {
                    form.setValue('practical_app_config', app.defaultConfig)
                    form.setValue('embedded_bugs', [])
                  }
                }} 
                value={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an application..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {apps.map(app => (
                    <SelectItem key={app.key} value={app.key}>
                      {app.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Changing the application type will reset its configuration and bugs.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
