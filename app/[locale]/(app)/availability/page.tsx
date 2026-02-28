'use client'

import { useState }             from 'react'
import { useTranslations }      from 'next-intl'
import { Topbar }               from '@/components/layout/Topbar'
import { Panel, StatRow }       from '@/components/ui'
import { AvailabilityGrid }     from '@/components/availability/AvailabilityGrid'
import { CONSULTANTS }          from '@/lib/mock'

// Lundi de la semaine courante
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function DisponibilitesPage() {
  const t = useTranslations('disponibilites')
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const goToday = () => setWeekStart(getMonday(new Date()))

  const isCurrentWeek = getMonday(new Date()).getTime() === weekStart.getTime()

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4)

  const weekLabel = `${t('weekOf')} ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} → ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`

  // Stats semaine
  const stats = [
    { value: CONSULTANTS.filter((c: any) => c.status === 'assigned').length,  label: 'En mission',  color: 'var(--cyan)' },
    { value: CONSULTANTS.filter((c: any) => c.status === 'available').length, label: 'Disponibles', color: 'var(--green)' },
    { value: CONSULTANTS.filter((c: any) => c.status === 'leave').length,     label: 'En congé',    color: 'var(--gold)' },
    { value: CONSULTANTS.filter((c: any) => c.status === 'partial').length,   label: 'Partiel',     color: 'var(--purple)' },
  ]

  return (
    <>
      <Topbar
        title={t('title')}
        breadcrumb={t('breadcrumb')}
        ctaLabel={t('cta')}
        onCta={() => {}}
      />

      <div className="app-content">

        <StatRow stats={stats} />

        {/* Navigation semaine */}
        <div className="week-nav" style={{ marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevWeek}>
            {t('prevWeek')}
          </button>

          <span className="week-label">{weekLabel}</span>

          <button className="btn btn-ghost btn-sm" onClick={nextWeek}>
            {t('nextWeek')}
          </button>

          {!isCurrentWeek && (
            <button
              className="btn btn-primary btn-sm"
              onClick={goToday}
              style={{ marginLeft: 8 }}
            >
              {t('today')}
            </button>
          )}
        </div>

        {/* Grille */}
        <Panel noPadding>
          <div style={{ padding: '14px 18px' }}>
            <AvailabilityGrid
              consultants={CONSULTANTS}
              weekStart={weekStart}
            />
          </div>
        </Panel>

        {/* Légende */}
        <div className="dispo-legend" style={{ marginTop: 14 }}>
          {[
            { cls: 'ac-free',    label: t('legend.free'),    color: 'var(--ac-free-c)' },
            { cls: 'ac-busy',    label: t('legend.busy'),    color: 'var(--ac-busy-c)' },
            { cls: 'ac-partial', label: t('legend.partial'), color: 'var(--ac-partial-c)' },
            { cls: 'ac-leave',   label: t('legend.leave'),   color: 'var(--ac-leave-c)' },
            { cls: 'ac-weekend', label: t('legend.weekend'), color: 'var(--text2)' },
          ].map((item: any) => (
            <div key={item.cls} className="legend-item">
              <div
                className={`legend-dot ${item.cls}`}
                style={{ border: '1px solid currentColor', color: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
