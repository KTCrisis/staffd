import { describe, it, expect } from 'vitest'
import { parseStages, DEFAULT_STAGES, stageProbability, estimateAmount, pipelineKpis, groupByStage, clampPct } from './crm'

const item = (stage: string, status: string, amount: number | null, probability = 0) =>
  ({ stage, status, amount, probability, weighted_amount: amount == null ? null : amount * probability / 100 })

describe('parseStages', () => {
  it('falls back to defaults on missing or malformed settings', () => {
    for (const s of [null, {}, { stages: 'x' }, { stages: [] }, { stages: [{ label: 'no key' }] }])
      expect(parseStages(s)).toEqual(DEFAULT_STAGES)
  })
  it('sorts by order, clamps probability, drops duplicate keys', () => {
    const s = parseStages({ stages: [
      { key: 'b', label: 'B', probability: 150, order: 2 },
      { key: 'a', label: 'A', probability: -5, order: 1 },
      { key: 'a', label: 'dup', probability: 50, order: 3 },
    ] })
    expect(s.map(x => [x.key, x.probability])).toEqual([['a', 0], ['b', 100]])
  })
})

describe('helpers', () => {
  it('stageProbability returns 0 for unknown stages', () => {
    expect(stageProbability(DEFAULT_STAGES, 'proposition')).toBe(40)
    expect(stageProbability(DEFAULT_STAGES, 'nope')).toBe(0)
  })
  it('estimateAmount only prices day-based deals', () => {
    expect(estimateAmount('regie', 1100, 210)).toBe(231000)
    expect(estimateAmount('forfait', 1100, 210)).toBeNull()
    expect(estimateAmount('regie', null, 210)).toBeNull()
  })
  it('clampPct handles NaN', () => { expect(clampPct(NaN)).toBe(0) })
})

describe('pipelineKpis', () => {
  it('counts open pipeline, weighted value and win rate', () => {
    const k = pipelineKpis([
      item('proposition', 'open', 100000, 40),
      item('negociation', 'open', 50000, 70),
      item('negociation', 'won', 80000),
      item('qualification', 'lost', 20000),
      item('qualification', 'lost', null),
    ])
    expect(k).toEqual({ openCount: 2, openAmount: 150000, weighted: 75000, wonAmount: 80000, lostCount: 2, winRate: 1 / 3 })
  })
  it('has no win rate before anything is closed', () => {
    expect(pipelineKpis([item('proposition', 'open', 1)]).winRate).toBeNull()
  })
})

describe('groupByStage', () => {
  it('keeps closed deals out and orphan stages visible', () => {
    const cols = groupByStage([item('proposition', 'open', 1), item('old', 'open', 2), item('proposition', 'won', 3)], DEFAULT_STAGES)
    expect(cols.map(c => [c.stage.key, c.items.length])).toEqual([['qualification', 0], ['proposition', 1], ['negociation', 0], ['__unknown', 1]])
  })
})

import { followUpState, sortJournal } from './crm'

describe('followUpState', () => {
  const base = { next_step: 'rappeler', next_step_due: null as string | null, next_step_done: false }
  it('classifies relative to today', () => {
    expect(followUpState({ next_step: null, next_step_due: null, next_step_done: false }, '2026-09-23')).toBe('none')
    expect(followUpState({ ...base, next_step_due: '2026-09-20' }, '2026-09-23')).toBe('overdue')
    expect(followUpState({ ...base, next_step_due: '2026-09-23' }, '2026-09-23')).toBe('today')
    expect(followUpState({ ...base, next_step_due: '2026-10-01' }, '2026-09-23')).toBe('upcoming')
    expect(followUpState({ ...base, next_step_due: '2026-09-01', next_step_done: true }, '2026-09-23')).toBe('done')
  })
})

describe('sortJournal', () => {
  it('puts pending follow-ups first by due date, then history newest first', () => {
    const mk = (id: string, occurred_at: string, due: string | null, done = false) =>
      ({ id, occurred_at, next_step: due ? 'x' : null, next_step_due: due, next_step_done: done })
    const out = sortJournal([
      mk('old', '2026-09-01', null),
      mk('later', '2026-09-10', '2026-10-05'),
      mk('done', '2026-09-15', '2026-09-16', true),
      mk('late', '2026-09-05', '2026-09-12'),
      mk('new', '2026-09-20', null),
    ], '2026-09-23')
    expect(out.map(i => i.id)).toEqual(['late', 'later', 'new', 'done', 'old'])
  })
})
