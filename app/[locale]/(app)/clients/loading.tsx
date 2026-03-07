// app/[locale]/(app)/clients/loading.tsx

export default function ClientsLoading() {
  return (
    <div className="app-content">
      <div className="skeleton" style={{ height: 48, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 380 }} />
    </div>
  )
}