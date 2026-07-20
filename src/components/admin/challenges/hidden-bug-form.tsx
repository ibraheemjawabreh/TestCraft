'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { hiddenBugSchema, type HiddenBugFormValues } from '@/lib/validations/challenge'
import type { Database } from '@/types/database.types'
import type { Locale } from '@/i18n/config'

type HiddenBug = Database['public']['Tables']['hidden_bugs']['Row']

interface BugDictionary {
  bugTitle: string
  actualSeverity: string
  bonusXp: string
  addHiddenBug: string
  editHiddenBug: string
  saveChallenge: string
  somethingWentWrong: string
  bugIdentifier?: string
  description?: string
  active?: string
}

interface ValidationDictionary {
  [key: string]: string
}

interface HiddenBugFormProps {
  mode: 'create' | 'edit'
  bug?: HiddenBug
  challengeId: string
  dictionary: BugDictionary
  validationDictionary: ValidationDictionary
  locale: Locale
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HiddenBugForm({
  mode,
  bug,
  challengeId,
  dictionary,
  validationDictionary,
  locale,
  open,
  onOpenChange,
}: HiddenBugFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<HiddenBugFormValues>({
    resolver: zodResolver(hiddenBugSchema),
    defaultValues: {
      bug_title: bug?.bug_title ?? '',
      actual_severity: bug?.actual_severity ?? 'Medium',
      bonus_xp: bug?.bonus_xp ?? 50,
      description: bug?.description ?? '',
      bug_identifier: bug?.bug_identifier ?? '',
      is_active: bug?.is_active ?? true,
    },
  })

  const { isSubmitting } = form.formState

  function translateError(message: string | undefined): string | undefined {
    if (!message) return undefined
    return validationDictionary[message] ?? message
  }

  async function onSubmit(values: HiddenBugFormValues) {
    setServerError(null)

    const url =
      mode === 'create'
        ? `/${locale}/admin/challenges/api/hidden-bugs/create`
        : `/${locale}/admin/challenges/api/hidden-bugs/update`

    const body =
      mode === 'create'
        ? { challenge_id: challengeId, ...values }
        : { id: bug?.id, ...values }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        setServerError(dictionary.somethingWentWrong)
        return
      }

      const result = await res.json()

      if (result.error) {
        setServerError(dictionary.somethingWentWrong)
        return
      }

      form.reset()
      onOpenChange(false)
      router.refresh()
    } catch {
      setServerError(dictionary.somethingWentWrong)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? dictionary.addHiddenBug : dictionary.editHiddenBug}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="bug_title"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{dictionary.bugTitle}</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-background/50 border-border/50" />
                  </FormControl>
                  <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            {/* Severity */}
            <FormField
              control={form.control}
              name="actual_severity"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{dictionary.actualSeverity}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            {/* Bonus XP */}
            <FormField
              control={form.control}
              name="bonus_xp"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{dictionary.bonusXp}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="bg-background/50 border-border/50"
                    />
                  </FormControl>
                  <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            {/* Bug Identifier */}
            <FormField
              control={form.control}
              name="bug_identifier"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{dictionary.bugIdentifier ?? 'Bug Identifier (Tech ID)'}</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-background/50 border-border/50" placeholder="e.g. auth_bypass_01" />
                  </FormControl>
                  <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{dictionary.description ?? 'Description'}</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-background/50 border-border/50" />
                  </FormControl>
                  <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field, fieldState }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border/50 bg-background/50 p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{dictionary.active ?? 'Active'}</FormLabel>
                  </div>
                  <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            {serverError && (
              <p className="text-sm font-medium text-destructive">{serverError}</p>
            )}

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {dictionary.saveChallenge}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
