/**
 * lib/grades.ts
 * Grille par grade — économie d'un grade, logique pure testable hors React.
 *
 * Un grade porte trois hypothèses : TJM cible, occupation cible (%) et coût
 * chargé annuel. On en tire le CA annuel, la contribution (CA − coût) et les
 * deux points morts : le TJM qui couvre le coût à l'occupation cible, et
 * l'occupation qui le couvre au TJM cible.
 */

export interface GradeInput {
  /** TJM cible (€/j) */
  tjm:        number
  /** Occupation cible en % (0-100) */
  occupation: number
  /** Coût chargé annuel (€) — salarié chargé, ou honoraires annuels */
  cost:       number
  /** Jours travaillés dans l'année */
  jours:      number
}

export interface GradeEconomics {
  /** Jours facturés = jours × occupation */
  joursFactures:        number
  /** CA annuel = TJM × jours facturés */
  caAnnuel:             number
  /** Contribution annuelle = CA − coût */
  contribution:         number
  /** Contribution / CA, en % (null si CA nul) */
  margePct:             number | null
  /** Coût par jour travaillé = coût / jours */
  coutJour:             number
  /** TJM qui couvre le coût à l'occupation cible (null si occupation nulle) */
  pointMortTjm:         number | null
  /** Occupation (%) qui couvre le coût au TJM cible (null si TJM nul) */
  pointMortOccupation:  number | null
}

/**
 * Grille type, point de départ d'un tenant : ordres de grandeur génériques
 * d'un cabinet de conseil IT, à remplacer par les hypothèses du tenant.
 */
export const DEFAULT_GRADES = [
  { label: 'Expert',   position: 0, tjm_cible: 1200, occupation_cible: 70, cout_annuel_charge: 130000 },
  { label: 'Senior',   position: 1, tjm_cible:  900, occupation_cible: 75, cout_annuel_charge: 100000 },
  { label: 'Confirmé', position: 2, tjm_cible:  750, occupation_cible: 80, cout_annuel_charge:  75000 },
  { label: 'Junior',   position: 3, tjm_cible:  550, occupation_cible: 85, cout_annuel_charge:  55000 },
] as const

/**
 * Retourne l'économie du grade, ou `null` si les entrées sont invalides
 * (jours <= 0, valeurs négatives, occupation > 100).
 */
export function gradeEconomics(input: GradeInput): GradeEconomics | null {
  const { tjm, occupation, cost, jours } = input
  const valid =
    jours > 0 && tjm >= 0 && cost >= 0 && occupation >= 0 && occupation <= 100
  if (!valid) return null

  const occ           = occupation / 100
  const joursFactures = jours * occ
  const caAnnuel      = tjm * joursFactures
  const contribution  = caAnnuel - cost

  return {
    joursFactures,
    caAnnuel,
    contribution,
    margePct:            caAnnuel > 0 ? (contribution / caAnnuel) * 100 : null,
    coutJour:            cost / jours,
    pointMortTjm:        occ > 0 ? cost / joursFactures : null,
    pointMortOccupation: tjm > 0 ? (cost / (tjm * jours)) * 100 : null,
  }
}
