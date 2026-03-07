'use client'

import { useState }        from 'react'
import { useRouter }       from '@/lib/navigation'
import { useTranslations } from 'next-intl'
import { Topbar }          from '@/components/layout/Topbar'
import { Panel, StatRow }  from '@/components/ui'
import { EmptyState }      from '@/components/ui/EmptyState'
import { ClientForm }      from '@/components/clients/ClientForm'
import { useClients, deleteClient } from '@/lib/data'
import { SECTORS }         from '@/components/clients/ClientForm'
import { toast }           from '@/lib/toast'
import type { Client }     from '@/types'

type FilterValue = 'all' | typeof SECTORS[number]

export default function ClientsPage() {
  const t      = useTranslations('clients')
  const router = useRouter()

  const [refresh,    setRefresh]    = useState(0)
  const [filter,     setFilter]     = useState<FilterValue>('all')
  const [search,     setSearch]     = useState('')
  const [formOpen,   setFormOpen]   = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const { data: clients, loading, error } = useClients(refresh)

  const visible = (clients ?? []).filter(c => {
    const matchFilter = filter === 'all' || c.sector === filter
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const stats = [
    { value: (clients ?? []).length,                                           label: t('stats.total'),   color: 'var(--cyan)'  },
    { value: new Set((clients ?? []).map(c => c.sector).filter(Boolean)).size, label: t('stats.sectors'), color: 'var(--gold)'  },
    { value: (clients ?? []).filter(c => (c.activeProjects ?? 0) > 0).length, label: t('stats.active'),  color: 'var(--green)' },
  ]

  function openCreate()                               { setEditClient(null); setFormOpen(true) }
  function openEdit(c: Client, e: React.MouseEvent)  { e.stopPropagation(); setEditClient(c); setFormOpen(true) }

  async function handleDelete(c: Client, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(t('confirmDelete', { name: c.name }))) return
    setDeleting(true)
    try   { await deleteClient(c.id); setRefresh(r => r + 1) }
    catch (err) { toast.error(err) }
    finally     { setDeleting(false) }
  }

  return (
    <>
      <Topbar title={t('title')} breadcrumb={t('breadcrumb')} ctaLabel={t('cta')} onCta={openCreate} />

      <div className="app-content">
        <StatRow stats={stats} />

        {/* Filtres + search */}
        <div className="sort-bar" style={{ flexWrap: 'wrap' }}>
          <button
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('all')}
          >
            {t('filters.all')}
          </button>
          {SECTORS.map(s => (
            <button
              key={s}
              className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
          <input
            className="search-input"
            style={{ marginLeft: 'auto' }}
            placeholder={t('search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading && <EmptyState message={t('loading')} />}
        {error   && <p className="ts-status-msg ts-status-msg--error">{t('error')}: {error}</p>}

        {!loading && !error && (
          <Panel noPadding>
            {visible.length === 0 ? (
              <EmptyState message={t('noResults')} />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('table.name')}</th>
                      <th>{t('table.sector')}</th>
                      <th>{t('table.contact')}</th>
                      <th>{t('table.projects')}</th>
                      <th>{t('table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(c => (
                      <tr key={c.id} onClick={() => router.push(`/clients/${c.id}`)}>
                        <td>
                          <div className="td-primary">{c.name}</div>
                          {c.website && (
                            <div className="td-sub">{c.website.replace(/^https?:\/\//, '')}</div>
                          )}
                        </td>
                        <td>
                          {c.sector
                            ? <span className="badge badge-starting">{c.sector}</span>
                            : <span className="td-empty">—</span>
                          }
                        </td>
                        <td>
                          {c.contactName ? (
                            <div>
                              <div className="client-contact-name">{c.contactName}</div>
                              <div className="td-sub">{c.contactEmail}</div>
                            </div>
                          ) : <span className="td-empty">—</span>}
                        </td>
                        <td>
                          {c.activeProjects != null ? (
                            <span
                              className="client-projects"
                              style={{ color: c.activeProjects > 0 ? 'var(--green)' : 'var(--text2)' }}
                            >
                              {t('activeCount', { count: c.activeProjects })}
                            </span>
                          ) : <span className="td-empty">—</span>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="row-actions">
                            <button className="btn btn-ghost btn-sm" onClick={e => openEdit(c, e)}>
                              {t('actions.edit')}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--pink)' }}
                              onClick={e => handleDelete(c, e)}
                              disabled={deleting}
                            >
                              {t('actions.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {formOpen && (
          <ClientForm
            client={editClient}
            onClose={() => { setFormOpen(false); setEditClient(null) }}
            onSaved={() => setRefresh(r => r + 1)}
          />
        )}
      </div>
    </>
  )
}