// app/[locale]/(app)/consultants/loading.tsx

export default function ConsultantsLoading() {
  return (
    <div className="app-content">
      <div className="skeleton" style={{ height: 48, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 420 }} />
    </div>
  )
}