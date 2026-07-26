import type { PracticalAppDefinition, PracticalAppKey } from './types'
import { loginFormDefinition } from './login-form-definition'

// The central registry for all practical applications
export const PRACTICAL_APPS: Record<PracticalAppKey, PracticalAppDefinition> = {
  login_form: loginFormDefinition,
}

/**
 * Get the definition for a specific practical application by key.
 */
export function getPracticalAppDefinition(key: string | null): PracticalAppDefinition | null {
  if (!key || !(key in PRACTICAL_APPS)) return null
  return PRACTICAL_APPS[key as PracticalAppKey]
}

/**
 * Get all available practical applications as an array (useful for select dropdowns).
 */
export function getAllPracticalApps(): PracticalAppDefinition[] {
  return Object.values(PRACTICAL_APPS)
}
