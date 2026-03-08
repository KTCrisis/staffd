/**
 * lib/auth/index.ts
 * Barrel — re-exporte tout pour rétrocompatibilité avec
 * les imports existants : import { useAuth } from '@/lib/auth'
 */

export * from './roles'
export * from './client'
export { getPageAuth, type PageAuth } from './page-auth'