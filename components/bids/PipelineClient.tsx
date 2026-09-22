'use client'

/**
 * components/bids/PipelineClient.tsx
 * Pre-sales pipeline: open opportunities by stage (kanban), closed ones in
 * tabs, and a drawer to create / edit / close an opportunity.
 */

import { useState }         from 'react'
import { useRouter }        from 'next/navigation'
import { useTranslations }  from 'next-intl'
import type { Tables }      from '@/types/supabase'
import { alpha, fmt }       from '@/lib/utils'
import { groupByStage, pipelineKpis, type Stage } from '@/lib/crm'
import { OpportunityForm }  from './OpportunityForm'

export type Opportunity = Tables<'opportunities'>
export interface ClientOption { id: string; name: string; client_type: string }
export interface OwnerOption  { id: string; name: string }

type Tab = 'open' | 'won' | 'lost'

interface Props {
  opportunities: Opportunity[]
  clients:       ClientOption[]
  owners:        OwnerOption[]
  stages:        Stage[]
  companyId:     string | null
  error:         string | null
}

export function PipelineClient({ opportunities, clients, owners, stages, companyId, error }: Props) {
  const t      = useTranslations('crm')
  const router = useRouter()

  const [tab,     setTab]     = useState<Tab>('open')
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [creating, setCreating] = useState(false)

  const kpis      = pipelineKpis(opportunities)
  const columns   = groupByStage(opportunities, stages)
  const clientsBy = new Map(clients.map(c => [c.id, c]))
  const ownersBy  = new Map(owners.map(o => [o.id, o]))
  const closed    = opportunities.filter(o =>
    tab === 'won' ? o.status === 'won' : o.status === 'lost' || o.status === 'abandoned')

  const closeDrawer = () => { setEditing(null); setCreating(false) }
  const saved       = () => { closeDrawer(); router.refresh() }

  return (
    <div className="app-content">
      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <Kpi label={t('kpi.open')}     value={fmt(kpis.openAmount)} sub={t('kpi.openCount', { count: kpis.openCount })} />
        <Kpi label={t('kpi.weighted')} value={fmt(kpis.weighted)}   sub={t('kpi.weightedSub')} color="var(--green)" />
        <Kpi label={t('kpi.won')}      value={fmt(kpis.wonAmount)}  color="var(--cyan)" />
        <Kpi label={t('kpi.winRate')}
             value={kpis.winRate == null ? '—' : `${Math.round(kpis.winRate * 100)} %`}
             sub={t('kpi.lostCount', { count: kpis.lostCount })} />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['open', 'won', 'lost'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)} className="btn btn-ghost btn-sm" style={{
              borderColor: tab === k ? 'var(--green)' : 'var(--border)',
              color:       tab === k ? 'var(--green)' : 'var(--text2)',
            }}>
              {t(`tabs.${k}`)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={!companyId}
                title={companyId ? undefined : t('pickTenant')}>
          {t('new')}
        </button>
      </div>

      {tab === 'open' ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))`, gap: 12, overflowX: 'auto' }}>
          {columns.map(({ stage, items }) => {
            const total = items.reduce((s, o) => s + (Number(o.amount) || 0), 0)
            return (
              <div key={stage.key} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, minHeight: 200 }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text)' }}>
                      {stage.key === '__unknown' ? t('unknownStage') : stage.label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text2)' }}>{stage.probability} %</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                    {items.length} · {fmt(total)}
                  </div>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.length === 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.6, padding: 6 }}>{t('emptyColumn')}</div>
                  )}
                  {items.map(o => (
                    <Card key={o.id} o={o} t={t}
                          client={o.client_id ? clientsBy.get(o.client_id) : undefined}
                          endClient={o.end_client_id ? clientsBy.get(o.end_client_id) : undefined}
                          owner={o.owner_id ? ownersBy.get(o.owner_id) : undefined}
                          onClick={() => setEditing(o)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('table.name')}</th>
              <th>{t('table.client')}</th>
              <th>{t('table.type')}</th>
              <th style={{ textAlign: 'right' }}>{t('table.amount')}</th>
              <th>{tab === 'won' ? t('table.closeDate') : t('table.reason')}</th>
            </tr>
          </thead>
          <tbody>
            {closed.length === 0 && (
              <tr><td colSpan={5} style={{ color: 'var(--text2)', fontSize: 11 }}>{t('emptyClosed')}</td></tr>
            )}
            {closed.map(o => (
              <tr key={o.id} onClick={() => setEditing(o)} style={{ cursor: 'pointer' }}>
                <td className="td-primary">{o.name}</td>
                <td>{clientsBy.get(o.client_id)?.name ?? '—'}</td>
                <td>{t(`dealType.${o.deal_type}`)}</td>
                <td style={{ textAlign: 'right' }}>{o.amount != null ? fmt(Number(o.amount)) : '—'}</td>
                <td style={{ color: 'var(--text2)', fontSize: 11 }}>
                  {tab === 'won' ? (o.expected_close_date ?? '—') : (o.lost_reason ?? t(`status.${o.status}`))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Editing works on any row; creating needs a tenant (the button is disabled otherwise). */}
      {(editing || (creating && companyId)) && (
        <OpportunityForm
          opportunity={editing}
          stages={stages}
          clients={clients}
          owners={owners}
          companyId={editing?.company_id ?? companyId ?? ''}
          onClose={closeDrawer}
          onSaved={saved}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function Kpi({ label, value, sub, color = 'var(--text)' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '18px 22px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4 }}>
      <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Card({ o, client, endClient, owner, onClick, t }: {
  o:          Opportunity
  client?:    ClientOption
  endClient?: ClientOption
  owner?:     OwnerOption
  onClick:    () => void
  t:          ReturnType<typeof useTranslations>
}) {
  const late = o.expected_close_date != null && o.expected_close_date < new Date().toISOString().slice(0, 10)
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', width: '100%', cursor: 'pointer', fontFamily: 'inherit',
      background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 3, padding: '10px 12px',
      color: 'var(--text)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{o.name}</div>
      <div style={{ fontSize: 10, color: 'var(--text2)' }}>
        {client?.name ?? '—'}{endClient ? ` → ${endClient.name}` : ''}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 12 }}>{o.amount != null ? fmt(Number(o.amount)) : '—'}</span>
        <span style={{
          fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 2,
          color: 'var(--cyan)', background: alpha('var(--cyan)', 10), border: `1px solid ${alpha('var(--cyan)', 30)}`,
        }}>
          {t(`dealType.${o.deal_type}`)}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: 'var(--text2)' }}>
        <span>{owner?.name ?? ''}</span>
        <span style={{ color: late ? 'var(--pink)' : undefined }}>{o.expected_close_date ?? ''}</span>
      </div>
    </button>
  )
}
