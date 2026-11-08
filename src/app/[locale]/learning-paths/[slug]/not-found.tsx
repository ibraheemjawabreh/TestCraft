'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import s from '@/components/marketing/marketing.module.css'

export default function PathNotFound() {
  const ar = usePathname()?.startsWith('/ar/')
  return <main className={s.site}>
    <section className={s.section}>
      <p className={s.eyebrow}>404</p>
      <h1 className="mt-2 text-3xl font-semibold">{ar ? 'مسار التعلّم غير موجود' : 'Learning path not found'}</h1>
      <p className={s.lead}>{ar ? 'ربما تغيّر رابط المسار أو لم يعد منشورًا.' : 'This path may have moved or is no longer published.'}</p>
      <Link href={ar ? '/ar/learning-paths' : '/en/learning-paths'} className={s.textLink}>{ar ? 'كل مسارات التعلّم' : 'All learning paths'}</Link>
    </section>
  </main>
}
