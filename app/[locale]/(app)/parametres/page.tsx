'use client'
export const runtime = 'edge'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'

export default function Page() {
  return (
    <>
      <Topbar title="..." breadcrumb="..." />
      <div className="app-content">
        <p style={{ color: 'var(--text2)', fontSize: 12 }}>// à construire</p>
      </div>
    </>
  )
}
