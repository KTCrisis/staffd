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

/** Roles the caller may grant when inviting someone into its tenant. */
export function grantableRoles(caller?: UserRole | string): UserRole[] {
  if (isAdmin(caller))  return ['admin', 'manager', 'consultant', 'freelance']
  if (caller === 'manager') return ['consultant', 'freelance']
  return []
}

const RANK: Record<string, number> = {
  super_admin: 4, admin: 3, manager: 2, consultant: 1, freelance: 1, viewer: 0,
}

/**
 * May the caller mint an activation or reset link for an EXISTING account?
 * The link goes back to the caller, not to the account owner: minting it is
 * taking the account. So the target must be in the caller's tenant (or a
 * pending account with no tenant and no role yet), never a super_admin, and
 * strictly below the caller (an admin cannot reset another admin, a manager
 * only consultants and freelances). A new account (target null) is always
 * fine: nobody owns it yet.
 */
export function canIssueLinkFor(
  caller: UserRole | string | undefined,
  target: { role?: string | null; companyId?: string | null } | null,
  targetCompanyId: string,
): boolean {
  if (!target) return true
  const role = target.role ?? null
  if (role === 'super_admin') return false
  if (target.companyId) {
    if (target.companyId !== targetCompanyId) return false
  } else if (role) {
    return false // tenant-less account holding a role: not a pending invite
  }
  if (!role) return true
  return (RANK[role] ?? 0) < (RANK[caller ?? ''] ?? 0)
}

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
    segments: ['financials', 'profitability', 'simulator', 'settings', 'ai'],
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
export const PUBLIC_SEGMENTS = ['login', 'docs', 'activate'] as const