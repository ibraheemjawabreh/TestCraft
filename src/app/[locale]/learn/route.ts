import { resolveLocale } from '@/lib/locale'
import { launchLearning } from '@/lib/learning-catalog/launch'

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  return launchLearning(resolveLocale((await params).locale))
}
