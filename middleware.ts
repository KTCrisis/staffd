import { createServerClient }     from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware          from 'next-intl/middleware'
import { routing }                   from './i18n/routing'
import { PUBLIC_SEGMENTS, ROUTE_GUARDS } from './lib/auth/roles'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Route publique — localePrefix: 'as-needed', defaultLocale: 'en'
  //    /docs → en  |  /fr/docs → fr  |  /en/docs → n'existe jamais
  const pathWithoutLocale = pathname.replace(/^\/(fr)/, '') || '/'

  const isPublic = PUBLIC_SEGMENTS.some(segment =>
    pathWithoutLocale === `/${segment}` ||
    pathWithoutLocale.startsWith(`/${segment}/`)
  )

  if (isPublic) return intlMiddleware(request)

  // 2. Supabase SSR — pattern officiel (cookies transmis intégralement)
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

  // 3. Vérification session
  const { data: { session } } = await supabase.auth.getSession()
  const localePrefix = pathname.startsWith('/fr') ? '/fr' : ''

  if (!session) {
    const loginUrl = new URL(`${localePrefix}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Protection par rôle — source de vérité dans lib/auth/roles.ts
  const role = session.user.app_metadata?.user_role as string | undefined

  for (const guard of ROUTE_GUARDS) {
    const matches = guard.segments.some(segment =>
      pathWithoutLocale === `/${segment}` ||
      pathWithoutLocale.startsWith(`/${segment}/`)
    )
    if (matches && !guard.check(role)) {
      return NextResponse.redirect(new URL(`${localePrefix}${guard.redirect}`, request.url))
    }
  }

  // 5. Session valide → intl + transfert COMPLET des cookies Supabase
  // Sans les options (secure, httpOnly, sameSite, path), iOS Safari
  // rejette les cookies → session perdue → redirect loop sur mobile
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