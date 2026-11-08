import { resolveLocale } from '@/lib/locale'
import { launchLearning } from '@/lib/learning-catalog/launch'

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  return launchLearning(resolveLocale(locale), slug)
}
