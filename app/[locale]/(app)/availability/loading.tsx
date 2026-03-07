// app/[locale]/(app)/availability/loading.tsx

export default function AvailabilityLoading() {
  return (
    <div className="app-content">
      <div className="skeleton" style={{ height: 36, width: 280, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 48, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 480 }} />
    </div>
  )
}