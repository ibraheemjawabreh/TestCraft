'use client'

import { useFormContext } from 'react-hook-form'
import type { PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'
import type { Dictionary } from '@/i18n/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Network } from 'lucide-react'

import type { LearningPathOption, ModuleOption, LessonOption } from './PracticalChallengeBuilder'

interface LearningConnectionSectionProps {
  dictionary: Dictionary
  learningPathOptions: LearningPathOption[]
  moduleOptions: ModuleOption[]
  lessonOptions: LessonOption[]
}

export function LearningConnectionSection({ dictionary, learningPathOptions, moduleOptions, lessonOptions }: LearningConnectionSectionProps) {
  const form = useFormContext<PracticalChallengeFormValues>()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <CardTitle>{dictionary.factory.builder.learning}</CardTitle>
        </div>
        <CardDescription>{dictionary.factory.builder.learningHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="learning_path_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.path}</FormLabel>
                <FormControl>
                  <Select onValueChange={value => field.onChange(value === 'none' ? null : value)} value={field.value || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder={dictionary.factory.builder.selectPath} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{dictionary.factory.builder.none}</SelectItem>
                      {learningPathOptions.map((path) => (
                        <SelectItem key={path.id} value={path.id}>
                          {path.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="module_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.module}</FormLabel>
                <FormControl>
                  <Select onValueChange={value => field.onChange(value === 'none' ? null : value)} value={field.value || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder={dictionary.factory.builder.selectModule} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{dictionary.factory.builder.none}</SelectItem>
                      {moduleOptions.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lesson_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.lesson}</FormLabel>
                <FormControl>
                  <Select onValueChange={value => field.onChange(value === 'none' ? null : value)} value={field.value || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder={dictionary.factory.builder.selectLesson} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{dictionary.factory.builder.none}</SelectItem>
                      {lessonOptions.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          {lesson.learning_path_title ? `${lesson.learning_path_title} > ` : ''}
                          {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
