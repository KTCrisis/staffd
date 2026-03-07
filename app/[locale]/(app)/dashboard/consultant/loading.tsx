// app/[locale]/(app)/dashboard/consultant/loading.tsx

export default function ConsultantDashboardLoading() {
  return (
    <div className="app-content">

      {/* Profil */}
      <div className="skeleton" style={{ height: 64, marginBottom: 24 }} />

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 110, animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>

      {/* Two-col missions + CRA */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="skeleton" style={{ height: 180 }} />
        <div className="skeleton" style={{ height: 180 }} />
      </div>

      {/* Congés */}
      <div className="skeleton" style={{ height: 160 }} />

    </div>
  )
}