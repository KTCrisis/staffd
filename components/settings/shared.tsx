'use client'

// ══════════════════════════════════════════════════════════════
// components/settings/shared.tsx
// Composants partagés entre tous les onglets Settings
// ══════════════════════════════════════════════════════════════

import { useTranslations } from 'next-intl'

export function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 9, color: 'var(--text2)', letterSpacing: 3,
      textTransform: 'uppercase', marginBottom: 16,
    }}>
      // {label}
    </div>
  )
}

export function ComingSoon({ label }: { label: string }) {
  const t = useTranslations('settings')
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4,
    }}>
      <div style={{ fontSize: 20, marginBottom: 12, opacity: 0.4 }}>⚙</div>
      <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 2, textTransform: 'uppercase' }}>
        {t('comingSoon', { label })}
      </div>
    </div>
  )
}

export function SettingsField({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
        color: 'var(--text2)',
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 9, color: 'var(--text2)', opacity: 0.7 }}>{hint}</div>
      )}
    </div>
  )
}

export function SettingsInput({
  value, onChange, placeholder, type = 'text', disabled,
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', background: 'var(--bg3)',
        border: '1px solid var(--border2)',
        color: disabled ? 'var(--text2)' : 'var(--text)',
        padding: '8px 12px', borderRadius: 2,
        fontSize: 12, fontFamily: 'inherit',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

export function SettingsTextarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', background: 'var(--bg3)',
        border: '1px solid var(--border2)',
        color: 'var(--text)', padding: '8px 12px', borderRadius: 2,
        fontSize: 12, fontFamily: 'inherit', resize: 'vertical',
      }}
    />
  )
}

export function SaveBar({
  dirty, saving, onSave, onReset,
}: {
  dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void
}) {
  const t = useTranslations('settings')
  if (!dirty && !saving) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', marginTop: 16,
      background: 'rgba(0,229,255,.06)',
      border: '1px solid rgba(0,229,255,.25)',
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 10, color: 'var(--cyan)', letterSpacing: 1 }}>
        {t('unsavedChanges')}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={saving}>
          {t('reset')}
        </button>
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving ? '...' : t('saveChanges')}
        </button>
      </div>
    </div>
  )
}

export function Skeleton({ h = 60 }: { h?: number }) {
  return <div style={{ height: h, background: 'var(--bg3)', borderRadius: 4 }} />
}

export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    manager:    { bg: 'rgba(255,209,102,0.1)', color: 'var(--gold)', border: 'rgba(255,209,102,0.3)' },
    admin:      { bg: 'rgba(255,45,107,0.1)',  color: 'var(--pink)', border: 'rgba(255,45,107,0.3)' },
    consultant: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text2)', border: 'var(--border)' },
    freelance:  { bg: 'rgba(0,229,255,0.08)',  color: 'var(--cyan)',  border: 'rgba(0,229,255,0.25)' },
  }
  const s = colors[role] ?? colors.consultant
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      padding: '2px 6px', borderRadius: 2,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {role}
    </span>
  )
}

export function ToggleRow({
  label, hint, checked, onChange,
}: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none',
          background: checked ? 'var(--green)' : 'var(--border2)',
          cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#000', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 4,
      background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.2)',
      fontSize: 11, color: 'var(--pink)',
    }}>
      ⚠ {message}
    </div>
  )
}