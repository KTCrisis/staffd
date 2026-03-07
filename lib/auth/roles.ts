/**
 * lib/auth/roles.ts
 * Types de rôle + helpers purs — aucune directive, aucune dépendance.
 * Importable partout : client, serveur, middleware Edge.
 *
 * Hiérarchie : super_admin > admin > manager > consultant | freelance > viewer
 */

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'consultant'
  | 'freelance'
  | 'viewer'

export interface AuthUser {
  id:        string
  email:     string
  role:      UserRole
  companyId: string | null
}

// ──────────────────────────────────────────────────────────────
// HELPERS DE RÔLE
// ──────────────────────────────────────────────────────────────

export const isSuperAdmin        = (role?: UserRole | string) => role === 'super_admin'
export const isAdmin             = (role?: UserRole | string) => role === 'super_admin' || role === 'admin'
export const isManager           = (role?: UserRole | string) => isAdmin(role) || role === 'manager'
export const canEdit             = (role?: UserRole | string) => isManager(role)
export const canViewFinancials   = (role?: UserRole | string) => isAdmin(role)
export const isConsultantOrAbove = (role?: UserRole | string) => role === 'consultant' || role === 'freelance' || canEdit(role)
export const canViewOwnInvoices  = (role?: UserRole | string) => role === 'freelance' || canEdit(role)

// ──────────────────────────────────────────────────────────────
// GUARDS DE ROUTES (source de vérité partagée avec le middleware)
// ──────────────────────────────────────────────────────────────

/**
 * Segments nécessitant un rôle minimum.
 * Le middleware itère dessus — plus de strings dupliquées.
 */
export const ROUTE_GUARDS: Array<{
  segments: string[]
  check:    (role?: string) => boolean
  /** segment de redirection sans préfixe de locale */
  redirect: string
}> = [
  {
    // Finances, paramètres, IA → admin uniquement
    segments: ['financials', 'profitability', 'settings', 'ai'],
    check:    isAdmin,
    redirect: '/dashboard',
  },
  {
    // Factures → admin + manager + freelance
    segments: ['invoices'],
    check:    (role) => isManager(role) || role === 'freelance',
    redirect: '/dashboard',
  },
]

/** Segments publics (pas d'auth requise) */
export const PUBLIC_SEGMENTS = ['login', 'docs'] as const