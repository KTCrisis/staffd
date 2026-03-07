// app/[locale]/(app)/dashboard/admin/loading.tsx
// Affiché instantanément par Next.js pendant que page.tsx fetche les données.
// Reprend la structure exacte de la page pour éviter le layout shift.

export default function AdminDashboardLoading() {
  return (
    <div className="app-content">

      {/* KPIs */}
      <div className="kpi-grid">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 110, animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>

      {/* Panel projets */}
      <div className="skeleton" style={{ height: 120 }} />

      {/* Two-col */}
      <div className="two-col">
        <div className="skeleton" style={{ height: 280 }} />
        <div className="dashboard-side">
          <div className="skeleton" style={{ height: 160 }} />
          <div className="skeleton" style={{ height: 106 }} />
        </div>
      </div>

    </div>
  )
}