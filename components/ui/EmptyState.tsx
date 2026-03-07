interface EmptyStateProps {
  message: string
  sub?: string
}

/**
 * État vide standardisé pour les tableaux et panels.
 * Remplace les blocs style inline { padding: '40px 18px', textAlign: 'center'... }
 */
export function EmptyState({ message, sub }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-msg">{message}</span>
      {sub && <span className="empty-state-sub">{sub}</span>}
    </div>
  )
}