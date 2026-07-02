import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout
          'flex h-11 w-full rounded-lg px-4 py-2',
          // Colors — matches the Cyber Violet surface tokens
          'border border-input bg-[hsl(var(--input))] text-foreground',
          // Placeholder
          'placeholder:text-muted-foreground/60',
          // File input reset
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          // Focus — glowing violet ring
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'focus-visible:border-primary/50',
          // Transition
          'transition-all duration-200',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
