'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { LayoutDashboard, LogOut, Settings, UserRound } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AccountAvatar } from './account-avatar'
import type { AccountIdentity } from '@/lib/auth/account-identity'
import type { Locale } from '@/i18n/config'

export function AccountMenu({ account, locale, admin }: { account: AccountIdentity; locale: Locale; admin: boolean }) {
  const form = useRef<HTMLFormElement>(null)
  const ar = locale === 'ar'
  const prefix = '/' + locale
  const label = ar ? 'قائمة الحساب' : 'Account menu'
  const item = 'cursor-pointer rounded-lg px-3 py-2.5 focus:bg-accent focus:text-accent-foreground'

  return (
    <>
      <DropdownMenu dir={ar ? 'rtl' : 'ltr'} modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={label}
            className="grid size-11 shrink-0 place-items-center rounded-full border bg-secondary hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <AccountAvatar name={account.name} src={account.avatar} className="size-8 text-xs" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} collisionPadding={12}
          className="z-[60] w-[min(19rem,calc(100vw-1.5rem))] rounded-xl bg-popover p-2 text-popover-foreground shadow-xl motion-reduce:!animate-none">
          <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
            <AccountAvatar name={account.name} src={account.avatar} className="size-11 text-sm" />
            <span className="min-w-0">
              <span dir="auto" className="block break-words text-base">{account.name}</span>
              {account.email && <bdi className="block break-all text-xs font-normal text-muted-foreground">{account.email}</bdi>}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mx-0 bg-border" />
          <DropdownMenuItem asChild className={item}>
            {admin ? (
              <Link href={prefix + '/admin'} prefetch={false}>
                <LayoutDashboard aria-hidden="true" />{ar ? 'لوحة الإدارة' : 'Admin dashboard'}
              </Link>
            ) : (
              <Link href={prefix + '/profile'} prefetch={false}>
                <UserRound aria-hidden="true" />{ar ? 'ملفي الشخصي' : 'My Profile'}
              </Link>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={item}>
            <Link href={prefix + '/settings'} prefetch={false}>
              <Settings aria-hidden="true" />{ar ? 'إعدادات الحساب' : 'Account Settings'}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-0 bg-border" />
          <DropdownMenuItem className={item + ' text-destructive'} onSelect={() => form.current?.requestSubmit()}>
            <LogOut aria-hidden="true" />{ar ? 'تسجيل الخروج' : 'Sign Out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={form} action="/auth/signout" method="post" hidden>
        <input type="hidden" name="locale" value={locale} />
      </form>
    </>
  )
}
