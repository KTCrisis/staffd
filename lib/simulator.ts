/**
 * lib/simulator.ts
 * Calcul du « salaire proposable » — logique pure, testable hors React.
 *
 * Inversion de la vue `consultant_profitability` : à partir du TJM vendu et
 * d'une marge cible, on déduit le coût/jour max, puis le brut annuel max d'un
 * salarié et le TJM max d'un freelance.
 */

export interface ProposableSalaryInput {
  /** TJM vendu au client */
  tjmVendu: number
  /** Marge cible en % (0 <= marge < 100) */
  marge: number
  /** Charges patronales en % */
  charges: number
  /** Jours travaillés dans l'année */
  jours: number
}

export interface ProposableSalaryResult {
  /** Coût/jour maximum supportable = TJM vendu × (1 − marge) */
  coutJourMax: number
  /** Brut annuel max d'un salarié */
  brutAnnuel: number
  /** Brut mensuel max (annuel / 12) */
  brutMensuel: number
  /** TJM max d'un freelance = coût/jour max (pas de charges patronales) */
  tjmFreelance: number
}

/**
 * Retourne le calcul, ou `null` si les entrées sont invalides
 * (TJM/jours <= 0, marge hors [0,100[, charges < 0).
 */
export function computeProposableSalary(
  input: ProposableSalaryInput,
): ProposableSalaryResult | null {
  const { tjmVendu, marge, charges, jours } = input
  const valid =
    tjmVendu > 0 && marge >= 0 && marge < 100 && jours > 0 && charges >= 0
  if (!valid) return null

  const coutJourMax = tjmVendu * (1 - marge / 100)
  const brutAnnuel = (coutJourMax * jours) / (1 + charges / 100)

  return {
    coutJourMax,
    brutAnnuel,
    brutMensuel: brutAnnuel / 12,
    tjmFreelance: coutJourMax,
  }
}
