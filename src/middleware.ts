import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { i18n, type Locale } from './i18n/config'
import { safeLearningRedirect } from './lib/auth/learning-redirect'

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  // These handlers validate the user and can refresh cookies themselves.
  if (pathname === '/api/academy/activities' || pathname === '/api/academy/lesson-open' ||
      pathname === '/auth/post-login' || pathname === '/auth/signout') {
    return NextResponse.next()
  }

  // These public JSON assets are files, not localized pages. Never redirect them
  // through locale/auth routing (which would turn a download into an HTML 404).
  if (pathname === '/curriculum/schema.json' || pathname === '/curriculum/example.json') {
    return NextResponse.next()
  }

  // 1. Check if the path should be excluded from locale routing
  const isExcludedPath = [
    '/auth/callback',
    '/api',
    '/_next',
    '/favicon.ico',
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff2'
  ].some(excluded => pathname.includes(excluded))

  if (isExcludedPath) {
    // We still want to handle Supabase Auth for these, but avoid locale redirects
    return handleSupabaseAuth(request, NextResponse.next({ request }))
  }

  // 2. Check if the pathname is missing a locale
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  if (pathnameIsMissingLocale) {
    // Redirect to default locale if missing
    return NextResponse.redirect(
      new URL(
        `/${i18n.defaultLocale}${pathname.startsWith('/') ? '' : '/'}${pathname}`,
        request.url
      )
    )
  }

  // Extract the locale for auth checks
  const locale = pathname.split('/')[1]

  // 3. Handle Supabase Auth
  let supabaseResponse = NextResponse.next({ request })
  return handleSupabaseAuth(request, supabaseResponse, locale)
}

async function handleSupabaseAuth(
  request: NextRequest,
  response: NextResponse,
  locale?: string
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  let finalResponse = response

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        finalResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          finalResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { pathname } = request.nextUrl
  const prefix = locale ? `/${locale}` : ''

  const learningStart = !!locale && (pathname === `${prefix}/learn` ||
    /^\/learning-paths\/[^/]+\/start$/.test(pathname.slice(prefix.length)))
  const marketing = !!locale && (pathname === prefix || pathname === `${prefix}/learning-paths` ||
    /^\/learning-paths\/[^/]+$/.test(pathname.slice(prefix.length)) ||
    pathname === `${prefix}/privacy` || pathname === `${prefix}/terms`)
  const accountPage = pathname === `${prefix}/profile` || pathname === `${prefix}/settings`
  if (locale && (marketing || learningStart || accountPage || pathname === `${prefix}/academy` || pathname.startsWith(`${prefix}/academy/`))) {
    // Read/refresh the cookie here. The layout and pages verify the user with
    // Auth and check the database role in requireTester() before serving data.
    const { data: { session } } = await supabase.auth.getSession()
    if (session || marketing || learningStart) return finalResponse
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = `${prefix}/login`
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes require authentication
  const isProtected = pathname.startsWith(`${prefix}/academy`) || pathname.startsWith(`${prefix}/dashboard`)
  
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = `${prefix}/login`
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Auth routes redirect to academy if already logged in
  const authPaths = [`${prefix}/login`, `${prefix}/register`]
  const isAuthPage = authPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (user && isAuthPage) {
    const destination = locale && safeLearningRedirect(request.nextUrl.searchParams.get('redirectTo'), locale as Locale)
    return NextResponse.redirect(new URL(destination || `${prefix}/academy`, request.url))
  }

  return finalResponse
}

export const config = {
  matcher: [
    // Match all request paths except static assets and auth callback
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
