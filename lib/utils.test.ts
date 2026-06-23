import { describe, it, expect } from 'vitest'
import {
  toISO, getMondayOf, addDays, getWeekDays, countWorkingDays,
  getMargeColor, getMargLabel, isCibleAlert, progressColor, pluralFr, truncate,
} from './utils'

// Dates construites avec composants explicites (heure locale) pour éviter
// toute ambiguïté de fuseau. new Date(2026, 5, 24) = 24 juin 2026 (mois 0-indexé).

describe('dates', () => {
  it('toISO formate en YYYY-MM-DD avec padding', () => {
    expect(toISO(new Date(2026, 5, 7))).toBe('2026-06-07')
    expect(toISO(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('getMondayOf retourne toujours un lundi', () => {
    // 24 juin 2026 = mercredi -> lundi 22
    expect(toISO(getMondayOf(new Date(2026, 5, 24)))).toBe('2026-06-22')
    expect(getMondayOf(new Date(2026, 5, 24)).getDay()).toBe(1)
    // dimanche 28 juin -> lundi 22 (cas day===0)
    expect(toISO(getMondayOf(new Date(2026, 5, 28)))).toBe('2026-06-22')
    // un lundi reste ce lundi
    expect(toISO(getMondayOf(new Date(2026, 5, 22)))).toBe('2026-06-22')
  })

  it('addDays fait de l\'arithmétique calendaire', () => {
    expect(toISO(addDays(new Date(2026, 5, 22), 5))).toBe('2026-06-27')
    expect(toISO(addDays(new Date(2026, 5, 30), 1))).toBe('2026-07-01')
  })

  it('getWeekDays retourne les 5 jours ouvrés depuis le lundi', () => {
    const days = getWeekDays(new Date(2026, 5, 22))
    expect(days).toHaveLength(5)
    expect(toISO(days[0])).toBe('2026-06-22')
    expect(toISO(days[4])).toBe('2026-06-26')
  })

  it('countWorkingDays exclut samedi et dimanche', () => {
    expect(countWorkingDays('2026-06-22', '2026-06-26')).toBe(5) // lun->ven
    expect(countWorkingDays('2026-06-22', '2026-06-28')).toBe(5) // +week-end exclu
    expect(countWorkingDays('2026-06-22', '2026-06-22')).toBe(1) // un seul jour ouvré
    expect(countWorkingDays('2026-06-27', '2026-06-28')).toBe(0) // week-end seul
    expect(countWorkingDays('2026-06-26', '2026-06-22')).toBe(0) // fin avant début
  })
})

describe('marge / finance', () => {
  it('getMargeColor applique les seuils 25 / 15', () => {
    expect(getMargeColor(30)).toBe('var(--green)')
    expect(getMargeColor(25)).toBe('var(--green)')
    expect(getMargeColor(20)).toBe('var(--gold)')
    expect(getMargeColor(15)).toBe('var(--gold)')
    expect(getMargeColor(10)).toBe('var(--pink)')
    expect(getMargeColor(null)).toBe('var(--text2)')
    expect(getMargeColor(undefined)).toBe('var(--text2)')
  })

  it('getMargLabel suit les mêmes seuils', () => {
    expect(getMargLabel(30)).toContain('Excellente')
    expect(getMargLabel(20)).toContain('Correcte')
    expect(getMargLabel(10)).toContain('surveiller')
    expect(getMargLabel(null)).toBe('—')
  })

  it('isCibleAlert vrai si écart cible/coût < 10%', () => {
    expect(isCibleAlert(500, 480)).toBe(true)  // 4%
    expect(isCibleAlert(600, 400)).toBe(false) // 33%
    expect(isCibleAlert(null, 400)).toBe(false)
    expect(isCibleAlert(500, null)).toBe(false)
  })

  it('progressColor applique les seuils 80 / 50', () => {
    expect(progressColor(80)).toBe('var(--green)')
    expect(progressColor(50)).toBe('var(--gold)')
    expect(progressColor(10)).toBe('var(--cyan)')
  })
})

describe('texte', () => {
  it('pluralFr', () => {
    expect(pluralFr(1, 'consultant')).toBe('consultant')
    expect(pluralFr(0, 'consultant')).toBe('consultant')
    expect(pluralFr(2, 'consultant')).toBe('consultants')
    expect(pluralFr(3, 'cheval', 'chevaux')).toBe('chevaux')
  })

  it('truncate', () => {
    expect(truncate('court')).toBe('court')
    expect(truncate('a'.repeat(40), 10)).toBe('aaaaaaaaaa…')
  })
})
