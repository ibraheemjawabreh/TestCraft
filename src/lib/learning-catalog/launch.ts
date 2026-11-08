import 'server-only'
import { redirect } from 'next/navigation'
import type { Locale } from '@/i18n/config'
import { requireTester } from '@/lib/auth/require-tester'
import { readPathStudy } from './data'

export async function launchLearning(locale: Locale, slug: string | null = null): Promise<never> {
  const prefix = '/' + locale
  const path = prefix + '/learning-paths/' + encodeURIComponent(slug ?? '')
  await requireTester(locale, slug === null ? prefix + '/learn' : path + '/start')
  const study = await readPathStudy(slug)
  if (study?.lesson_id) redirect(prefix + '/academy/lessons/' + study.lesson_id)
  redirect(slug === null ? prefix + '/academy' : path)
}
