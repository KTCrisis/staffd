/**
 * lib/routes.ts
 * Source de vérité pour toutes les routes de l'application.
 * Utiliser ces constantes partout à la place des strings hardcodées.
 *
 * Compatible next-intl — passer via useRouter() / Link de lib/navigation.ts
 * pour la gestion automatique des préfixes de locale.
 */

// ──────────────────────────────────────────────────────────────
// PUBLIQUES
// ──────────────────────────────────────────────────────────────

export const ROUTES = {

  // Auth
  LOGIN:   '/login',

  // Documentation publique
  DOCS: {
    ROOT:     '/docs',
    PLATFORM: '/docs/platform',
    AI:       '/docs/ai',
  },

  // ────────────────────────────────────────────────────────────
  // DASHBOARD (rôle-based)
  // ────────────────────────────────────────────────────────────

  DASHBOARD: {
    ROOT:       '/dashboard',          // router → redirige selon rôle
    ADMIN:      '/dashboard/admin',
    MANAGER:    '/dashboard/manager',
    CONSULTANT: '/dashboard/consultant',
  },

  // ────────────────────────────────────────────────────────────
  // MODULES PRINCIPAUX
  // ────────────────────────────────────────────────────────────

  CONSULTANTS: '/consultants',
  PROJECTS:    '/projects',
  CLIENTS:     '/clients',
  LEAVES:      '/leaves',
  TIMESHEETS:  '/timesheets',
  AVAILABILITY:'/availability',
  TIMELINE:    '/timeline',
  BIDS:        '/bids',

  // ────────────────────────────────────────────────────────────
  // FINANCE (admin uniquement)
  // ────────────────────────────────────────────────────────────

  FINANCIALS:   '/financials',
  PROFITABILITY:'/profitability',

  // ────────────────────────────────────────────────────────────
  // FACTURES
  // ────────────────────────────────────────────────────────────

  INVOICES: {
    ROOT: '/invoices',
    NEW:  '/invoices/new',
    EDIT: (id: string) => `/invoices/${id}/edit`,
  },

  // ────────────────────────────────────────────────────────────
  // PARAMÈTRES & IA (admin uniquement)
  // ────────────────────────────────────────────────────────────

  SETTINGS: '/settings',
  AI:       '/ai',

  // ────────────────────────────────────────────────────────────
  // CONSOLE AI
  // ────────────────────────────────────────────────────────────

  CMD: '/cmd',

} as const

// ──────────────────────────────────────────────────────────────
// HELPER — dashboard par rôle
// Utilisé par le dashboard router et les redirections post-login.
// ──────────────────────────────────────────────────────────────

import type { UserRole } from './auth/roles'

export function dashboardForRole(role?: UserRole): string {
  switch (role) {
    case 'super_admin':
    case 'admin':     return ROUTES.DASHBOARD.ADMIN
    case 'manager':   return ROUTES.DASHBOARD.MANAGER
    default:          return ROUTES.DASHBOARD.CONSULTANT
  }
}