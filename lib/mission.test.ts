import { describe, it, expect } from 'vitest'
import { projectRevenue, billedChain } from './mission'

describe('projectRevenue', () => {
  it('régie = TJM × jours', () => {
    expect(projectRevenue({ billing_mode: 'regie', tjm_vendu: 1100, jours_vendus: 210 })).toBe(231000)
  })
  it('forfait = budget, whatever the rate', () => {
    expect(projectRevenue({ billing_mode: 'forfait', budget_total: 45000, tjm_vendu: 1100, jours_vendus: 10 })).toBe(45000)
  })
  it('unknown until the inputs exist', () => {
    expect(projectRevenue({ billing_mode: 'regie', tjm_vendu: 1100 })).toBeNull()
    expect(projectRevenue({ billing_mode: 'forfait' })).toBeNull()
  })
  it('defaults to régie when the mode is missing', () => {
    expect(projectRevenue({ tjm_vendu: 500, jours_vendus: 2 })).toBe(1000)
  })
})

describe('billedChain', () => {
  it('shows the intermediary before the end client', () => {
    expect(billedChain('Ab Conseil', 'Mobilize')).toBe('Ab Conseil → Mobilize')
    expect(billedChain('Mobilize', null)).toBe('Mobilize')
    expect(billedChain('Mobilize', 'Mobilize')).toBe('Mobilize')
    expect(billedChain(null, null)).toBe('—')
  })
})
