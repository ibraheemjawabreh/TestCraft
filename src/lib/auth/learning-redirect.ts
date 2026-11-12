import type { Locale } from '@/i18n/config'

const uuid = '[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}'
const academyPath = new RegExp('^/academy\\?path=' + uuid + '$')
const lesson = new RegExp('^/academy/lessons/' + uuid + '$')
const pathDetails = /^\/learning-paths\/[a-z0-9][a-z0-9-]{0,139}(?:\/start)?$/
const challenge = /^\/academy\/challenges\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,139}$/
const destinations = new Set(['/learn', '/academy', '/academy/home', '/academy/progress',
  '/academy/challenges', '/academy/reports', '/academy/activity', '/academy/badges',
  '/learning-paths', '/profile', '/settings'])

// All accepted URLs are app-owned read routes in the requested language.
export function safeLearningRedirect(value: unknown, locale: Locale): string | undefined {
  if (typeof value !== 'string' || value.length > 400 || /[\u0000-\u0020\u007f\\]/.test(value)) return
  const prefix = '/' + locale
  if (!value.startsWith(prefix + '/')) return
  const suffix = value.slice(prefix.length)
  if (destinations.has(suffix) || pathDetails.test(suffix) || lesson.test(suffix) ||
      challenge.test(suffix) || academyPath.test(suffix)) return value
}

export function studentHomePath(locale: Locale) {
  return '/' + locale + '/academy/home'
}

export function withLearningRedirect(url: string, destination?: string) {
  return destination ? url + (url.includes('?') ? '&' : '?') + 'redirectTo=' + encodeURIComponent(destination) : url
}
