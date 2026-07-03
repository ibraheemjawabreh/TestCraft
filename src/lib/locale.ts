import { i18n, type Locale } from '@/i18n/config'

export function isValidLocale(locale: string): locale is Locale {
  return i18n.locales.includes(locale as Locale)
}
