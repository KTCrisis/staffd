// components/docs/index.tsx
// ══════════════════════════════════════════════════════════════
// Composants partagés pour /docs, /docs/platform, /docs/ai
// Un seul fichier — pas de duplication entre les pages
// ══════════════════════════════════════════════════════════════

'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

// ── DocNav ───────────────────────────────────────────────────

export function DocNav({ active }: { active: 'home' | 'platform' | 'ai' }) {
  return (
    <nav className="doc-nav">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link href="/docs" className="doc-nav-logo">
          <span className="s">staff</span><span className="d">7</span>
        </Link>
        <span className="doc-nav-tag">// docs</span>
      </div>
      <ul className="doc-nav-links">
        <li>
          <Link href="/docs/platform" className={active === 'platform' ? 'active' : ''}>
            Platform
          </Link>
        </li>
        <li>
          <Link href="/docs/ai" className={active === 'ai' ? 'active-ai' : ''}>
            AI layer
          </Link>
        </li>
        <li>
          <Link href="/login?demo=admin" className="doc-nav-demo">
            try demo →
          </Link>
        </li>
        <li>
          <a href="mailto:flux7art@gmail.com" className="doc-nav-cta">
            join beta →
          </a>
        </li>
      </ul>
    </nav>
  )
}

// ── DocSidebar ───────────────────────────────────────────────

interface SidebarSection {
  id:    string
  label: string
  icon:  string
}

export function DocSidebar({ sections, active, variant = 'platform', crossLink }: {
  sections:   SidebarSection[]
  active:     string
  variant?:   'platform' | 'ai'
  crossLink?: { href: string; label: string; color: string }
}) {
  const activeClass = variant === 'ai' ? 'doc-sidebar-link--active-ai' : 'doc-sidebar-link--active'

  return (
    <aside className="doc-sidebar">
      <div className="doc-sidebar-label">
        // {variant === 'ai' ? 'ai layer' : 'platform'} docs
      </div>
      {sections.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`doc-sidebar-link ${active === s.id ? activeClass : ''}`}
        >
          <span className="doc-sidebar-icon">{s.icon}</span>
          {s.label}
        </a>
      ))}
      {crossLink && (
        <div className="doc-sidebar-cross">
          <Link href={crossLink.href} style={{
            background: `${crossLink.color}06`,
            border: `1px solid ${crossLink.color}20`,
            color: crossLink.color,
          }}>
            {crossLink.label}
          </Link>
        </div>
      )}
    </aside>
  )
}

// ── Section ──────────────────────────────────────────────────

export function Section({ id, label, icon, color = 'var(--cyan)', children }: {
  id: string; label: string; icon: string; color?: string; children: ReactNode
}) {
  return (
    <section id={id} className="doc-section">
      <div className="doc-section-header">
        <span className="doc-section-icon" style={{ color }}>{icon}</span>
        <div>
          <div className="doc-section-id">// {id}</div>
          <h2 className="doc-section-title">{label}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

// ── FeatureGrid ──────────────────────────────────────────────

export function FeatureGrid({ items }: { items: { icon: string; title: string; desc: string }[] }) {
  return (
    <div className="doc-features">
      {items.map(item => (
        <div key={item.title} className="doc-feature">
          <div className="doc-feature-icon">{item.icon}</div>
          <div className="doc-feature-title">{item.title}</div>
          <div className="doc-feature-desc">{item.desc}</div>
        </div>
      ))}
    </div>
  )
}

// ── CodeBlock ────────────────────────────────────────────────

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="doc-code"><code>{children}</code></pre>
  )
}

// ── Table ────────────────────────────────────────────────────

export function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead>
          <tr>
            {headers.map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} dangerouslySetInnerHTML={{ __html: cell }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Note ─────────────────────────────────────────────────────

export function Note({ color = 'var(--gold)', children }: { color?: string; children: ReactNode }) {
  return (
    <div className="doc-note" style={{
      background: `${color}08`,
      border: `1px solid ${color}25`,
    }}>
      {children}
    </div>
  )
}

// ── Screenshot ───────────────────────────────────────────────

export function Screenshot({ src, alt, caption }: {
  src?: string; alt?: string; caption?: string
}) {
  return (
    <div className="doc-screenshot">
      {src ? (
        <img src={src} alt={alt ?? ''} />
      ) : (
        <span className="doc-screenshot-placeholder">// screenshot coming soon</span>
      )}
      {caption && <div className="doc-screenshot-caption">{caption}</div>}
    </div>
  )
}

// ── Demo banner ──────────────────────────────────────────────

export function DemoBanner() {
  return (
    <div className="doc-demo-banner">
      <div>
        <div className="doc-demo-banner-text">
          <strong>Try staff7 live</strong> — explore the platform with pre-loaded demo data.
          Switch between admin, manager, and consultant views.
        </div>
        <div className="doc-demo-banner-creds">
          <span className="doc-demo-banner-cred">admin · demo1@staff7.art</span>
          <span className="doc-demo-banner-cred">manager · flux7art+alice@gmail.com</span>
          <span className="doc-demo-banner-cred">consultant · flux7art+emma@gmail.com</span>
        </div>
      </div>
      <Link href="/login?demo=admin" className="doc-demo-banner-btn">
        open demo →
      </Link>
    </div>
  )
}

// ── CmdRow (AI docs only) ────────────────────────────────────

export function CmdRow({ cmd, color, desc, context }: {
  cmd: string; color: string; desc: string; context: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 16px', background: 'var(--bg2)',
      border: '1px solid var(--border)', borderRadius: 4, marginBottom: 8,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color, minWidth: 160,
        padding: '2px 10px', borderRadius: 2,
        background: `${color}12`, border: `1px solid ${color}30`,
      }}>{cmd}</span>
      <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>{desc}</span>
      <span style={{
        fontSize: 9, padding: '1px 8px', borderRadius: 2, letterSpacing: 1,
        background: `${color}10`, color, border: `1px solid ${color}25`,
      }}>{context}</span>
    </div>
  )
}

// ── ActionRow (AI docs only) ─────────────────────────────────

export function ActionRow({ action, color, desc, params }: {
  action: string; color: string; desc: string; params: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 16px', background: 'var(--bg2)',
      border: '1px solid var(--border)', borderRadius: 4, marginBottom: 8,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color, minWidth: 200,
        padding: '2px 10px', borderRadius: 2,
        background: `${color}12`, border: `1px solid ${color}30`,
      }}>{action}</span>
      <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>{desc}</span>
      <span style={{
        fontSize: 9, padding: '1px 8px', borderRadius: 2, letterSpacing: 1,
        background: `${color}10`, color, border: `1px solid ${color}25`,
        whiteSpace: 'nowrap',
      }}>{params}</span>
    </div>
  )
}

// ── useScrollSpy ─────────────────────────────────────────────

import { useState, useEffect } from 'react'

export function useScrollSpy(sectionIds: string[]) {
  const [active, setActive] = useState(sectionIds[0] ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sectionIds])

  return active
}