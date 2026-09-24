import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchPublicHolidays, countryFromHrSettings, clearHolidayCache } from './holidays'

const payload = [
  { date: '2026-01-01', localName: "Jour de l'an", name: "New Year's Day" },
  { date: '2026-05-01', localName: null,           name: 'Labour Day' },
]

function okFetch() {
  return vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })) as unknown as typeof fetch
}

describe('fetchPublicHolidays', () => {
  beforeEach(() => clearHolidayCache())

  it('maps holidays, local name first', async () => {
    const events = await fetchPublicHolidays(2026, 'FR', okFetch())
    expect(events).toEqual([
      { date: '2026-01-01', type: 'holiday', label: "Jour de l'an" },
      { date: '2026-05-01', type: 'holiday', label: 'Labour Day' },
    ])
  })

  it('serves the second call from cache within the day', async () => {
    const f = okFetch()
    await fetchPublicHolidays(2026, 'FR', f, 1_000)
    await fetchPublicHolidays(2026, 'FR', f, 1_000 + 60_000)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('refetches after a day, and per country', async () => {
    const f = okFetch()
    await fetchPublicHolidays(2026, 'FR', f, 0)
    await fetchPublicHolidays(2026, 'IT', f, 0)
    await fetchPublicHolidays(2026, 'FR', f, 25 * 60 * 60 * 1000)
    expect(f).toHaveBeenCalledTimes(3)
  })

  it('returns an empty list when the service fails or times out', async () => {
    const failing = vi.fn(async () => { throw new DOMException('timeout', 'TimeoutError') }) as unknown as typeof fetch
    expect(await fetchPublicHolidays(2026, 'FR', failing)).toEqual([])
  })

  it('returns an empty list on an HTTP error, without caching it', async () => {
    const bad = vi.fn(async () => new Response('nope', { status: 503 })) as unknown as typeof fetch
    expect(await fetchPublicHolidays(2026, 'FR', bad)).toEqual([])
    const f = okFetch()
    expect(await fetchPublicHolidays(2026, 'FR', f)).toHaveLength(2)
  })
})

describe('countryFromHrSettings', () => {
  it('reads country_code, FR by default', () => {
    expect(countryFromHrSettings({ country_code: 'IT' })).toBe('IT')
    expect(countryFromHrSettings(null)).toBe('FR')
    expect(countryFromHrSettings({})).toBe('FR')
  })
})
