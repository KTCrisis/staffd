import { ProgressBar } from './ProgressBar'

type KpiAccent = 'green' | 'pink' | 'cyan' | 'gold'

interface KpiCardProps {
  label: string
  value: string | number
  valueSuffix?: string
  sub?: string           // ← texte secondaire sous la valeur (ex: "Tous projets actifs")
  trend?: {
    label: string
    direction: 'up' | 'down' | 'flat'
  }
  accent: KpiAccent
  progress?: number      // 0–100, affiche une barre si fourni
}

export function KpiCard({
  label, value, valueSuffix, sub, trend, accent, progress,
}: KpiCardProps) {
  const trendClass =
    trend?.direction === 'up'   ? 'kpi-trend trend-up'   :
    trend?.direction === 'down' ? 'kpi-trend trend-down' :
    'kpi-trend trend-flat'

  return (
    <div className={`kpi-card kpi-${accent}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {valueSuffix && <span>{valueSuffix}</span>}
      </div>
      {sub && (
        <div className="kpi-sub">{sub}</div>
      )}
      {trend && (
        <div className={trendClass}>{trend.label}</div>
      )}
      {progress !== undefined && (
        <ProgressBar value={progress} style={{ marginTop: 10 }} />
      )}
    </div>
  )
}