import { Topbar } from '@/components/layout/Topbar'

export default function Page() {
  return (
    <>
      <Topbar title="projets" breadcrumb="// projets" />
      <div className="app-content">
        <p style={{ color: 'var(--text2)', fontSize: 12 }}>// projets — à construire</p>
      </div>
    </>
  )
}
