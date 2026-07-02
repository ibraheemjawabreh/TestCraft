import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      // ─── Cyber Violet Design System ──────────────────────────────────────
      colors: {
        // shadcn/ui CSS-variable tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Raw Cyber Violet palette (for arbitrary values)
        cyber: {
          bg: '#050510',
          surface: '#0f0f1f',
          primary: '#7c3aed',
          accent: '#22d3ee',
          glow: '#f0abfc',
          muted: '#8892b0',
        },
      },

      // ─── Typography ──────────────────────────────────────────────────────
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', ...fontFamily.sans],
        heading: ['var(--font-syne)', ...fontFamily.sans],
      },

      // ─── Gradients ───────────────────────────────────────────────────────
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, #7c3aed, #22d3ee)',
        'cyber-gradient-r': 'linear-gradient(135deg, #22d3ee, #7c3aed)',
      },

      // ─── Glow Shadows ────────────────────────────────────────────────────
      boxShadow: {
        'glow-primary': '0 0 30px rgba(124, 58, 237, 0.55)',
        'glow-accent': '0 0 30px rgba(34, 211, 238, 0.55)',
        'glow-sm': '0 0 14px rgba(124, 58, 237, 0.4)',
        card: [
          '0 0 0 1px rgba(124, 58, 237, 0.14)',
          '0 24px 48px -12px rgba(0, 0, 0, 0.85)',
        ].join(', '),
      },

      // ─── Animations ──────────────────────────────────────────────────────
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.65' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-28px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'glow-pulse': 'glow-pulse 5s ease-in-out infinite',
        float: 'float 8s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out infinite 4s',
      },

      // ─── Border Radius (shadcn/ui tokens) ────────────────────────────────
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config

export default config
