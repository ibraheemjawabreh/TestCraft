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
  record: Record<string, any>,
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
    return (record[enField] as string) || ''
  }

  // Default to English
  return (record[enField] as string) || ''
}

/**
 * Helper to safely extract localized string arrays from database records.
 * Falls back to English if Arabic array is empty or missing.
 */
export function getLocalizedArray(
  record: Record<string, any>,
  field: string,
  locale: Locale
): string[] {
  const enField = `${field}_en`
  const arField = `${field}_ar`

  if (locale === 'ar') {
    const arValue = record[arField]
    if (Array.isArray(arValue) && arValue.length > 0) {
      // Check if the array has actual content, not just empty strings
      if (arValue.some((item) => item.trim().length > 0)) {
        return arValue
      }
    }
    return (record[enField] as string[]) || []
  }

  return (record[enField] as string[]) || []
}

/**
 * Legacy alias for getLocalizedContent
 */
export function localizedString(
  record: Record<string, any>,
  locale: Locale,
  field: string,
  _fallbackField?: string
): string {
  return getLocalizedContent(record, field, locale)
}
