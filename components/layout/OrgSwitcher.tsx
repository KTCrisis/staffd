'use client'

/**
 * components/layout/OrgSwitcher.tsx
 * Dropdown super_admin — navigue entre les tenants.
 * Remplace le badge statique "staff7" dans la Topbar.
 *
 * Comportement :
 *   - Charge toutes les companies depuis Supabase (super_admin bypass RLS)
 *   - "⚡ All tenants" → activeTenantId = null (données toutes companies)
 *   - Sélection d'une company → activeTenantId = company.id
 *   - Le label actif s'affiche dans la Topbar, identique visuellement au badge tenant
 */

import { useState, useEffect, useRef }  from 'react'
import { supabase }                      from '@/lib/supabase'
import { useActiveTenant }               from '@/lib/tenant-context'

interface Company {
  id:   string
  name: string
  mode: 'solo' | 'team'
}

export function OrgSwitcher() {
  const { activeTenantId, setActiveTenantId } = useActiveTenant()
  const [companies, setCompanies] = useState<Company[]>([])
  const [open,      setOpen]      = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Charger toutes les companies (super_admin voit tout via RLS)
  useEffect(() => {
    supabase
      .from('companies')
      .select('id, name, mode')
      .order('name')
      .then(({ data }) => setCompanies((data ?? []) as Company[]))
  }, [])

  // Fermer en cliquant en dehors
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  const active = companies.find(c => c.id === activeTenantId)
  const label  = active ? active.name : 'All tenants'

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* ── Trigger button — même style que le badge tenant normal ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           6,
          padding:       '4px 10px',
          borderRadius:  3,
          border:        `1px solid ${open ? 'rgba(0,229,255,0.6)' : 'rgba(0,229,255,0.3)'}`,
          background:    open ? 'rgba(0,229,255,0.12)' : 'rgba(0,229,255,0.06)',
          fontSize:      10,
          letterSpacing: 1,
          fontWeight:    700,
          color:         'var(--cyan)',
          textTransform: 'uppercase',
          whiteSpace:    'nowrap',
          cursor:        'pointer',
          fontFamily:    'inherit',
          transition:    'all 0.15s',
        }}
      >
        <span style={{ fontSize: 8, opacity: 0.8 }}>⚡</span>
        {label}
        <span style={{
          fontSize:   8,
          opacity:    0.6,
          marginLeft: 2,
          transform:  open ? 'rotate(180deg)' : 'none',
          display:    'inline-block',
          transition: 'transform 0.15s',
        }}>
          ▾
        </span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position:  'absolute',
          top:       'calc(100% + 6px)',
          right:     0,
          minWidth:  200,
          background: 'var(--bg2)',
          border:    '1px solid var(--border2)',
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex:    999,
          overflow:  'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding:       '8px 14px 6px',
            fontSize:      8,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color:         'var(--text2)',
            borderBottom:  '1px solid var(--border)',
          }}>
            // switch_tenant
          </div>

          {/* All tenants option */}
          <DropdownItem
            label="⚡ All tenants"
            sub={`${companies.length} companies`}
            active={activeTenantId === null}
            onClick={() => { setActiveTenantId(null); setOpen(false) }}
          />

          {/* Divider */}
          {companies.length > 0 && (
            <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
          )}

          {/* Company list */}
          {companies.map(c => (
            <DropdownItem
              key={c.id}
              label={c.name}
              sub={c.mode === 'solo' ? 'solo' : 'team'}
              active={activeTenantId === c.id}
              onClick={() => { setActiveTenantId(c.id); setOpen(false) }}
            />
          ))}

          {companies.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text2)' }}>
              Loading…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Item interne ────────────────────────────────────────────────

function DropdownItem({
  label, sub, active, onClick,
}: {
  label:   string
  sub?:    string
  active:  boolean
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width:       '100%',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'space-between',
        gap:         8,
        padding:     '9px 14px',
        background:  active
          ? 'rgba(0,229,255,0.08)'
          : hover ? 'var(--bg3)' : 'transparent',
        border:      'none',
        borderLeft:  active ? '2px solid var(--cyan)' : '2px solid transparent',
        cursor:      'pointer',
        textAlign:   'left',
        fontFamily:  'inherit',
        transition:  'background 0.1s',
      }}
    >
      <span style={{
        fontSize:   11,
        fontWeight: active ? 700 : 400,
        color:      active ? 'var(--cyan)' : 'var(--text)',
      }}>
        {label}
      </span>
      {sub && (
        <span style={{
          fontSize:      8,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color:         'var(--text2)',
          flexShrink:    0,
        }}>
          {sub}
        </span>
      )}
    </button>
  )
}