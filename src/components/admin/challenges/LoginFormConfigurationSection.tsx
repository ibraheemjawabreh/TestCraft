'use client'
import type { z } from 'zod'
import type { practicalChallengeSchema } from '@/lib/validations/practical-challenge'

import { useFormContext } from 'react-hook-form'
import type { PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'
import type { Dictionary } from '@/i18n/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Settings2 } from 'lucide-react'

export function LoginFormConfigurationSection({ dictionary }: { dictionary: Dictionary }) {
  const form = useFormContext<z.input<typeof practicalChallengeSchema>, unknown, PracticalChallengeFormValues>()
  const appKey = form.watch('practical_app_key')

  if (appKey !== 'login_form') return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle>{dictionary.factory.builder.settings}</CardTitle>
        </div>
        <CardDescription>{dictionary.factory.builder.settingsHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="practical_app_config.passwordMinLength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dictionary.factory.builder.minPassword}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  value={field.value as number || 8}
                  onChange={e => field.onChange(parseInt(e.target.value, 10))}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="practical_app_config.validEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dictionary.factory.builder.email}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  {...field}
                  value={(field.value as string) || 'qa.tester@testcraft.dev'}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormDescription>{dictionary.factory.builder.emailHint}</FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="practical_app_config.validPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dictionary.factory.builder.password}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  {...field}
                  value={(field.value as string) || 'Test@12345'}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormDescription>{dictionary.factory.builder.passwordHint}</FormDescription>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
