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

interface LessonOption {
  id: string
  title: string
  learning_path_title: string | null
}

interface ModuleOption {
  id: string
  title: string
}

export interface LabTemplateOption {
  id: string
  name: string
  slug: string
  is_active: boolean
}

interface ChallengeDictionary {
  englishTitle: string
  arabicTitle: string
  englishDescription: string
  arabicDescription: string
  englishScenario: string
  arabicScenario: string
  englishInstructions: string
  arabicInstructions: string
  linkedLesson: string
  noLinkedLesson: string
  challengeType: string
  labTemplate: string
  difficulty: string
  baseXpReward: string
  requiredChallenge: string
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
  lessonOptions: LessonOption[]
  moduleOptions: ModuleOption[]
  labTemplateOptions: LabTemplateOption[]
  dictionary: ChallengeDictionary
  validationDictionary: ValidationDictionary
  locale: Locale
}

function challengeField(challenge: Challenge | undefined, key: string): string | null {
  if (!challenge) return null
  const value = (challenge as unknown as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

function challengeBoolean(challenge: Challenge | undefined, key: string, fallback: boolean): boolean {
  if (!challenge) return fallback
  const value = (challenge as unknown as Record<string, unknown>)[key]
  return typeof value === 'boolean' ? value : fallback
}

export function ChallengeForm({
  mode,
  challenge,
  lessonOptions,
  moduleOptions,
  labTemplateOptions,
  dictionary,
  validationDictionary,
  locale,
}: ChallengeFormProps) {
  const router = useRouter()
  const [serverMessage, setServerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title_en: challengeField(challenge, 'title_en') ?? challenge?.title ?? '',
      title_ar: challengeField(challenge, 'title_ar') ?? '',
      description_en: challengeField(challenge, 'description_en') ?? challenge?.description ?? '',
      description_ar: challengeField(challenge, 'description_ar') ?? '',
      scenario_en: challengeField(challenge, 'scenario_en') ?? challenge?.scenario ?? '',
      scenario_ar: challengeField(challenge, 'scenario_ar') ?? '',
      instructions_en: challengeField(challenge, 'instructions_en') ?? challenge?.instructions ?? '',
      instructions_ar: challengeField(challenge, 'instructions_ar') ?? '',
      lesson_id: challenge?.lesson_id ?? null,
      module_id: challenge?.module_id ?? null,
      lab_template_id: challenge?.lab_template_id ?? null,
      challenge_type: (challenge?.challenge_type as any) ?? 'bug_report',
      lab_template: challenge?.lab_template ?? '',
      difficulty: (challenge?.difficulty as any) ?? 'Beginner',
      base_xp_reward: challenge?.base_xp_reward ?? 100,
      is_required: challengeBoolean(challenge, 'is_required', true),
      is_active: challenge?.is_active ?? true,
    },
  })

  const { isSubmitting } = form.formState

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
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="title_en"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.englishTitle}</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-card/60 border-border/50" />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title_ar"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.arabicTitle}</FormLabel>
                <FormControl>
                  <Input {...field} dir="rtl" className="bg-card/60 border-border/50" />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="description_en"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.englishDescription}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={5} className="bg-card/60 border-border/50 resize-none" />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description_ar"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.arabicDescription}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={5} dir="rtl" className="bg-card/60 border-border/50 resize-none" />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="scenario_en"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.englishScenario}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} className="bg-card/60 border-border/50 resize-none" />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scenario_ar"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.arabicScenario}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} dir="rtl" className="bg-card/60 border-border/50 resize-none" />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="instructions_en"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.englishInstructions}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} className="bg-card/60 border-border/50 resize-none" />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instructions_ar"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.arabicInstructions}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} dir="rtl" className="bg-card/60 border-border/50 resize-none" />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="lesson_id"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.linkedLesson}</FormLabel>
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                >
                  <FormControl>
                    <SelectTrigger className="bg-card/60 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">{dictionary.noLinkedLesson}</SelectItem>
                    {lessonOptions.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.learning_path_title ? `${lesson.learning_path_title} / ${lesson.title}` : lesson.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="module_id"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Linked Module (Module Challenge)</FormLabel>
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                >
                  <FormControl>
                    <SelectTrigger className="bg-card/60 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Linked Module</SelectItem>
                    {moduleOptions.map((mod) => (
                      <SelectItem key={mod.id} value={mod.id}>
                        {mod.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="challenge_type"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.challengeType}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="bg-card/60 border-border/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bug_report">Bug Report</SelectItem>
                    <SelectItem value="test_cases">Test Cases</SelectItem>
                    <SelectItem value="api_testing">API Testing</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lab_template_id"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{dictionary.labTemplate}</FormLabel>
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                >
                  <FormControl>
                    <SelectTrigger className="bg-card/60 border-border/50">
                      <SelectValue placeholder="Select Lab Template" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Lab Template (Theory only)</SelectItem>
                    {labTemplateOptions.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name} {lab.is_active ? '' : '(Inactive)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />

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
                    onChange={(event) => field.onChange(Number(event.target.value))}
                    className="bg-card/60 border-border/50"
                  />
                </FormControl>
                <FormMessage>{translateError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="is_required"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-medium cursor-pointer">
                  {dictionary.requiredChallenge}
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-medium cursor-pointer">
                  {dictionary.active}
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

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

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? dictionary.createChallenge : dictionary.updateChallenge}
        </Button>
      </form>
    </Form>
  )
}
