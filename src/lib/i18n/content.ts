import type { Locale } from '@/i18n/config'

/**
 * Helper to safely extract localized content from database records.
 * Falls back to English if Arabic content is empty or null.
 *
 * @param record - The database record object containing _en and _ar fields
 * @param field - The base name of the field (e.g., 'title', 'description', 'summary')
 * @param locale - The current user locale
 * @returns The localized string, falling back appropriately
 */
export function getLocalizedContent(
  record: Record<string, unknown>,
  field: string,
  locale: Locale
): string {
  const enField = `${field}_en`
  const arField = `${field}_ar`

  if (locale === 'ar') {
    const arValue = record[arField]
    if (arValue && typeof arValue === 'string' && arValue.trim().length > 0) {
      return arValue
    }
    // Fallback to English if Arabic is missing
    const enValue = record[enField]
    return typeof enValue === 'string' ? enValue : ''
  }

  // Default to English
  const enValue = record[enField]
  return typeof enValue === 'string' ? enValue : ''
}

/**
 * Helper to safely extract localized string arrays from database records.
 * Falls back to English if Arabic array is empty or missing.
 */
export function getLocalizedArray(
  record: Record<string, unknown>,
  field: string,
  locale: Locale
): string[] {
  const enField = `${field}_en`
  const arField = `${field}_ar`

  if (locale === 'ar') {
    const arValue = record[arField]
    if (Array.isArray(arValue) && arValue.length > 0) {
      // Check if the array has actual content, not just empty strings
      if (arValue.every((item): item is string => typeof item === 'string') && arValue.some((item) => item.trim().length > 0)) {
        return arValue
      }
    }
    const enValue = record[enField]
    return Array.isArray(enValue) && enValue.every((item): item is string => typeof item === 'string')
      ? enValue
      : []
  }

  const enValue = record[enField]
  return Array.isArray(enValue) && enValue.every((item): item is string => typeof item === 'string')
    ? enValue
    : []
}

/**
 * Legacy alias for getLocalizedContent
 */
export function localizedString(
  record: Record<string, unknown>,
  locale: Locale,
  field: string,
  _fallbackField?: string
): string {
  return getLocalizedContent(record, field, locale)
}
