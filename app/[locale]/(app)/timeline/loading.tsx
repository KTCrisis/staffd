// app/[locale]/(app)/timeline/loading.tsx

export default function TimelineLoading() {
  return (
    <div className="app-content">
      <div className="skeleton" style={{ height: 48, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 36, width: 280, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 520 }} />
    </div>
  )
}