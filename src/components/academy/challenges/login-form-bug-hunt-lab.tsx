'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'

interface LoginFormBugHuntLabProps {
  dictionary: Dictionary
}

export function LoginFormBugHuntLab({ dictionary }: LoginFormBugHuntLabProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Simulate network delay
    setTimeout(() => {
      setIsLoading(false)
      
      // Bug 1: Email validation is completely missing/bypassed.
      // A proper form would validate email format here or via HTML5 type="email" + required.
      // But we just accept anything.
      
      // Bug 2: Password validation is missing or accepts very short passwords.
      // A proper form would enforce min length (e.g. 8 chars).
      // Here we just accept it if it's not totally empty (or even if it is, let's say we just show generic error if both are empty).

      if (!email || !password) {
        setError(dictionary.auth.invalidCredentials)
        return
      }

      // Simulate a generic auth failure since this is a sandboxed lab
      setError(dictionary.auth.invalidCredentials)
    }, 800)
  }

  // Bug 3: Forgot password link looks clickable but does nothing (prevent default and no action).
  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    // Intentionally no-op to simulate the bug
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
        
        <div className="mb-6 text-center">
          <h3 className="font-heading text-xl font-bold text-foreground">
            {dictionary.challengeLab.loginLab.login}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {dictionary.challengeLab.loginLab.demoHint}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Field - Intentionally using type="text" instead of "email" to facilitate the bug */}
          <div className="space-y-1.5">
            <label
              htmlFor="lab-email"
              className="block text-sm font-medium text-foreground"
            >
              {dictionary.challengeLab.loginLab.email}
            </label>
            <input
              id="lab-email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors"
              placeholder="name@example.com"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="lab-password"
              className="block text-sm font-medium text-foreground"
            >
              {dictionary.challengeLab.loginLab.password}
            </label>
            <div className="relative">
              <input
                id="lab-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="block w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors pe-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-border/60 bg-background/60 text-primary focus:ring-primary focus:ring-offset-background"
              />
              <span className="text-sm font-medium text-muted-foreground select-none">
                {dictionary.challengeLab.loginLab.rememberMe}
              </span>
            </label>

            <a
              href="#"
              onClick={handleForgotPassword}
              className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
            >
              {dictionary.challengeLab.loginLab.forgotPassword}
            </a>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              dictionary.challengeLab.loginLab.login
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
