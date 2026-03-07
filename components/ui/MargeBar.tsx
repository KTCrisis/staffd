import { getMargeColor } from '@/lib/utils'

interface MargeBarProps {
  pct: number
}

/**
 * Barre de progression + pourcentage colorisé selon seuils de marge.
 * Utilisée dans financials et profitability.
 * Couleurs via getMargeColor() : ≥25% green · 15-25% gold · <15% pink.
 */
export function MargeBar({ pct }: MargeBarProps) {
  const color = getMargeColor(pct)
  return (
    <div className="marge-bar">
      <div className="marge-bar-track">
        <div
          className="marge-bar-fill"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <span className="marge-bar-label" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}