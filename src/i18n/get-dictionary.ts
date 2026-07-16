import 'server-only'
import { ar } from './dictionaries/ar'
import { en } from './dictionaries/en'
import type { Locale } from './config'
import type { Dictionary } from './types'

const dictionaries: Record<Locale, Dictionary> = {
  en,
  ar,
}

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  return dictionaries[locale] ?? dictionaries.en
}
