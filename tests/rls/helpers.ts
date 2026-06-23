/**
 * Helpers pour les tests RLS d'intégration contre le Supabase LOCAL.
 * Prérequis : `npx supabase start` (le stack doit tourner).
 *
 * Clés par défaut = clés démo standard du CLI Supabase local (publiques, fixes
 * pour toutes les installs). Surcouchables via env si besoin.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
export const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

/** Client service_role : bypasse la RLS, sert au seed et aux vérifications. */
export const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function createUser(
  email: string,
  password: string,
  app_metadata: Record<string, unknown>,
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    app_metadata,
    email_confirm: true,
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  return data.user
}

/** Client authentifié comme `email` : ses requêtes portent son JWT (RLS appliquée). */
export async function authClient(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn ${email}: ${error.message}`)
  return c
}

/** Supprime les comptes de test par email (cleanup idempotent). */
export async function deleteUsersByEmail(emails: string[]) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email && emails.includes(u.email)) {
      await admin.auth.admin.deleteUser(u.id)
    }
  }
}
