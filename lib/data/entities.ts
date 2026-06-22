/**
 * lib/data/entities.ts
 * Graphe d'entités de groupe (phase 2 — SQUELETTE).
 *
 * Types uniquement pour l'instant. Les hooks (lecture du graphe, cap table,
 * roll-up dividendes) et la couche RLS à deux axes viennent après l'atelier
 * connectd du 10/07. Voir docs/plan-cockpit-groupe.md et la migration
 * supabase/migrations/0001_group_entities.sql.
 */

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

/** Nature juridique d'une `company`. 'company' = tenant PSA isolé (défaut actuel). */
export type EntityType = 'company' | 'holding' | 'filiale' | 'sasu'

/** Une société vue comme nœud du groupe (extension de la table companies). */
export interface GroupEntity {
  id:                 string
  name:               string
  entity_type:        EntityType
  /** Hiérarchie opérationnelle (arbre). NE PAS utiliser pour les dividendes. */
  parent_company_id?: string | null
  /** Holding racine du groupe — scoping RLS de groupe. */
  group_id?:          string | null
}

/** Arête de capital owner -> owned (DAG). Support des dividendes, pas l'arbre. */
export interface Ownership {
  id:               string
  owner_company_id: string
  owned_company_id: string
  /** Quote-part de capital, 0 < pct <= 100. */
  pct:              number
  created_at?:      string
}

// TODO phase 2 (post-10/07) :
//   - useGroupEntities() / useOwnership(groupId)
//   - validation cap table (somme pct entrants = 100, pool consultants inclus)
//   - garde acyclicité du DAG
//   - roll-up résultat -> dividendes le long des arêtes ownership
