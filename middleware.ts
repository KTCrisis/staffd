import { createServerClient }            from '@supabase/ssr'
import { NextRequest, NextResponse }     from 'next/server'
import createIntlMiddleware              from 'next-intl/middleware'
import { routing }                       from './i18n/routing'
import { PUBLIC_SEGMENTS, ROUTE_GUARDS } from './lib/auth/roles'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Strip locale prefix pour comparer les segments ─────
  // localePrefix: 'as-needed' + defaultLocale: 'en'
  //   /docs       → public (anglais, pas de préfixe)
  //   /fr/docs    → public (français)
  //   /en/docs    → n'existe jamais (en = locale par défaut)
  const pathWithoutLocale = pathname.replace(/^\/(fr)/, '') || '/'

  // ── 2. Routes publiques — pas d'auth requise ──────────────
  const isPublic = PUBLIC_SEGMENTS.some(segment =>
    pathWithoutLocale === `/${segment}` ||
    pathWithoutLocale.startsWith(`/${segment}/`)
  )

  if (isPublic) return intlMiddleware(request)

  // ── 3. Supabase SSR — pattern officiel ────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ── 4. Session requise ────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const localePrefix = pathname.startsWith('/fr') ? '/fr' : ''
    const loginUrl     = new URL(`${localePrefix}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── 5. Guards de routes par rôle (depuis roles.ts) ────────
  const role = session.user.app_metadata?.user_role as string | undefined

  for (const guard of ROUTE_GUARDS) {
    const isGuarded = guard.segments.some(segment =>
      pathWithoutLocale === `/${segment}` ||
      pathWithoutLocale.startsWith(`/${segment}/`)
    )

    if (isGuarded && !guard.check(role)) {
      const localePrefix = pathname.startsWith('/fr') ? '/fr' : ''
      return NextResponse.redirect(new URL(`${localePrefix}${guard.redirect}`, request.url))
    }
  }

  // ── 6. Session valide → intl + transfert complet des cookies
  // ⚠️ Sans les options (secure, httpOnly, sameSite, path),
  //    iOS Safari rejette les cookies → redirect loop mobile
  const intlResponse = intlMiddleware(request)

  supabaseResponse.cookies.getAll().forEach(cookie => {
    intlResponse.cookies.set({
      name:  cookie.name,
      value: cookie.value,
      ...supabaseResponse.cookies.get(cookie.name),
    })
  })

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}