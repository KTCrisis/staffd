import { getMargeColor } from '@/lib/utils'

const ITEMS = [
  { pct: 25, label: 'Marge ≥ 25% — Excellente' },
  { pct: 15, label: 'Marge 15–25% — Correcte'  },
  { pct:  0, label: 'Marge < 15% — À surveiller' },
]

interface MargeLegendProps {
  note?: string   // texte optionnel à droite (ex: note sur calcul du coût)
}

/**
 * Légende couleurs de marge réutilisable.
 * Remplace les blocs inline dupliqués dans financials + profitability.
 */
export function MargeLegend({ note }: MargeLegendProps) {
  return (
    <div className="marge-legend">
      {ITEMS.map(item => (
        <div key={item.label} className="marge-legend-item">
          <div
            className="marge-legend-dot"
            style={{ background: getMargeColor(item.pct) }}
          />
          <span>{item.label}</span>
        </div>
      ))}
      {note && (
        <span className="marge-legend-note">{note}</span>
      )}
    </div>
  )
}