'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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

import { challengeSchema, type ChallengeFormValues } from '@/lib/validations/challenge'
import type { Database } from '@/types/database.types'
import type { Locale } from '@/i18n/config'

type Challenge = Database['public']['Tables']['challenges']['Row']

interface ChallengeDictionary {
  challengeTitle: string
  description: string
  difficulty: string
  baseXpReward: string
  active: string
  createChallenge: string
  updateChallenge: string
  createdSuccessfully: string
  updatedSuccessfully: string
  somethingWentWrong: string
  beginner: string
  intermediate: string
  advanced: string
}

interface ValidationDictionary {
  [key: string]: string
}

interface ChallengeFormProps {
  mode: 'create' | 'edit'
  challenge?: Challenge
  dictionary: ChallengeDictionary
  validationDictionary: ValidationDictionary
  locale: Locale
}

export function ChallengeForm({
  mode,
  challenge,
  dictionary,
  validationDictionary,
  locale,
}: ChallengeFormProps) {
  const router = useRouter()
  const [serverMessage, setServerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: challenge?.title ?? '',
      description: challenge?.description ?? '',
      difficulty: challenge?.difficulty ?? 'Beginner',
      base_xp_reward: challenge?.base_xp_reward ?? 100,
      is_active: challenge?.is_active ?? true,
    },
  })

  const { isSubmitting } = form.formState

  /**
   * Translate a Zod validation key to a human-readable message.
   */
  function translateError(message: string | undefined): string | undefined {
    if (!message) return undefined
    return validationDictionary[message] ?? message
  }

  async function onSubmit(values: ChallengeFormValues) {
    setServerMessage(null)

    const url =
      mode === 'create'
        ? `/${locale}/admin/challenges/api/create`
        : `/${locale}/admin/challenges/api/update`

    const body =
      mode === 'create'
        ? values
        : { id: challenge?.id, ...values }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        setServerMessage({ type: 'error', text: dictionary.somethingWentWrong })
        return
      }

      const result = await res.json() as { data?: { id: string }; error?: string }

      if (result.error) {
        setServerMessage({ type: 'error', text: dictionary.somethingWentWrong })
        return
      }

      setServerMessage({
        type: 'success',
        text: mode === 'create' ? dictionary.createdSuccessfully : dictionary.updatedSuccessfully,
      })

      // Redirect to the challenge details page after a short delay
      const targetId = result.data?.id ?? challenge?.id
      setTimeout(() => {
        router.push(`/${locale}/admin/challenges/${targetId}`)
        router.refresh()
      }, 800)
    } catch {
      setServerMessage({ type: 'error', text: dictionary.somethingWentWrong })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{dictionary.challengeTitle}</FormLabel>
              <FormControl>
                <Input {...field} className="bg-card/60 border-border/50" />
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
              <FormLabel>{dictionary.description}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={6} className="bg-card/60 border-border/50 resize-none" />
              </FormControl>
              <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
            </FormItem>
          )}
        />

        {/* Difficulty + XP Row */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="difficulty"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.difficulty}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-card/60 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Beginner">{dictionary.beginner}</SelectItem>
                    <SelectItem value="Intermediate">{dictionary.intermediate}</SelectItem>
                    <SelectItem value="Advanced">{dictionary.advanced}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="base_xp_reward"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.baseXpReward}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="bg-card/60 border-border/50"
                  />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        {/* Active Checkbox */}
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-medium cursor-pointer">
                {dictionary.active}
              </FormLabel>
            </FormItem>
          )}
        />

        {/* Server Message */}
        {serverMessage && (
          <div
            className={[
              'rounded-lg px-4 py-3 text-sm font-medium',
              serverMessage.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-destructive/15 text-destructive',
            ].join(' ')}
            role="alert"
          >
            {serverMessage.text}
          </div>
        )}

        {/* Submit */}
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? dictionary.createChallenge : dictionary.updateChallenge}
        </Button>
      </form>
    </Form>
  )
}
