// components/clients/ClientDetailClient.tsx
// ── Client Component ─────────────────────────────────────────

'use client'

import { useState }        from 'react'
import { useRouter }       from '@/lib/navigation'
import { useTranslations } from 'next-intl'
import { Panel, Badge }    from '@/components/ui'
import { ClientForm }      from '@/components/clients/ClientForm'

interface Project {
  id:          string
  name:        string
  status:      string
  endDate:     string | null
  budgetTotal: number | null
}

interface Client {
  id:           string
  companyId:    string
  name:         string
  sector:       string | null
  website:      string | null
  contactName:  string | null
  contactEmail: string | null
  contactPhone: string | null
  notes:        string | null
}

interface Props {
  client?:   Client
  projects?: Project[]
}

export function ClientDetailClient({ client, projects = [] }: Props) {
  const t      = useTranslations('clients')
  const router = useRouter()

  const [formOpen, setFormOpen] = useState(false)

  if (!client) return null

  const totalBudget    = projects.reduce((s, p) => s + (p.budgetTotal ?? 0), 0)
  const activeProjects = projects.filter(p => p.status === 'active').length

  return (
    <div className="app-content">

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: t('detail.totalProjects'),  value: projects.length,  color: 'var(--cyan)'  },
          { label: t('detail.activeProjects'), value: activeProjects,   color: 'var(--green)' },
          { label: t('detail.totalRevenue'),   value: totalBudget > 0 ? `${totalBudget.toLocaleString('fr-FR')} €` : '—', color: 'var(--gold)' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ borderTop: `2px solid ${kpi.color}` }}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value" style={{ fontSize: 24, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Infos client */}
        <Panel>
          <div className="panel-header">
            <span className="panel-title">{t('detail.info')}</span>
            <button className="panel-action" onClick={() => setFormOpen(true)}>
              {t('actions.edit')}
            </button>
          </div>
          <div className="panel-body">
            {[
              { label: t('detail.sector'),       value: client.sector
                  ? <span className="badge badge-starting">{client.sector}</span> : '—' },
              { label: t('detail.website'),      value: client.website
                  ? <a href={client.website} target="_blank" rel="noopener" style={{ color: 'var(--cyan)' }}>{client.website.replace(/^https?:\/\//, '')}</a>
                  : '—' },
              { label: t('detail.contactName'),  value: client.contactName  ?? '—' },
              { label: t('detail.contactEmail'), value: client.contactEmail
                  ? <a href={`mailto:${client.contactEmail}`} style={{ color: 'var(--cyan)' }}>{client.contactEmail}</a>
                  : '—' },
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
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg3)', borderRadius: 3, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                {client.notes}
              </div>
            )}
          </div>
        </Panel>

        {/* Historique projets */}
        <Panel>
          <div className="panel-header">
            <span className="panel-title">{t('detail.projects')}</span>
            <button className="panel-action" onClick={() => router.push('/projects' as never)}>
              {t('detail.allProjects')} →
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {projects.length === 0 ? (
              <div style={{ padding: '20px 18px', color: 'var(--text2)', fontSize: 12 }}>
                {t('detail.noProjects')}
              </div>
            ) : (
              projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => router.push('/projects' as never)}
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
                  <Badge variant={p.status as any} />
                </div>
              ))
            )}
          </div>
        </Panel>

      </div>

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-ghost" onClick={() => router.push('/clients' as never)}>
          ← {t('detail.back')}
        </button>
      </div>

      {formOpen && (
        <ClientForm
          client={client as any}
          companyId={client.companyId}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}