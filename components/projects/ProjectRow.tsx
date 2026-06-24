'use client'

import type { Project, Consultant } from '@/types'
import { ProgressBar }              from '@/components/ui/ProgressBar'
import { Avatar }                   from '@/components/ui/Avatar'
import { formatDate }               from '@/lib/utils'
import { useTranslations }          from 'next-intl'

interface ProjectRowProps {
  project:     Project
  consultants: Consultant[]
  onClick?:    () => void
}

// Le projet peut arriver en camelCase (hooks) OU en snake_case (Server Component raw)
type ProjectRaw = Project & {
  consultant_ids?: string[]
  client_name?:    string | null
  end_date?:       string | null
}

export function ProjectRow({ project, consultants = [], onClick }: ProjectRowProps) {
  const t = useTranslations('projects')

  const p = project as ProjectRaw

  // Supporte camelCase (hooks) ET snake_case (Server Component raw)
  const consultantIds: string[] =
    p.consultantIds ??
    p.consultant_ids ??
    []

  const members = consultantIds
    .slice(0, 3)
    .map(id => consultants.find(c => c.id === id))
    .filter(Boolean) as Consultant[]

  const extra    = Math.max(0, consultantIds.length - 3)
  const progress = p.progress ?? 0
  const dueDate  = p.endDate ?? p.end_date

  const pctColor =
    progress >= 80 ? 'var(--green)' :
    progress >= 50 ? 'var(--gold)'  :
    'var(--cyan)'

  return (
    <div className="project-row" onClick={onClick}>
      {/* Name + client */}
      <div>
        <div className="pr-name">{project.name}</div>
        <div className="pr-client">
          {p.clientName ?? p.client_name ?? '—'}
          {' · '}
          {t('consultantCount', { count: consultantIds.length })}
        </div>
      </div>

      {/* Team avatars */}
      <div className="pr-team">
        {members.map(c => (
          <div key={c.id} className="pr-member">
            <Avatar initials={c.initials} color={c.avatarColor} size="sm" />
          </div>
        ))}
        {extra > 0 && (
          <div
            className="pr-member"
            style={{ background: 'var(--bg4)', color: 'var(--text2)', borderColor: 'var(--border)' }}
          >
            +{extra}
          </div>
        )}
      </div>

      {/* Progress */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: pctColor }}>
          {progress}%
        </div>
        <ProgressBar value={progress} style={{ marginTop: 4 }} />
      </div>

      {/* Due date */}
      <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'right' }}>
        {dueDate ? formatDate(dueDate) : '—'}
      </div>
    </div>
  )
}