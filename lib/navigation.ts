import { createNavigation } from 'next-intl/navigation'

export const { Link, useRouter, usePathname, redirect } = createNavigation({
  locales:      ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix:  'as-needed',
})
