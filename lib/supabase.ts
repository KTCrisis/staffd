import { createBrowserClient } from '@supabase/ssr'

// NB: client volontairement non typé <Database> POUR L'INSTANT. Le typage est
// prêt (types/supabase.ts généré via `npm run db:types`) mais le flip vers
// createBrowserClient<Database> fait remonter ~10 vrais problèmes (bug
// tjm_cout_reel lu sur la table consultants au lieu de la vue, trous de
// nullabilité, types métier dupliqués divergents) à traiter en Phase 2.
// Voir docs/architecture-audit.md.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)