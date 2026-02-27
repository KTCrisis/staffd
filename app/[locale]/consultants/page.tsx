'use client'

import { useState }          from 'react'
import { useTranslations }   from 'next-intl'
import { Topbar }            from '@/components/layout/Topbar'
import { Panel, StatRow }    from '@/components/ui'
import { ConsultantTable }   from '@/components/consultants/ConsultantTable'
import { CONSULTANTS }       from '@/lib/mock'
import type { ConsultantStatus, Consultant } from '@/types'

export default function ConsultantsPage() {
  const t = useTranslations('consultants')
  const [filter, setFilter]     = useState<ConsultantStatus | 'all'>('all')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Consultant | null>(null)

  const FILTERS: { label: string; value: ConsultantStatus | 'all' }[] = [
    { label: t('filters.all'),       value: 'all' },
    { label: t('filters.assigned'),  value: 'assigned' },
    { label: t('filters.available'), value: 'available' },
    { label: t('filters.leave'),     value: 'leave' },
    { label: t('filters.partial'),   value: 'partial' },
  ]

  const visible = CONSULTANTS.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
                     || c.role.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const stats = [
    { value: CONSULTANTS.filter(c => c.status === 'assigned').length,  label: t('filters.assigned'),  color: 'var(--cyan)' },
    { value: CONSULTANTS.filter(c => c.status === 'available').length, label: t('filters.available'), color: 'var(--green)' },
    { value: CONSULTANTS.filter(c => c.status === 'leave').length,     label: t('filters.leave'),     color: 'var(--gold)' },
    { value: CONSULTANTS.filter(c => c.status === 'partial').length,   label: t('filters.partial'),   color: 'var(--purple)' },
  ]

  const count = visible.length
  const tCommon = useTranslations('common')
  const countLabel = `${count} ${count > 1 ? tCommon('consultants') : tCommon('consultant')}`

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} ctaLabel={t('cta')} onCta={() => {}} />

      <div className="app-content">

        <StatRow stats={stats} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <input
            className="search-input"
            style={{ marginLeft: 'auto' }}
            placeholder={t('table.name') + '...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Panel
          title={countLabel}
          action={{ label: t('export'), onClick: () => {} }}
          noPadding
        >
          {visible.length > 0
            ? <ConsultantTable consultants={visible} onSelect={setSelected} />
            : <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                {t('noResults')}
              </div>
          }
        </Panel>

        {selected && (
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
            background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
            zIndex: 200, padding: 28, overflowY: 'auto',
            boxShadow: '-4px 0 20px var(--shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
                {t('drawer.label')}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                {t('drawer.close')}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div className={`avatar av-${selected.avatarColor}`} style={{ width: 48, height: 48, fontSize: 16 }}>
                {selected.initials}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{selected.role}</div>
              </div>
            </div>

            {[
              { label: t('drawer.status'),    value: <span className={`badge badge-${selected.status}`}>{t(`statuses.${selected.status}`)}</span> },
              { label: t('drawer.project'),   value: selected.currentProject ?? '—' },
              { label: t('drawer.available'), value: selected.availableFrom ? new Date(selected.availableFrom).toLocaleDateString() : t('now') },
              { label: t('drawer.leaveDays'), value: `${selected.leaveDaysLeft} ${tCommon('days')}` },
              { label: t('drawer.occupancy'), value: `${selected.occupancyRate}%` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>
                {t('drawer.rateLabel')}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{selected.occupancyRate}%</div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div className="progress-fill" style={{
                  width: `${selected.occupancyRate}%`,
                  background: selected.occupancyRate >= 80 ? 'var(--green)' : selected.occupancyRate >= 50 ? 'var(--gold)' : 'var(--cyan)'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
              <button className="btn btn-primary" style={{ flex: 1 }}>{t('drawer.edit')}</button>
              <button className="btn btn-ghost" style={{ flex: 1 }}>{t('drawer.history')}</button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
