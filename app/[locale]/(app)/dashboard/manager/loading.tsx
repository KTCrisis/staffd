// app/[locale]/(app)/dashboard/manager/loading.tsx

export default function ManagerDashboardLoading() {
  return (
    <div className="app-content">

      {/* KPIs */}
      <div className="kpi-grid">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 110, animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>

      {/* Two-col */}
      <div className="two-col">
        <div className="skeleton" style={{ height: 320 }} />
        <div className="dashboard-side">
          <div className="skeleton" style={{ height: 80 }} />
          <div className="skeleton" style={{ height: 140 }} />
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 106 }} />
        </div>
      </div>

    </div>
  )
}