import { createNavigation } from 'next-intl/navigation'
import { routing }          from '@/i18n/routing'   // ← source unique de vérité

export const { Link, useRouter, usePathname, redirect } = createNavigation(routing)