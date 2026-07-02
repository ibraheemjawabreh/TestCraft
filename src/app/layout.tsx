import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'

import './globals.css'

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
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#050510',
  width: 'device-width',
  initialScale: 1,
}

// ─── Root Layout ───────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plusJakarta.variable}`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
