interface ProgressBarProps {
  value: number          // valeur courante
  max?: number           // valeur max (défaut: 100)
  color?: string         // CSS color — auto si absent
  style?: React.CSSProperties
}

/**
 * Barre de progression générique.
 * - Auto-couleur selon value/max si color absent (vert/or/cyan)
 * - prop max pour des barres relatives (ex: marge sur 50%)
 */
export function ProgressBar({ value, max = 100, color, style }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100)

  const fillColor = color ?? (
    pct >= 80 ? 'var(--green)' :
    pct >= 50 ? 'var(--gold)'  :
    'var(--cyan)'
  )

  return (
    <div className="progress-bar" style={style}>
      <div
        className="progress-fill"
        style={{ width: `${pct}%`, background: fillColor }}
      />
    </div>
  )
}