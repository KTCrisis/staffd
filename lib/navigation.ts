import { createNavigation } from 'next-intl/navigation'

export const { Link, useRouter, usePathname } = createNavigation({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
})