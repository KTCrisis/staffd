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

  // ── 3. Supabase SSR ───────────────────────────────────────
  // La réponse vient de next-intl (next, rewrite ou redirect de locale).
  // Si getUser() rafraîchit la session, les nouveaux jetons partent :
  //   · vers le navigateur (Set-Cookie sur la réponse) ;
  //   · vers les composants serveur de CETTE requête (en-tête cookie
  //     réécrit, cf. forwardRequestCookies). Sans ce second envoi, les
  //     pages relisaient l'ancien jeton et le rafraîchissaient une
  //     seconde fois : jeton « Already Used », retour au login.
  // ⚠️ Les options (secure, httpOnly, sameSite, path) sont conservées :
  //    sans elles iOS Safari rejette les cookies → boucle de redirection.
  const response = intlMiddleware(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // ── 4. Session requise (getUser verifies JWT server-side) ──
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const localePrefix = pathname.startsWith('/fr') ? '/fr' : ''
    const loginUrl     = new URL(`${localePrefix}/login`, request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── 5. Guards de routes par rôle (depuis roles.ts) ────────
  const role = user.app_metadata?.user_role as string | undefined

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

  // ── 5b. /dashboard → tableau de bord du rôle, sans rendre la page ──
  // La page /dashboard ne faisait que rediriger, après avoir refait toute la
  // vérification de session : autant rediriger ici, où le rôle est connu.
  if (pathWithoutLocale === '/dashboard') {
    const target = dashboardForRole(role)
    if (target) {
      const localePrefix = pathname.startsWith('/fr') ? '/fr' : ''
      const redirect = NextResponse.redirect(new URL(`${localePrefix}${target}`, request.url))
      // Jetons éventuellement rafraîchis par getUser() : ils doivent suivre
      response.cookies.getAll().forEach(c => redirect.cookies.set(c))
      return redirect
    }
  }

  // ── 6. Session valide → jetons à jour transmis aux pages ──
  forwardRequestCookies(request, response)
  return response
}

/**
 * Transmet aux composants serveur l'en-tête cookie à jour, sur la réponse
 * next-intl existante. On laisse NextResponse.next({ request: { headers } })
 * calculer les en-têtes de surcharge (x-middleware-override-headers doit
 * lister TOUS les en-têtes de la requête : Next supprime ceux qui manquent),
 * puis on les fusionne avec ceux que next-intl a posés, qui gardent la main
 * sauf pour le cookie.
 */
function forwardRequestCookies(request: NextRequest, response: NextResponse) {
  const PREFIX   = 'x-middleware-request-'
  const override = NextResponse.next({ request: { headers: request.headers } }).headers
  const split    = (v: string | null) => (v ?? '').split(',').map(h => h.trim()).filter(Boolean)

  const intlNames = new Set(split(response.headers.get('x-middleware-override-headers')))
  const names     = new Set([...intlNames, ...split(override.get('x-middleware-override-headers'))])

  override.forEach((value, key) => {
    if (!key.startsWith(PREFIX)) return
    const name = key.slice(PREFIX.length)
    if (name === 'cookie' || !intlNames.has(name)) response.headers.set(key, value)
  })
  response.headers.set('x-middleware-override-headers', [...names].join(','))
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

/** Tableau de bord propre au rôle (même règle que la page /dashboard). */
function dashboardForRole(role?: string): string | null {
  if (role === 'consultant' || role === 'freelance') return '/dashboard/consultant'
  if (role === 'manager')                            return '/dashboard/manager'
  if (role === 'admin' || role === 'super_admin')    return '/dashboard/admin'
  return null
}
