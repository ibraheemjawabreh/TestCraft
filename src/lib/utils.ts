import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS class names intelligently, resolving conflicts.
 * Combines clsx (conditional classes) + tailwind-merge (conflict resolution).
 *
 * @example
 * cn('px-2 py-1', 'px-4') // → 'py-1 px-4'
 * cn('text-sm', isLarge && 'text-lg') // → 'text-lg' (if isLarge)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
