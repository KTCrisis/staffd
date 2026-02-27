import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales:        ['fr', 'en'],
  defaultLocale:  'fr',
  localePrefix:   'as-needed',   // /dashboard (fr) · /en/dashboard (en)
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
