interface AdminBadgeProps {
  label: string
}

/**
 * Badge "données confidentielles — admin uniquement".
 * Remplace le bloc style inline dupliqué dans financials + profitability.
 */
export function AdminBadge({ label }: AdminBadgeProps) {
  return (
    <div className="admin-badge">
      {label}
    </div>
  )
}