import type { ReactNode } from 'react'

export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="auth-card w-full max-w-md rounded-2xl p-5 sm:p-8" aria-labelledby="auth-title">
    <h1 id="auth-title" className="font-heading text-3xl font-bold">{title}</h1>
    {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    <div className="mt-6">{children}</div>
  </section>
}
