'use client'

interface PanelProps {
  title?: string
  action?: {
    label: string
    onClick: () => void
  }
  children: React.ReactNode
  noPadding?: boolean        // for tables that need edge-to-edge
}

export function Panel({ title, action, children, noPadding }: PanelProps) {
  return (
    <div className="panel">
      {(title || action) && (
        <div className="panel-header">
          {title && <span className="panel-title">{title}</span>}
          {action && (
            <button className="panel-action" onClick={action.onClick}>
              {action.label}
            </button>
          )}
        </div>
      )}
      <div className={noPadding ? '' : 'panel-body'}>
        {children}
      </div>
    </div>
  )
}
