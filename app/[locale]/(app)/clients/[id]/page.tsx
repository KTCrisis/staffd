'use client'

/**
 * app/[locale]/(app)/clients/[id]/page.tsx
 * Fiche client — détail + historique projets
 */

import { useState }        from 'react'
import { useParams }       from 'next/navigation'
import { useRouter }       from '@/lib/navigation'
import { useTranslations } from 'next-intl'
import { Topbar }          from '@/components/layout/Topbar'
import { Panel, Badge }    from '@/components/ui'
import { ClientForm }      from '@/components/clients/ClientForm'
import { useClient, useClientProjects } from '@/lib/data'

export default function ClientDetailPage() {
  const t      = useTranslations('clients')
  const router = useRouter()
  const params = useParams()
  const id     = params.id as string

  const [refresh,   setRefresh]   = useState(0)
  const [formOpen,  setFormOpen]  = useState(false)

  const { data: client,   loading: loadingClient  } = useClient(id, refresh)
  const { data: projects, loading: loadingProjects } = useClientProjects(id, refresh)

  if (loadingClient) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
        {t('loading')}
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--pink)', fontSize: 12 }}>
        {t('notFound')}
      </div>
    )
  }

  const totalBudget    = (projects ?? []).reduce((s, p) => s + (p.budgetTotal ?? 0), 0)
  const activeProjects = (projects ?? []).filter(p => p.status === 'active').length

  return (
    <>
      <Topbar
        title={client.name}
        breadcrumb={`${t('breadcrumb')} / ${client.name}`}
        ctaLabel={t('actions.edit')}
        onCta={() => setFormOpen(true)}
      />

      <div className="app-content">

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
          {[
            { label: t('detail.totalProjects'),  value: (projects ?? []).length,  color: 'var(--cyan)' },
            { label: t('detail.activeProjects'),  value: activeProjects,            color: 'var(--green)' },
            { label: t('detail.totalRevenue'),    value: totalBudget > 0 ? `${totalBudget.toLocaleString('fr-FR')} €` : '—', color: 'var(--gold)' },
          ].map((kpi, i) => (
            <div key={i} className="kpi-card" style={{ borderTop: `2px solid ${kpi.color}` }}>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value" style={{ fontSize: 24, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* ── Infos client ── */}
          <Panel>
            <div className="panel-header">
              <span className="panel-title">{t('detail.info')}</span>
            </div>
            <div className="panel-body">
              {[
                { label: t('detail.sector'),       value: client.sector ? <span className="badge badge-starting">{client.sector}</span> : '—' },
                { label: t('detail.website'),      value: client.website
                  ? <a href={client.website} target="_blank" rel="noopener" style={{ color: 'var(--cyan)' }}>{client.website.replace(/^https?:\/\//, '')}</a>
                  : '—'
                },
                { label: t('detail.contactName'),  value: client.contactName  ?? '—' },
                { label: t('detail.contactEmail'), value: client.contactEmail
                  ? <a href={`mailto:${client.contactEmail}`} style={{ color: 'var(--cyan)' }}>{client.contactEmail}</a>
                  : '—'
                },
                { label: t('detail.contactPhone'), value: client.contactPhone ?? '—' },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}

              {client.notes && (
                <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg3)', borderRadius: 3, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                  {client.notes}
                </div>
              )}
            </div>
          </Panel>

          {/* ── Historique projets ── */}
          <Panel>
            <div className="panel-header">
              <span className="panel-title">{t('detail.projects')}</span>
              <button
                className="panel-action"
                onClick={() => router.push('/projects')}
              >
                {t('detail.allProjects')} →
              </button>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {loadingProjects
                ? <div style={{ padding: '20px 18px', color: 'var(--text2)', fontSize: 12 }}>{t('loading')}</div>
                : (projects ?? []).length === 0
                ? <div style={{ padding: '20px 18px', color: 'var(--text2)', fontSize: 12 }}>{t('detail.noProjects')}</div>
                : (projects ?? []).map(p => (
                    <div
                      key={p.id}
                      onClick={() => router.push('/projects')}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 18px', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                          {p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—'}
                          {p.budgetTotal ? ` · ${p.budgetTotal.toLocaleString('fr-FR')} €` : ''}
                        </div>
                      </div>
                      <Badge variant={p.status} />
                    </div>
                  ))
              }
            </div>
          </Panel>

        </div>

        {/* Bouton retour */}
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => router.push('/clients')}>
            ← {t('detail.back')}
          </button>
        </div>

      </div>

      {formOpen && (
        <ClientForm
          client={client}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setRefresh(r => r + 1); setFormOpen(false) }}
        />
      )}
    </>
  )
}