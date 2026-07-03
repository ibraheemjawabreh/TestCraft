import 'server-only'
import type { Locale } from './config'
import type { Dictionary } from './types'

const dictionaries = {
  en: () => import('./dictionaries/en').then((module) => module.en),
  ar: () => import('./dictionaries/ar').then((module) => module.ar),
}

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  return dictionaries[locale]?.() ?? dictionaries.en()
}
