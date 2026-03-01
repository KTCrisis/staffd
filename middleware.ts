import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// On définit les segments racines qui sont publics (sans la locale)
const PUBLIC_SEGMENTS = ['login', 'docs'] 

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Détection de la route publique (indépendamment de la locale)
  // On nettoie le pathname pour enlever la locale au début (ex: /fr/docs -> /docs)
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)/, '') || '/'
  
  const isPublic = PUBLIC_SEGMENTS.some(segment => 
    pathWithoutLocale === `/${segment}` || pathWithoutLocale.startsWith(`/${segment}/`)
  )

  // Si c'est public, on laisse next-intl gérer la redirection de langue sans checker Supabase
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

  // 3. Vérification de la session
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // Redirection vers login en préservant la locale si présente
    const localePrefix = pathname.startsWith('/fr') ? '/fr' : ''
    const loginUrl = new URL(`${localePrefix}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Session valide -> Appliquer l'internationalisation
  const intlResponse = intlMiddleware(request)
  
  // Important : Transférer les cookies de session Supabase vers la réponse Intl
  supabaseResponse.cookies.getAll().forEach(cookie => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  return intlResponse
}

export const config = {
  // On protège tout sauf les fichiers statiques, api, et dossiers système
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}