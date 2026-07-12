'use client'

import Link from 'next/link'
import { LogIn, Rocket, Menu, X } from 'lucide-react'
import { useState } from 'react'

import { TestcraftLogo } from '@/components/marketing/testcraft-logo'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface MarketingHeaderProps {
  dictionary: Dictionary
  locale: Locale
}

export function MarketingHeader({ dictionary, locale }: MarketingHeaderProps) {
  const t = dictionary.marketing.nav
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { label: t.tracks, href: '#tracks' },
    { label: t.practice, href: `/${locale}/academy` },
    { label: t.community, href: '#community' },
    { label: t.pricing, href: '#pricing' },
  ]

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[#334155]/60"
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Left: Logo ─────────────────────────────────────────────────── */}
        <TestcraftLogo locale={locale} size="sm" />

        {/* ── Center: Nav (desktop only) ─────────────────────────────────── */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label={locale === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#94a3b8] transition-colors duration-200 hover:text-[#f8fafc] hover:bg-[#1e293b]/60"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Right: CTAs ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Sign In */}
          <Link
            href={`/${locale}/login`}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#94a3b8] transition-all duration-200 hover:text-[#f8fafc] hover:bg-[#1e293b]/60"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {t.signIn}
          </Link>

          {/* Start Free */}
          <Link
            href={`/${locale}/register`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-[0_8px_24px_-8px_rgba(249,115,22,0.6)]"
            style={{
              background: 'linear-gradient(135deg, #f97316, #fbbf24)',
            }}
          >
            <Rocket className="h-4 w-4" aria-hidden="true" />
            {t.startFree}
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden ms-1 p-2 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]/60 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Nav Drawer ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-[#334155]/60 px-4 pb-4 pt-2"
          style={{ background: 'rgba(15, 23, 42, 0.95)' }}
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]/60 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/login`}
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-4 py-3 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]/60 transition-colors flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              {t.signIn}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
