import { describe, it, expect } from 'vitest'
import { computeProposableSalary } from './simulator'

describe('computeProposableSalary', () => {
  it('calcule le cas nominal (TJM 700, marge 30%, charges 42%, 218j)', () => {
    const r = computeProposableSalary({ tjmVendu: 700, marge: 30, charges: 42, jours: 218 })
    expect(r).not.toBeNull()
    // coût/jour max = 700 × 0,70 = 490 (toBeCloseTo : arithmétique flottante)
    expect(r!.coutJourMax).toBeCloseTo(490, 6)
    // TJM freelance = coût/jour max (pas de charges patronales)
    expect(r!.tjmFreelance).toBeCloseTo(490, 6)
    // brut annuel = 490 × 218 / 1,42
    expect(r!.brutAnnuel).toBeCloseTo(75225.35, 1)
    expect(r!.brutMensuel).toBeCloseTo(r!.brutAnnuel / 12, 6)
  })

  it('marge 0% : coût/jour = TJM vendu', () => {
    const r = computeProposableSalary({ tjmVendu: 800, marge: 0, charges: 42, jours: 218 })
    expect(r!.coutJourMax).toBe(800)
  })

  it('charges 0% : brut annuel = coût/jour × jours', () => {
    const r = computeProposableSalary({ tjmVendu: 1000, marge: 20, charges: 0, jours: 200 })
    // coût/jour = 800, brut = 800 × 200 = 160000
    expect(r!.brutAnnuel).toBe(160000)
  })

  it.each([
    ['TJM nul', { tjmVendu: 0, marge: 30, charges: 42, jours: 218 }],
    ['marge >= 100', { tjmVendu: 700, marge: 100, charges: 42, jours: 218 }],
    ['marge négative', { tjmVendu: 700, marge: -1, charges: 42, jours: 218 }],
    ['jours nuls', { tjmVendu: 700, marge: 30, charges: 42, jours: 0 }],
    ['charges négatives', { tjmVendu: 700, marge: 30, charges: -1, jours: 218 }],
  ])('retourne null si entrée invalide : %s', (_label, input) => {
    expect(computeProposableSalary(input)).toBeNull()
  })
})
