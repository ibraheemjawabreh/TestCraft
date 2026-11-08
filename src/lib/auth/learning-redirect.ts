import type { Locale } from '@/i18n/config'

const uuid = '[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}'

// All accepted URLs are app-owned read routes in the requested language.
export function safeLearningRedirect(value: unknown, locale: Locale): string | undefined {
  if (typeof value !== 'string' || value.length > 400 || /[\u0000-\u0020\u007f\\]/.test(value)) return
  const prefix = '/' + locale
  if (!value.startsWith(prefix + '/')) return
  const suffix = value.slice(prefix.length)
  if (suffix === '/learn' || suffix === '/academy' || suffix === '/profile' || suffix === '/settings' ||
      /^\/learning-paths\/[a-z0-9][a-z0-9-]{0,139}\/start$/.test(suffix) ||
      new RegExp('^/academy/lessons/' + uuid + '$').test(suffix) ||
      new RegExp('^/academy\\?path=' + uuid + '$').test(suffix)) return value
}

export function withLearningRedirect(url: string, destination?: string) {
  return destination ? url + (url.includes('?') ? '&' : '?') + 'redirectTo=' + encodeURIComponent(destination) : url
}
