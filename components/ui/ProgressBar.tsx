interface ProgressBarProps {
  value: number          // 0–100
  color?: string         // CSS color or var(--green) etc.
  style?: React.CSSProperties
}

export function ProgressBar({ value, color, style }: ProgressBarProps) {
  // Auto-color based on value if not specified
  const fillColor = color ?? (
    value >= 80 ? 'var(--green)' :
    value >= 50 ? 'var(--gold)'  :
    'var(--cyan)'
  )

  return (
    <div className="progress-bar" style={style}>
      <div
        className="progress-fill"
        style={{ width: `${Math.min(value, 100)}%`, background: fillColor }}
      />
    </div>
  )
}
