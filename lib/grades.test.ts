import { describe, it, expect } from 'vitest'
import { gradeEconomics, DEFAULT_GRADES } from './grades'

describe('gradeEconomics', () => {
  it('senior du plan : 1100 €, 70 %, 135 k, 218 j', () => {
    const r = gradeEconomics({ tjm: 1100, occupation: 70, cost: 135000, jours: 218 })!
    expect(r.joursFactures).toBeCloseTo(152.6, 5)
    expect(r.caAnnuel).toBeCloseTo(167860, 5)
    expect(r.contribution).toBeCloseTo(32860, 5)
    expect(r.pointMortTjm).toBeCloseTo(135000 / 152.6, 5)
    expect(r.pointMortOccupation).toBeCloseTo((135000 / (1100 * 218)) * 100, 5)
  })

  it('au point mort, la contribution est nulle', () => {
    const base = { occupation: 60, cost: 143000, jours: 216 }
    const pm = gradeEconomics({ ...base, tjm: 1100 })!.pointMortTjm!
    expect(gradeEconomics({ ...base, tjm: pm })!.contribution).toBeCloseTo(0, 6)
  })

  it('occupation nulle : pas de point mort en TJM, marge nulle', () => {
    const r = gradeEconomics({ tjm: 1000, occupation: 0, cost: 50000, jours: 218 })!
    expect(r.pointMortTjm).toBeNull()
    expect(r.margePct).toBeNull()
    expect(r.contribution).toBe(-50000)
  })

  it('refuse les entrées invalides', () => {
    expect(gradeEconomics({ tjm: 1000, occupation: 70, cost: 1, jours: 0 })).toBeNull()
    expect(gradeEconomics({ tjm: 1000, occupation: 120, cost: 1, jours: 218 })).toBeNull()
    expect(gradeEconomics({ tjm: -1, occupation: 70, cost: 1, jours: 218 })).toBeNull()
  })

  it('grille par défaut : quatre grades ordonnés, libellés uniques', () => {
    expect(DEFAULT_GRADES.map(g => g.position)).toEqual([0, 1, 2, 3])
    expect(new Set(DEFAULT_GRADES.map(g => g.label)).size).toBe(4)
  })
})
