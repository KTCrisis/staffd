'use client'

/**
 * components/bids/PipelineClient.tsx
 * Pre-sales pipeline: open opportunities by stage (kanban), closed ones in
 * tabs, and a drawer to create / edit / close an opportunity.
 */

import { useState }         from 'react'
import { useRouter }        from 'next/navigation'
import { useTranslations }  from 'next-intl'
import { Link }             from '@/lib/navigation'
import type { Tables }      from '@/types/supabase'
import { alpha, fmt, toISO, formatDate } from '@/lib/utils'
import { groupByStage, pipelineKpis, followUpState, sortJournal, type Stage } from '@/lib/crm'
import { JournalEntry, type Interaction } from '@/components/crm/Journal'
import { OpportunityForm }  from './OpportunityForm'

export type Opportunity = Tables<'opportunities'>
export interface ClientOption { id: string; name: string; client_type: string }
export interface OwnerOption  { id: string; name: string }
export interface ContactOption { id: string; name: string; client_id: string }

type Tab = 'open' | 'todo' | 'won' | 'lost'

/** Follow-ups shown in "to do": overdue, today, and the next 7 days. */
const TODO_HORIZON_DAYS = 7

interface Props {
  opportunities: Opportunity[]
  clients:       ClientOption[]
  owners:        OwnerOption[]
  stages:        Stage[]
  interactions:  Interaction[]
  contacts:      ContactOption[]
  myConsultantId: string | null
  companyId:     string | null
  error:         string | null
}

export function PipelineClient({ opportunities, clients, owners, stages, interactions, contacts, myConsultantId, companyId, error }: Props) {
  const t      = useTranslations('crm')
  const router = useRouter()

  const [tab,     setTab]     = useState<Tab>('open')
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [creating, setCreating] = useState(false)

  const kpis      = pipelineKpis(opportunities)
  const columns   = groupByStage(opportunities, stages)
  const clientsBy = new Map(clients.map(c => [c.id, c]))
  const ownersBy  = new Map(owners.map(o => [o.id, o]))
  const oppsBy    = new Map(opportunities.map(o => [o.id, o]))
  const contactsBy = new Map(contacts.map(c => [c.id, c.name]))

  // "To do": pending follow-ups within the horizon, and open deals past their close date
  // Frozen at mount: render must stay pure, and the view is refreshed on each action anyway.
  const [now]    = useState(() => Date.now())
  const today    = toISO(new Date(now))
  const horizon  = toISO(new Date(now + TODO_HORIZON_DAYS * 86_400_000))
  const followUps = sortJournal(interactions.filter(i => {
    const s = followUpState(i, today)
    return s === 'overdue' || s === 'today' || (s === 'upcoming' && i.next_step_due != null && i.next_step_due <= horizon)
  }), today)
  const lateDeals = opportunities.filter(o => o.status === 'open' && o.expected_close_date != null && o.expected_close_date < today)
  const urgent    = followUps.filter(i => followUpState(i, today) !== 'upcoming').length + lateDeals.length
  const [todoError, setTodoError] = useState<string | null>(null)

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
          {(['open', 'todo', 'won', 'lost'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)} className="btn btn-ghost btn-sm" style={{
              borderColor: tab === k ? 'var(--green)' : 'var(--border)',
              color:       tab === k ? 'var(--green)' : 'var(--text2)',
            }}>
              {t(`tabs.${k}`)}
              {k === 'todo' && urgent > 0 && <span style={{ marginLeft: 6, color: 'var(--pink)' }}>{urgent}</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={!companyId}
                title={companyId ? undefined : t('pickTenant')}>
          {t('new')}
        </button>
      </div>

      {tab === 'todo' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">{t('todo.followUps')}</span></div>
            <div className="panel-body" style={{ padding: 0 }}>
              {todoError && <div className="form-error" style={{ margin: 12 }}>{todoError}</div>}
              {followUps.length === 0 && <div style={{ padding: '20px 18px', color: 'var(--text2)', fontSize: 12 }}>{t('todo.noFollowUps')}</div>}
              {followUps.map(i => {
                const opp = i.opportunity_id ? oppsBy.get(i.opportunity_id) : undefined
                return (
                  <JournalEntry key={i.id} i={i}
                    clientName={i.client_id ? clientsBy.get(i.client_id)?.name : undefined}
                    contactName={i.contact_id ? contactsBy.get(i.contact_id) : undefined}
                    oppName={opp?.name} onOpp={opp ? () => setEditing(opp) : undefined}
                    onChanged={() => { setTodoError(null); router.refresh() }} onError={setTodoError} />
                )
              })}
            </div>
          </div>
          <div className="panel">
            <div className="panel-header"><span className="panel-title">{t('todo.lateDeals')}</span></div>
            <div className="panel-body" style={{ padding: 0 }}>
              {lateDeals.length === 0 && <div style={{ padding: '20px 18px', color: 'var(--text2)', fontSize: 12 }}>{t('todo.noLateDeals')}</div>}
              {lateDeals.map(o => (
                <button key={o.id} onClick={() => setEditing(o)} style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: '12px 18px', color: 'var(--text)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{o.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 3 }}>
                    {clientsBy.get(o.client_id)?.name ?? '—'} · {o.amount != null ? fmt(Number(o.amount)) : '—'} ·{' '}
                    <span style={{ color: 'var(--pink)' }}>{t('todo.closeWas', { date: formatDate(o.expected_close_date!) })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : tab === 'open' ? (
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
              <th>{tab === 'won' ? t('table.project') : t('table.reason')}</th>
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
                  {tab === 'won'
                    ? (o.project_id
                        ? <Link href={`/projects?id=${o.project_id}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--cyan)' }}>{t('table.openProject')}</Link>
                        : '—')
                    : (o.lost_reason ?? t(`status.${o.status}`))}
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
          interactions={editing ? interactions.filter(i => i.opportunity_id === editing.id) : []}
          contacts={contacts}
          myConsultantId={myConsultantId}
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
