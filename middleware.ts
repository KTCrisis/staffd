import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const PUBLIC_PATHS = ['/login', '/fr/login', '/docs'] 

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les routes publiques
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '?'))
  if (isPublic) return intlMiddleware(request)

  // Créer une réponse mutable pour pouvoir écrire les cookies
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Écrire sur la request ET sur la response (pattern officiel Supabase SSR)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Lire la session depuis les cookies (maintenant que le client browser utilise aussi les cookies)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const locale = pathname.startsWith('/fr') ? '/fr' : ''
    const loginUrl = new URL(`${locale}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Session OK → appliquer l'intl middleware en préservant les cookies
  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach(cookie => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}