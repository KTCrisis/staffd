// components/clients/ClientsClient.tsx
// ── Client Component ─────────────────────────────────────────
// Reçoit clients en props. Gère filter/search/form/delete localement.
// Après mutation → router.refresh() pour re-déclencher le Server Component.

'use client'

import { useState }        from 'react'
import { useRouter }       from '@/lib/navigation'
import { useTranslations } from 'next-intl'
import { Panel, StatRow }  from '@/components/ui'
import { EmptyState }      from '@/components/ui/EmptyState'
import { ClientForm }      from '@/components/clients/ClientForm'
import { SECTORS }         from '@/components/clients/ClientForm'
import { deleteClient }    from '@/lib/data'
import { toast }           from '@/lib/toast'
import type { Client }     from '@/types'

type FilterValue = 'all' | typeof SECTORS[number]

interface Props {
  clients?:   Client[]
  companyId?: string
}

export function ClientsClient({ clients = [], companyId = '' }: Props) {
  const t      = useTranslations('clients')
  const router = useRouter()

  const [filter,     setFilter]     = useState<FilterValue>('all')
  const [search,     setSearch]     = useState('')
  const [formOpen,   setFormOpen]   = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const visible = clients.filter(c => {
    const matchFilter = filter === 'all' || c.sector === filter
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const stats = [
    { value: clients.length,                                           label: t('stats.total'),   color: 'var(--cyan)'  },
    { value: new Set(clients.map(c => c.sector).filter(Boolean)).size, label: t('stats.sectors'), color: 'var(--gold)'  },
    { value: clients.filter(c => (c.activeProjects ?? 0) > 0).length, label: t('stats.active'),  color: 'var(--green)' },
  ]

  function openCreate()                              { setEditClient(null); setFormOpen(true) }
  function openEdit(c: Client, e: React.MouseEvent) { e.stopPropagation(); setEditClient(c); setFormOpen(true) }

  async function handleDelete(c: Client, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(t('confirmDelete', { name: c.name }))) return
    setDeleting(true)
    try {
      await deleteClient(c.id)
      router.refresh() // re-déclenche le Server Component → liste à jour
    } catch (err) {
      toast.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="app-content">
      <StatRow stats={stats} />

      {/* Topbar CTA injecté ici car Topbar est Server */}
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
        <button className="btn btn-primary" onClick={openCreate}>
          {t('cta')}
        </button>
      </div>

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
                  <tr key={c.id} onClick={() => router.push(`/clients/${c.id}` as never)}>
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

      {formOpen && (
        <ClientForm
          client={editClient}
          companyId={companyId}
          onClose={() => { setFormOpen(false); setEditClient(null) }}
          onSaved={() => {
            setFormOpen(false)
            setEditClient(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}