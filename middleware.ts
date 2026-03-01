import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Segments racines publics (sans locale)
const PUBLIC_SEGMENTS = ['login', 'docs']

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Détection route publique (indépendante de la locale)
  // Avec localePrefix: 'as-needed' + defaultLocale: 'fr' :
  //   - /docs      → français (pas de préfixe)
  //   - /en/docs   → anglais
  //   - /fr/docs   → n'existe JAMAIS (fr est la locale par défaut, pas de préfixe)
  const pathWithoutLocale = pathname.replace(/^\/(en)/, '') || '/'

  const isPublic = PUBLIC_SEGMENTS.some(segment =>
    pathWithoutLocale === `/${segment}` || pathWithoutLocale.startsWith(`/${segment}/`)
  )

  if (isPublic) {
    return intlMiddleware(request)
  }

  // 2. Initialisation Supabase pour les routes protégées
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
    // localePrefix: 'as-needed' → seul /en existe comme préfixe explicite
    const localePrefix = pathname.startsWith('/en') ? '/en' : ''
    const loginUrl = new URL(`${localePrefix}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Session valide → intl middleware + transfert cookies Supabase
  const intlResponse = intlMiddleware(request)

  supabaseResponse.cookies.getAll().forEach(cookie => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}