/**
 * lib/data/core.ts
 * Hook générique useSupabase — partagé par tous les slices
 */

'use client'
import { useEffect, useState } from 'react'

// ──────────────────────────────────────────────────────────────
// HOOK GÉNÉRIQUE
// ──────────────────────────────────────────────────────────────

export function useSupabase<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher()
      .then(d  => { if (!cancelled) { setData(d);          setError(null)    } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
      .finally(()=> { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}