'use client'

import { useTranslations } from 'next-intl'
import { getMargeColor }   from '@/lib/utils'

// Seuils alignés sur getMargeColor (25 / 15)
const ITEMS = [
  { pct: 25, key: 'good'  },
  { pct: 15, key: 'watch' },
  { pct:  0, key: 'low'   },
] as const

interface MargeLegendProps {
  note?: string   // texte optionnel à droite (ex: note sur calcul du coût)
}

/**
 * Légende couleurs de marge réutilisable.
 * Remplace les blocs inline dupliqués dans financials + profitability.
 */
export function MargeLegend({ note }: MargeLegendProps) {
  const t = useTranslations('financials.legend')
  return (
    <div className="marge-legend">
      {ITEMS.map(item => (
        <div key={item.key} className="marge-legend-item">
          <div
            className="marge-legend-dot"
            style={{ background: getMargeColor(item.pct) }}
          />
          <span>{t(item.key)}</span>
        </div>
      ))}
      {note && (
        <span className="marge-legend-note">{note}</span>
      )}
    </div>
  )
}