'use client'

import Link from 'next/link'
import { lazy, Suspense, type ComponentProps } from 'react'
import { usePathname } from 'next/navigation'
import s from '@/components/marketing/marketing.module.css'

type HeaderLink = { label: string; href: string; children?: boolean }

const AccountMenu = lazy(() => import('./account-menu').then(module => ({ default: module.AccountMenu })))

export function HeaderAccountMenu(props: ComponentProps<typeof AccountMenu>) {
  // Keep the same React tree on the server and client so Radix generates matching IDs.
  return (
    <Suspense fallback={<span aria-hidden="true" className="inline-block size-11 shrink-0 rounded-full border bg-secondary" />}>
      <AccountMenu {...props} />
    </Suspense>
  )
}

export function HeaderLinks({ label, links }: { label: string; links: HeaderLink[] }) {
  const pathname = usePathname()
  return (
    <nav className={s.nav} aria-label={label}>
      {links.map(link => {
        const active = pathname === link.href || (link.children && pathname.startsWith(link.href + '/'))
        return <Link key={link.href} href={link.href} prefetch={false}
          aria-current={active ? (pathname === link.href ? 'page' : 'location') : undefined}>{link.label}</Link>
      })}
    </nav>
  )
}
