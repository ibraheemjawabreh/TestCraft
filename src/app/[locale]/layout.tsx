import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'

import '../globals.css'
import 'katex/dist/katex.min.css'
import { notFound } from 'next/navigation'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { isValidLocale } from '@/lib/locale'

// ─── Fonts ─────────────────────────────────────────────────────────────────
// Space Grotesk: geometric, clean — perfect for technical/engineering products.
// Much more legible at bold weights than heavy display fonts.

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-syne',   // Keep same CSS variable — Tailwind picks it up unchanged
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

// ─── Metadata ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'TestCraft — AI-Powered Learning for QA Engineers',
    template: '%s — TestCraft',
  },
  description:
    'TestCraft is an AI-powered learning platform designed for Quality Assurance engineers. Master testing methodologies, automation frameworks, and QA best practices.',
  keywords: [
    'QA engineering',
    'quality assurance',
    'software testing',
    'test automation',
    'AI learning platform',
  ],
  authors: [{ name: 'TestCraft' }],
  creator: 'TestCraft',
  icons: { icon: '/TestCraft_logo.webp' },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f4' },
    { media: '(prefers-color-scheme: dark)', color: '#171412' }
  ],
  width: 'device-width',
  initialScale: 1,
}

// ─── Root Layout ───────────────────────────────────────────────────────────

import { DomRemoveDebugger } from '@/components/debug/dom-remove-debugger'

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${spaceGrotesk.variable} ${plusJakarta.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        <DomRemoveDebugger />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
