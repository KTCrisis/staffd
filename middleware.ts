import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Segments publics (sans préfixe de locale)
const PUBLIC_SEGMENTS = ['login', 'docs']

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Détection route publique (indépendante de la locale)
  // localePrefix: 'as-needed' + defaultLocale: 'en' :
  //   - /docs       → anglais (pas de préfixe, locale par défaut)
  //   - /fr/docs    → français
  //   - /en/docs    → n'existe JAMAIS (en est la locale par défaut)
  const pathWithoutLocale = pathname.replace(/^\/(fr)/, '') || '/'

  const isPublic = PUBLIC_SEGMENTS.some(segment =>
    pathWithoutLocale === `/${segment}` || pathWithoutLocale.startsWith(`/${segment}/`)
  )

  if (isPublic) {
    return intlMiddleware(request)
  }

  // 2. Supabase SSR — pattern officiel
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

  if (!session) {
    // defaultLocale: 'en' → seul /fr existe comme préfixe explicite
    const localePrefix = pathname.startsWith('/fr') ? '/fr' : ''
    const loginUrl = new URL(`${localePrefix}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Protection routes par rôle
  const role = session.user.app_metadata?.user_role as string | undefined
  const localePrefix = pathname.startsWith('/fr') ? '/fr' : ''

  const isAdminOrSuperAdmin  = role === 'admin' || role === 'super_admin'
  const isAdminOrManager     = isAdminOrSuperAdmin || role === 'manager'
  const isFreelance          = role === 'freelance'

  // admin + super_admin uniquement
  const ADMIN_ONLY = ['financials', 'profitability', 'settings', 'ai']
  if (ADMIN_ONLY.some(s => pathWithoutLocale === `/${s}` || pathWithoutLocale.startsWith(`/${s}/`))) {
    if (!isAdminOrSuperAdmin) {
      return NextResponse.redirect(new URL(`${localePrefix}/dashboard`, request.url))
    }
  }

  // admin + manager + super_admin + freelance (pas consultant)
  if (pathWithoutLocale === '/invoices' || pathWithoutLocale.startsWith('/invoices/')) {
    if (!isAdminOrManager && !isFreelance) {
      return NextResponse.redirect(new URL(`${localePrefix}/dashboard`, request.url))
    }
  }

  // 5. Session valide → intl + transfert COMPLET des cookies Supabase
  // ⚠️ Sans les options (secure, httpOnly, sameSite, path), iOS Safari
  // rejette les cookies → session perdue → redirect loop sur mobile
  const intlResponse = intlMiddleware(request)

  supabaseResponse.cookies.getAll().forEach(cookie => {
    intlResponse.cookies.set({
      name: cookie.name,
      value: cookie.value,
      ...supabaseResponse.cookies.get(cookie.name),
    })
  })

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}