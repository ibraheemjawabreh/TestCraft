'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import { createClient } from '@/lib/supabase/client'
import { updatePassword } from '@/lib/settings/security'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { updatePasswordSchema } from '@/lib/validations/settings'

export function PasswordRecoveryForm({ locale, dictionary, update = false }: {
  locale: Locale; dictionary: Pick<Dictionary, 'auth' | 'common' | 'settings' | 'validation'>; update?: boolean
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { auth, common, settings, validation } = dictionary
  const ar = locale === 'ar'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError('')
    setPending(true)
    const retry = ar ? 'تعذّر إكمال العملية. حاول مجددًا.' : 'We could not complete the request. Try again.'
    try {
      if (update) {
        const parsed = updatePasswordSchema.safeParse({ newPassword: data.get('newPassword'), confirmPassword: data.get('confirmPassword') })
        if (!parsed.success) {
          const issue = parsed.error.issues[0].message
          setError(issue === 'passwordsDoNotMatch' ? (ar ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.')
            : issue === 'passwordTooShort' ? validation.passwordTooShort
            : ar ? 'استخدم حرفًا كبيرًا وآخر صغيرًا ورقمًا ورمزًا.' : 'Use uppercase and lowercase letters, a number and a symbol.')
          return
        }
        const result = await updatePassword(parsed.data)
        if (result.error) { setError(retry); return }
      } else {
        const parsed = forgotPasswordSchema.safeParse({ email: String(data.get('email')).trim() })
        if (!parsed.success) { setError(validation.invalidEmail); return }
        const callback = new URL('/auth/callback', window.location.origin)
        callback.searchParams.set('locale', locale)
        callback.searchParams.set('next', '/update-password')
        const result = await createClient().auth.resetPasswordForEmail(parsed.data.email, { redirectTo: callback.href })
        if (result.error) { setError(retry); return }
      }
      setSuccess(true)
    } catch {
      setError(retry)
    } finally {
      setPending(false)
    }
  }

  const login = <Link href={'/' + locale + '/login'} className="text-sm font-semibold text-primary hover:underline">{auth.goToSignIn}</Link>
  if (success) return <div className="space-y-4">
    <p role="status">{update ? settings.passwordUpdated : ar
      ? 'إن كان البريد مرتبطًا بحساب، ستصلك رسالة تحتوي رابط الاستعادة.'
      : 'If an account uses this email, you will receive a password recovery link.'}</p>
    {update ? <Button asChild><a href={'/auth/post-login?locale=' + locale}>{common.continue}</a></Button> : login}
  </div>

  return <form noValidate onSubmit={submit} className="space-y-4" aria-busy={pending}>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    {update ? <>
      <div className="space-y-2"><Label htmlFor="new-password">{settings.newPassword}</Label>
        <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" dir="ltr" required disabled={pending} />
      </div>
      <div className="space-y-2"><Label htmlFor="confirm-password">{settings.confirmPassword}</Label>
        <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" dir="ltr" required disabled={pending} />
      </div>
    </> : <div className="space-y-2"><Label htmlFor="recovery-email">{auth.email}</Label>
      <Input id="recovery-email" name="email" type="email" autoComplete="email" dir="ltr" required disabled={pending} />
    </div>}
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? common.loading : update ? common.save : ar ? 'أرسل رابط الاستعادة' : 'Send recovery link'}
    </Button>
    {!update && login}
  </form>
}
