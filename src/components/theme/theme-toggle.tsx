'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { HeaderSelect } from '@/components/layout/header-select'
import type { Dictionary } from '@/i18n/types'

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function ThemeToggle({ dictionary }: { dictionary: Pick<Dictionary, 'theme'> }) {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const t = dictionary.theme

  return <HeaderSelect label={t.toggleTheme} value={mounted ? theme ?? 'dark' : 'dark'} onChange={setTheme}
    icon={<><Sun className="size-4 dark:hidden" /><Moon className="hidden size-4 dark:block" /></>}>
    <option value="light">{t.light}</option>
    <option value="dark">{t.dark}</option>
    <option value="system">{t.system}</option>
  </HeaderSelect>
}
