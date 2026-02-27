'use client'

import type { Project, Consultant } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Avatar }      from '@/components/ui/Avatar'
import { formatDate }  from '@/lib/utils'

interface ProjectRowProps {
  project: Project
  consultants: Consultant[]   // full list to resolve avatars
  onClick?: () => void
}

export function ProjectRow({ project, consultants, onClick }: ProjectRowProps) {
  const members = project.consultantIds
    .slice(0, 3)
    .map(id => consultants.find(c => c.id === id))
    .filter(Boolean) as Consultant[]

  const extra = project.consultantIds.length - 3

  const pctColor =
    project.progress >= 80 ? 'var(--green)' :
    project.progress >= 50 ? 'var(--gold)'  :
    'var(--cyan)'

  return (
    <div className="project-row" onClick={onClick}>
      {/* Name + client */}
      <div>
        <div className="pr-name">{project.name}</div>
        <div className="pr-client">
          {project.client} · {project.consultantIds.length} consultant{project.consultantIds.length > 1 ? 's' : ''}
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
          {project.progress}%
        </div>
        <ProgressBar value={project.progress} style={{ marginTop: 4 }} />
      </div>

      {/* Due date */}
      <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'right' }}>
        {formatDate(project.endDate)}
      </div>
    </div>
  )
}
