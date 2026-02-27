interface StatItem {
  value: string | number
  label: string
  color?: string    // CSS color
}

interface StatRowProps {
  stats: StatItem[]
}

export function StatRow({ stats }: StatRowProps) {
  return (
    <div className="stat-row">
      {stats.map((s, i) => (
        <div key={i} className="stat-box">
          <div className="stat-n" style={{ color: s.color }}>{s.value}</div>
          <div className="stat-l">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
