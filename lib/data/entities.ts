/**
 * lib/data/entities.ts
 * Typage léger d'entité pour le PSA : nature de la société et hiérarchie
 * opérationnelle (business units). Types uniquement.
 *
 * PSA pur : pas de graphe de capital ici. Le DAG d'ownership, le roll-up de
 * dividendes et la RLS de groupe vivront dans le cockpit de groupe (contexte
 * borné séparé), pas dans staffd. Voir docs/plan-cockpit-groupe.md.
 */

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

/** Nature juridique d'une `company`. 'company' = tenant PSA isolé (défaut actuel). */
export type EntityType = 'company' | 'holding' | 'filiale' | 'sasu'

/** Une société vue comme nœud opérationnel (extension de la table companies). */
export interface GroupEntity {
  id:                 string
  name:               string
  entity_type:        EntityType
  /** Hiérarchie opérationnelle (arbre, un parent) — business units. */
  parent_company_id?: string | null
}
