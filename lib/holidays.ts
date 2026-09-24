// lib/holidays.ts
// Jours fériés publics (API date.nager.at), pour les calendriers des tableaux de bord.
//
// L'appel était fait à chaque affichage, sans délai maximal : un service tiers
// lent rendait le tableau de bord lent. Ici : délai maximal de 1,5 s, résultat
// gardé en mémoire de l'isolat pour la journée, et liste vide en cas d'échec
// (le calendrier s'affiche sans jours fériés plutôt que de bloquer).

export interface HolidayEvent {
  date:  string
  type:  'holiday'
  label: string
}

interface NagerHoliday {
  date:      string
  localName: string | null
  name:      string
}

const TTL_MS     = 24 * 60 * 60 * 1000
const TIMEOUT_MS = 1500
const memo = new Map<string, { at: number; events: HolidayEvent[] }>()

export async function fetchPublicHolidays(
  year: number,
  countryCode: string,
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<HolidayEvent[]> {
  const key = `${year}-${countryCode}`
  const hit = memo.get(key)
  if (hit && now - hit.at < TTL_MS) return hit.events

  try {
    const res = await fetchImpl(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    )
    if (!res.ok) return []
    const data = (await res.json()) as NagerHoliday[] | null
    const events = (data ?? []).map(h => ({
      date:  h.date,
      type:  'holiday' as const,
      label: h.localName ?? h.name,
    }))
    memo.set(key, { at: now, events })
    return events
  } catch {
    return []
  }
}

/** Code pays des réglages RH de la société (FR par défaut). */
export function countryFromHrSettings(hr: unknown): string {
  return (hr as { country_code?: string } | null)?.country_code ?? 'FR'
}

/** Vide le cache (tests). */
export function clearHolidayCache() {
  memo.clear()
}
