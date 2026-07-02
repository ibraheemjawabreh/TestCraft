import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

/**
 * Auth Middleware
 *
 * Responsibilities:
 * 1. Refresh the Supabase session on every request (prevents token expiry
 *    while the user is actively using the app).
 * 2. Protect /dashboard/* and /academy/* — unauthenticated users are
 *    redirected to /login.
 * 3. Redirect already-authenticated users away from auth pages (/login,
 *    /register) to /academy.
 *
 * ⚠️  Always use `getUser()` (not `getSession()`) in middleware.
 *     `getUser()` validates the JWT with the Supabase Auth server;
 *     `getSession()` only reads the local cookie and can be spoofed.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing, fail open — the page will handle the error
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        // Write refreshed cookies to both the cloned request and the response
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(
          ({
            name,
            value,
            options,
          }: {
            name: string
            value: string
            options: CookieOptions
          }) => supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Protected routes ───────────────────────────────────────────────────────
  // Any path under /academy or /dashboard requires authentication.
  const isProtected =
    pathname.startsWith('/academy') || pathname.startsWith('/dashboard')

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Preserve the original destination so we can redirect back after login
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Auth routes — redirect logged-in users away ────────────────────────────
  const authPaths = ['/login', '/register']
  const isAuthPage = authPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  if (user && isAuthPage) {
    const academyUrl = request.nextUrl.clone()
    academyUrl.pathname = '/academy'
    return NextResponse.redirect(academyUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico
     * - Public media files (svg, png, jpg, jpeg, gif, webp, ico, woff2)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
