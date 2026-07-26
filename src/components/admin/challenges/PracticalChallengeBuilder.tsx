'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { practicalChallengeSchema, type PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'
import type { Dictionary } from '@/i18n/types'
import { ChallengeInformationSection } from './ChallengeInformationSection'
import { LearningConnectionSection } from './LearningConnectionSection'
import { PracticalApplicationSection } from './PracticalApplicationSection'
import { LoginFormConfigurationSection } from './LoginFormConfigurationSection'
import { IntentionalBugsSection } from './IntentionalBugsSection'
import { ChallengeTesterPreview } from './ChallengeTesterPreview'
import { ChallengePublishSection } from './ChallengePublishSection'

export interface LearningPathOption {
  id: string
  title: string
}

export interface ModuleOption {
  id: string
  title: string
}

export interface LessonOption {
  id: string
  title: string
  learning_path_title: string | null
}

interface PracticalChallengeBuilderProps {
  dictionary: Dictionary
  locale: 'en' | 'ar'
  initialData?: Partial<PracticalChallengeFormValues>
  challengeId?: string
  learningPathOptions: LearningPathOption[]
  moduleOptions: ModuleOption[]
  lessonOptions: LessonOption[]
}

export function PracticalChallengeBuilder({ dictionary, locale, initialData, challengeId, learningPathOptions, moduleOptions, lessonOptions }: PracticalChallengeBuilderProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const methods = useForm<PracticalChallengeFormValues>({
    resolver: zodResolver(practicalChallengeSchema),
    defaultValues: {
      title_en: initialData?.title_en || '',
      title_ar: initialData?.title_ar || '',
      description_en: initialData?.description_en || '',
      description_ar: initialData?.description_ar || '',
      scenario_en: initialData?.scenario_en || '',
      scenario_ar: initialData?.scenario_ar || '',
      instructions_en: initialData?.instructions_en || '',
      instructions_ar: initialData?.instructions_ar || '',
      difficulty: initialData?.difficulty || 'Beginner',
      base_xp_reward: initialData?.base_xp_reward || 50,
      challenge_type: 'bug_report',
      is_required: initialData?.is_required ?? true,
      is_active: initialData?.is_active ?? true,
      practical_app_key: initialData?.practical_app_key || null,
      practical_app_config: initialData?.practical_app_config || {},
      embedded_bugs: initialData?.embedded_bugs || [],
    }
  })

  const onSubmit = async (data: PracticalChallengeFormValues) => {
    setIsSubmitting(true)
    try {
      const endpoint = challengeId 
        ? `/api/admin/challenges/update` 
        : `/api/admin/challenges/create`

      const payload = challengeId ? { id: challengeId, ...data } : data

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to save challenge')
      }
      
      router.push('/en/admin/challenges')
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Failed to save challenge')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto pb-24">
        <ChallengeInformationSection dictionary={dictionary} />
        <LearningConnectionSection 
          dictionary={dictionary} 
          learningPathOptions={learningPathOptions}
          moduleOptions={moduleOptions} 
          lessonOptions={lessonOptions} 
        />
        <PracticalApplicationSection dictionary={dictionary} />
        
        {/* Conditional Sections based on selected App */}
        <LoginFormConfigurationSection dictionary={dictionary} />
        
        <IntentionalBugsSection locale={locale} />
        <ChallengeTesterPreview dictionary={dictionary} locale={locale} />
        
        <ChallengePublishSection 
          dictionary={dictionary} 
          isSubmitting={isSubmitting} 
          isEditMode={!!challengeId}
        />
      </form>
    </FormProvider>
  )
}
