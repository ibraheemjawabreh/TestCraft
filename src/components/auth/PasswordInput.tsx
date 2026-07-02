'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PasswordInputProps extends React.ComponentProps<'input'> {
  /**
   * When true, the input border adopts a destructive (red) style.
   * Drive this from the field's error state in React Hook Form.
   */
  hasError?: boolean
}

// ─── PasswordInput ────────────────────────────────────────────────────────────

/**
 * Reusable password input with a show/hide visibility toggle.
 *
 * Built with `forwardRef` so it integrates transparently with React Hook Form's
 * `<FormControl>` wrapper — which automatically sets aria-invalid and
 * aria-describedby for you.
 *
 * @example
 * ```tsx
 * <FormControl>
 *   <PasswordInput
 *     {...field}
 *     id="password"
 *     placeholder="••••••••"
 *     autoComplete="new-password"
 *     disabled={isSubmitting}
 *     hasError={!!fieldState.error}
 *   />
 * </FormControl>
 * ```
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, hasError, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    // useCallback prevents the function from being recreated on each render
    const toggleVisibility = useCallback(
      () => setShowPassword((prev) => !prev),
      [],
    )

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          className={cn(
            'pr-11',
            hasError &&
              'border-destructive/60 focus-visible:ring-destructive/30',
            className,
          )}
        />

        {/*
         * Visibility toggle.
         * tabIndex={-1}: Tab skips this button so keyboard users move
         * directly from the password field to the next field.
         * aria-controls links this button to the input it controls.
         */}
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={disabled}
          tabIndex={-1}
          className={[
            'absolute right-3 top-1/2 -translate-y-1/2',
            'text-muted-foreground hover:text-foreground',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
            'disabled:pointer-events-none disabled:opacity-50',
          ].join(' ')}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          aria-controls={typeof props.id === 'string' ? props.id : undefined}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
