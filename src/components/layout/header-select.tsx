'use client'

import type { ChangeEvent, ReactNode } from 'react'

export function HeaderSelect({ label, value, onChange, icon, children }: {
  label: string
  value: string
  onChange: (value: string) => void
  icon: ReactNode
  children: ReactNode
}) {
  function select(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.currentTarget.value)
  }

  return <span className="site-control relative inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold">
    <span aria-hidden="true" className="pointer-events-none inline-flex items-center gap-1.5">{icon}</span>
    <select aria-label={label} value={value} onChange={select}
      className="absolute inset-0 size-full cursor-pointer opacity-0">
      {children}
    </select>
  </span>
}
