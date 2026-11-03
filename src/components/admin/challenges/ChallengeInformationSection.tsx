'use client'

import { useEffect } from 'react'

import { useFormContext } from 'react-hook-form'
import type { PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'
import type { Dictionary } from '@/i18n/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookOpen } from 'lucide-react'

export function ChallengeInformationSection({ dictionary }: { dictionary: Dictionary }) {
  const form = useFormContext<PracticalChallengeFormValues>()
  
  const titleEn = form.watch('title_en')
  const isSlugDirty = form.getFieldState('slug').isDirty

  useEffect(() => {
    // Only auto-generate if the user hasn't manually edited the slug
    if (titleEn && !isSlugDirty) {
      const generatedSlug = titleEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      
      if (form.getValues('slug') !== generatedSlug) {
        form.setValue('slug', generatedSlug, { shouldValidate: true })
      }
    }
  }, [titleEn, isSlugDirty, form])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle>{dictionary.factory.builder.information}</CardTitle>
        </div>
        <CardDescription>{dictionary.factory.builder.infoHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dictionary.factory.builder.slug}</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. login-form-bug-hunt" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.titleEn}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.titleAr}</FormLabel>
                <FormControl>
                  <Input dir="rtl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="description_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.descriptionEn}</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.descriptionAr}</FormLabel>
                <FormControl>
                  <Textarea dir="rtl" className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="scenario_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.scenarioEn}</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scenario_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.scenarioAr}</FormLabel>
                <FormControl>
                  <Textarea dir="rtl" className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="instructions_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.instructionsEn}</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[150px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="instructions_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.instructionsAr}</FormLabel>
                <FormControl>
                  <Textarea dir="rtl" className="min-h-[150px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.difficulty}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Beginner">{dictionary.factory.builder.beginner}</SelectItem>
                    <SelectItem value="Intermediate">{dictionary.factory.builder.intermediate}</SelectItem>
                    <SelectItem value="Advanced">{dictionary.factory.builder.advanced}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="base_xp_reward"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.factory.builder.xp}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      field.onChange(val === '' ? '' : parseInt(val, 10));
                    }} 
                  />
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
