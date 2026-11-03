'use client'
import type { z } from 'zod'
import type { practicalChallengeSchema } from '@/lib/validations/practical-challenge'

import { useFormContext } from 'react-hook-form'
import type { PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'
import type { Dictionary } from '@/i18n/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'

export function ChallengePublishSection({
  dictionary,
  isSubmitting,
  isEditMode
}: {
  dictionary: Dictionary
  isSubmitting: boolean
  isEditMode: boolean
}) {
  const form = useFormContext<z.input<typeof practicalChallengeSchema>, unknown, PracticalChallengeFormValues>()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Save className="h-5 w-5 text-primary" />
          <CardTitle>{dictionary.factory.builder.publishing}</CardTitle>
        </div>
        <CardDescription>{dictionary.factory.builder.publishHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap justify-end gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
            onClick={() => window.history.back()}
          >{dictionary.factory.builder.cancel}</Button>

          {!isEditMode ? (
            <>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
                onClick={() => form.setValue('is_active', false, { shouldDirty: true })}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dictionary.factory.builder.saveDraft}
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
                onClick={() => form.setValue('is_active', true, { shouldDirty: true })}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dictionary.factory.builder.publish}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
                onClick={() => form.setValue('is_active', false, { shouldDirty: true })}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dictionary.factory.builder.unpublish}
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
                onClick={() => form.setValue('is_active', true, { shouldDirty: true })}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dictionary.factory.builder.update}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
