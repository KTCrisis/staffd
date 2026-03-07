/**
 * lib/toast.ts
 * Helpers toast centralisés — wrappers typés autour de sonner.
 *
 * Usage :
 *   import { toast } from '@/lib/toast'
 *   toast.success('Consultant créé')
 *   toast.error(error)           // accepte Error | string
 *   toast.promise(fn, { ... })   // spinner pendant une mutation async
 */

import { toast as sonner } from 'sonner'

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Une erreur inattendue est survenue'
}

export const toast = {
  success: (msg: string, description?: string) =>
    sonner.success(msg, { description }),

  error: (e: unknown, description?: string) =>
    sonner.error(errorMessage(e), { description }),

  warn: (msg: string, description?: string) =>
    sonner.warning(msg, { description }),

  info: (msg: string, description?: string) =>
    sonner.info(msg, { description }),

  /**
   * Spinner pendant une mutation async — idéal pour les mutations Supabase.
   *
   * toast.promise(createConsultant(data), {
   *   loading: 'Création en cours…',
   *   success: 'Consultant créé',
   *   error:   'Erreur lors de la création',
   * })
   */
  promise: <T>(
    fn:      Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) => sonner.promise(fn, messages),

  /** Fermer un toast par id */
  dismiss: sonner.dismiss,
}