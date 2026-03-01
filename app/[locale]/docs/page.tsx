'use client'

/**
 * app/[locale]/docs/page.tsx
 * Page publique — pas dans le groupe (app) donc pas protégée par le middleware
 * Accessible sans connexion à /docs
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────

interface Section {
  id:    string
  label: string
}

const SECTIONS: Section[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'roles',      label: 'Roles' },
  { id: 'admin',      label: 'Admin' },
  { id: 'manager',    label: 'Manager' },
  { id: 'consultant', label: 'Consultant' },
  { id: 'workflows',  label: 'Workflows' },
  { id: 'access',     label: 'Data access' },
  { id: 'glossary',   label: 'Glossary' },
]

// ── Sub-components ────────────────────────────────────────────

function Tag({ children, color = 'cyan' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    cyan:   { bg: 'rgba(0,229,255,0.1)',   text: '#00e5ff' },
    green:  { bg: 'rgba(0,255,136,0.1)',   text: '#00ff88' },
    pink:   { bg: 'rgba(255,45,107,0.1)',  text: '#ff2d6b' },
    gold:   { bg: 'rgba(255,209,102,0.1)', text: '#ffd166' },
    purple: { bg: 'rgba(179,136,255,0.1)', text: '#b388ff' },
  }
  const c = colors[color] ?? colors.cyan
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      textTransform: 'uppercase', fontFamily: 'monospace',
      background: c.bg, color: c.text,
      border: `1px solid ${c.text}22`,
    }}>
      {children}
    </span>
  )
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ paddingTop: 80, marginBottom: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
      }}>
        <span style={{
          fontSize: 9, fontFamily: 'monospace', color: '#00e5ff',
          letterSpacing: 3, textTransform: 'uppercase', opacity: 0.6,
        }}>
          //
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <h2 style={{
        fontSize: 28, fontWeight: 800, color: '#f0f4f0',
        letterSpacing: -0.5, margin: 0,
        fontFamily: '"Syne", "Space Grotesk", sans-serif',
      }}>
        {children}
      </h2>
    </div>
  )
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      display: 'flex', gap: 16, padding: '16px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 6, flexShrink: 0,
        background: 'rgba(0,229,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e8e0', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  )
}

function CanDo({ items, color = 'green', label }: { items: string[]; color?: string; label: string }) {
  const accent = color === 'green' ? '#00ff88' : '#ff2d6b'
  const icon   = color === 'green' ? '✓' : '✗'
  return (
    <div style={{
      background: `${accent}08`,
      border: `1px solid ${accent}18`,
      borderRadius: 8, padding: '20px 24px',
    }}>
      <div style={{
        fontSize: 10, fontFamily: 'monospace', letterSpacing: 2,
        color: accent, marginBottom: 14, textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: accent, fontSize: 11, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkflowStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#00e5ff', fontFamily: 'monospace',
        }}>
          {step}
        </div>
        <div style={{ flex: 1, width: 1, background: 'rgba(0,229,255,0.1)', marginTop: 4 }} />
      </div>
      <div style={{ paddingBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e8e0', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function DocsPage() {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' }
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #080c08; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 2px; }

        .docs-grid { background-image: radial-gradient(rgba(0,229,255,0.03) 1px, transparent 1px); background-size: 24px 24px; }

        .nav-link { transition: color 0.15s, border-color 0.15s; }
        .nav-link:hover { color: #00e5ff !important; }

        .role-card { transition: border-color 0.2s, transform 0.2s; cursor: default; }
        .role-card:hover { transform: translateY(-2px); }

        .table-row:nth-child(even) { background: rgba(255,255,255,0.015); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-anim { animation: fadeUp 0.6s ease both; }
        .hero-anim-1 { animation-delay: 0.1s; }
        .hero-anim-2 { animation-delay: 0.2s; }
        .hero-anim-3 { animation-delay: 0.35s; }
        .hero-anim-4 { animation-delay: 0.5s; }

        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .cursor { animation: blink 1s step-end infinite; }
      `}</style>

      <div className="docs-grid" style={{
        minHeight: '100vh', background: '#080c08',
        fontFamily: '"DM Sans", sans-serif',
        color: 'rgba(255,255,255,0.75)',
      }}>

        {/* ── Top nav ── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 56,
          background: 'rgba(8,12,8,0.9)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          padding: '0 32px', gap: 24, zIndex: 100,
        }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 16, fontWeight: 800, letterSpacing: -0.5,
              color: '#00e5ff', fontFamily: '"Syne", sans-serif',
            }}>
              Staffd
            </span>
            <span style={{
              fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,229,255,0.4)',
              letterSpacing: 2, textTransform: 'uppercase',
            }}>
              docs
            </span>
          </Link>
          <div style={{ flex: 1 }} />
          <Link href="/login" style={{
            textDecoration: 'none', fontSize: 12, fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            padding: '6px 16px', borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            Sign in →
          </Link>
        </nav>

        {/* ── Layout ── */}
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '200px 1fr',
          gap: 0, paddingTop: 56,
        }}>

          {/* ── Sidebar TOC ── */}
          <aside style={{
            position: 'sticky', top: 56, height: 'calc(100vh - 56px)',
            padding: '40px 0 40px 32px', overflowY: 'auto',
          }}>
            <div style={{
              fontSize: 9, fontFamily: 'monospace', letterSpacing: 2.5,
              color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
              marginBottom: 16,
            }}>
              Contents
            </div>
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="nav-link"
                style={{
                  display: 'block', padding: '6px 0',
                  fontSize: 12, textDecoration: 'none',
                  color: active === s.id ? '#00e5ff' : 'rgba(255,255,255,0.35)',
                  borderLeft: `2px solid ${active === s.id ? '#00e5ff' : 'transparent'}`,
                  paddingLeft: 12, transition: 'all 0.15s',
                  fontWeight: active === s.id ? 600 : 400,
                }}
              >
                {s.label}
              </a>
            ))}
          </aside>

          {/* ── Content ── */}
          <main style={{ padding: '40px 32px 120px 48px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>

            {/* ── Hero ── */}
            <div id="overview" style={{ paddingTop: 40, marginBottom: 72 }}>

              <div className="hero-anim hero-anim-1" style={{ marginBottom: 20 }}>
                <Tag color="cyan">Beta — 2026</Tag>
              </div>

              <h1 className="hero-anim hero-anim-2" style={{
                fontSize: 52, fontWeight: 800, lineHeight: 1.05,
                letterSpacing: -2, color: '#f0f4f0',
                fontFamily: '"Syne", sans-serif',
                marginBottom: 24,
              }}>
                Staffing ops,<br />
                <span style={{ color: '#00e5ff' }}>finally clear</span>
                <span className="cursor" style={{ color: '#00ff88' }}>_</span>
              </h1>

              <p className="hero-anim hero-anim-3" style={{
                fontSize: 17, lineHeight: 1.7,
                color: 'rgba(255,255,255,0.5)',
                maxWidth: 560, marginBottom: 40,
              }}>
                Staffd is a resource management platform built for consulting firms.
                Track your consultants, manage projects, handle time-off — and never
                wonder who's available again.
              </p>

              <div className="hero-anim hero-anim-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { icon: '◈', label: 'Real-time occupancy' },
                  { icon: '◉', label: 'Project assignments' },
                  { icon: '◇', label: 'Leave workflows' },
                  { icon: '◆', label: 'Financial margins' },
                ].map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    fontSize: 12, color: 'rgba(255,255,255,0.5)',
                  }}>
                    <span style={{ color: '#00e5ff', fontSize: 14 }}>{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </div>
            </div>

            {/* ── What is Staffd ── */}
            <div style={{
              background: 'rgba(0,229,255,0.03)',
              border: '1px solid rgba(0,229,255,0.1)',
              borderRadius: 12, padding: '32px 36px',
              marginBottom: 24,
            }}>
              <div style={{
                fontSize: 10, fontFamily: 'monospace', letterSpacing: 2,
                color: '#00e5ff', marginBottom: 16, textTransform: 'uppercase',
              }}>
                What is Staffd?
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.55)' }}>
                Staffd is a SaaS platform built for <strong style={{ color: '#e0e8e0' }}>staffing agencies and consulting firms</strong>.
                It gives operations and project managers a single source of truth for consultant availability,
                project staffing, and financial performance — replacing spreadsheets and fragmented tools
                with a fast, role-aware interface.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <FeatureRow icon="👤" title="Consultant profiles"    desc="Skills, availability, occupancy rate, leave balance — always up to date." />
              <FeatureRow icon="📁" title="Project management"     desc="From draft to archived. External clients or internal projects." />
              <FeatureRow icon="🔗" title="Smart assignments"      desc="Assign consultants to projects with allocation percentage and dates." />
              <FeatureRow icon="🏖️" title="Leave management"       desc="Submit, review, and approve time-off with conflict detection." />
              <FeatureRow icon="📅" title="Timeline view"          desc="Monthly Gantt showing who's on what, at a glance." />
              <FeatureRow icon="💰" title="Financial insights"     desc="Sold rate vs actual cost. Gross margin per project. Admin only." />
            </div>

            {/* ── Roles ── */}
            <SectionTitle id="roles">Three roles, one platform</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
              {[
                {
                  role: 'admin', color: '#00e5ff', icon: '◈',
                  who: 'CEO, Director',
                  desc: 'Full access including financial data, margins, and daily rates.',
                },
                {
                  role: 'manager', color: '#00ff88', icon: '◉',
                  who: 'Project manager, HR',
                  desc: 'Manages people and projects. Cannot see confidential financials.',
                },
                {
                  role: 'consultant', color: '#ffd166', icon: '◇',
                  who: 'Team member',
                  desc: 'Views their own profile, projects, and submits time-off requests.',
                },
              ].map(r => (
                <div key={r.role} className="role-card" style={{
                  background: `${r.color}06`,
                  border: `1px solid ${r.color}22`,
                  borderRadius: 10, padding: '24px 20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 20, color: r.color }}>{r.icon}</span>
                    <Tag color={r.role === 'admin' ? 'cyan' : r.role === 'manager' ? 'green' : 'gold'}>
                      {r.role}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontFamily: 'monospace' }}>
                    {r.who}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    {r.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Admin ── */}
            <SectionTitle id="admin">Admin</SectionTitle>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 32 }}>
              The admin has a complete view of the company and is responsible for configuring Staffd.
              They see all financial data and can perform every action in the platform.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 48 }}>
              <CanDo color="green" label="Can do" items={[
                'Create, edit, and delete consultants (with daily rate)',
                'Create and manage clients with sector and contact info',
                'Create projects — external or internal — with financial data',
                'Assign consultants to projects with allocation %',
                'Approve or refuse time-off requests',
                'View the confidential /financials page (margins, rates)',
                'See the full team timeline and availability grid',
              ]} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '20px',
                }}>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 12, textTransform: 'uppercase' }}>
                    Pages accessible
                  </div>
                  {['/dashboard', '/consultants', '/clients', '/projects', '/leaves', '/availability', '/timeline', '/financials', '/settings'].map(p => (
                    <div key={p} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 0', fontSize: 11, fontFamily: 'monospace',
                      color: 'rgba(0,229,255,0.7)',
                    }}>
                      <span style={{ color: 'rgba(0,255,136,0.5)', fontSize: 10 }}>✓</span>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Manager ── */}
            <SectionTitle id="manager">Manager</SectionTitle>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 32 }}>
              The manager handles day-to-day staffing and project operations.
              They have full operational access but cannot see confidential financial data.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 48 }}>
              <CanDo color="green" label="Can do" items={[
                'View consultant profiles and manage assignments',
                'Create and edit projects (without financial fields)',
                'Create and manage clients',
                'Approve or refuse time-off requests',
                'View the availability grid and timeline',
              ]} />
              <CanDo color="pink" label="Cannot do" items={[
                'See consultant daily rates (TJM)',
                'Access /financials (margins, sold rates)',
                'See project financial data (sold days, budget)',
                'Delete consultants',
              ]} />
            </div>

            {/* ── Consultant ── */}
            <SectionTitle id="consultant">Consultant</SectionTitle>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 32 }}>
              The consultant sees only their own data. Their experience is focused
              on personal availability, current missions, and time-off management.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 48 }}>
              <CanDo color="green" label="Can do" items={[
                'View their own profile (daily rate hidden)',
                'See their current and upcoming project assignments',
                'Submit time-off requests',
                'View the team timeline',
                'Check their leave balance',
              ]} />
              <CanDo color="pink" label="Cannot do" items={[
                'See other consultants\' profiles or data',
                'Create or edit projects',
                'See any financial data',
                'Approve time-off requests',
                'Access /clients or /financials',
              ]} />
            </div>

            {/* ── Workflows ── */}
            <SectionTitle id="workflows">Key workflows</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48 }}>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e8e0', marginBottom: 20 }}>
                  Time-off request
                </div>
                <WorkflowStep step="1" title="Consultant submits a request" desc="Selects type (Paid leave, RTT, Unpaid), dates, and number of days." />
                <WorkflowStep step="2" title="Manager reviews" desc="Sees the request in /leaves with a warning if it conflicts with a project." />
                <WorkflowStep step="3" title="Approve or refuse" desc="One click. Status updates immediately. Email notification coming soon." />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e8e0', marginBottom: 20 }}>
                  Staffing a project
                </div>
                <WorkflowStep step="1" title="Create the client" desc="If new — add name, sector, and contact details in /clients." />
                <WorkflowStep step="2" title="Create the project" desc="Select the client, fill in dates, status, and financial data." />
                <WorkflowStep step="3" title="Assign consultants" desc="Open the project drawer → Team section → + Assign. Set allocation %." />
                <WorkflowStep step="4" title="Track in real time" desc="Occupancy updates automatically. Monitor margins in /financials." />
              </div>
            </div>

            {/* ── Data access table ── */}
            <SectionTitle id="access">Data access by role</SectionTitle>

            <div style={{
              borderRadius: 8, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.07)',
              marginBottom: 48,
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: 11 }}>Data</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#00e5ff', fontWeight: 600, fontSize: 11 }}>Admin</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#00ff88', fontWeight: 600, fontSize: 11 }}>Manager</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#ffd166', fontWeight: 600, fontSize: 11 }}>Consultant</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Consultant list',          '✓ All',        '✓ All',           '✗'],
                    ['Consultant profile',        '✓ Full',       '✓ No daily rate', '✓ Own only'],
                    ['Daily rates (TJM)',         '✓',            '✗',               '✗'],
                    ['Project list',              '✓ All',        '✓ All',           '✓ Own projects'],
                    ['Project financial data',    '✓',            '✗',               '✗'],
                    ['/financials page',          '✓',            '✗',               '✗'],
                    ['Team time-off',             '✓',            '✓',               '✓ Own only'],
                    ['Availability grid',         '✓',            '✓',               '✓'],
                    ['Timeline',                  '✓',            '✓',               '✓'],
                    ['Client list & profiles',    '✓',            '✓',               '✗'],
                  ].map(([label, admin, manager, consultant], i) => (
                    <tr key={i} className="table-row">
                      <td style={{ padding: '11px 16px', color: 'rgba(255,255,255,0.55)' }}>{label}</td>
                      {[admin, manager, consultant].map((v, j) => (
                        <td key={j} style={{
                          padding: '11px 16px', textAlign: 'center',
                          color: v === '✗' ? 'rgba(255,45,107,0.5)' : v.startsWith('✓') ? 'rgba(0,255,136,0.7)' : 'rgba(255,255,255,0.4)',
                          fontSize: 11,
                        }}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Glossary ── */}
            <SectionTitle id="glossary">Glossary</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, marginBottom: 80 }}>
              {[
                ['Tenant',         'A company using Staffd (e.g. NexDigital).'],
                ['Consultant',     'A team member, billable or not.'],
                ['Client',         'An external company the firm sells services to.'],
                ['Internal project','A non-billable project — R&D, training, pre-sales.'],
                ['Assignment',     'A consultant allocated to a project with an allocation %.'],
                ['Daily rate',     'The sold price per day for a consultant (TJM in French).'],
                ['Allocation',     'Share of a consultant\'s time on a project (10–100%).'],
                ['Occupancy rate', 'Total occupation = sum of all active allocations.'],
                ['CP',             'Paid leave — Congés Payés.'],
                ['RTT',            'Work-time reduction days — Réduction du Temps de Travail.'],
              ].map(([term, def], i) => (
                <div key={i} style={{
                  padding: '14px 16px',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 11, color: '#00e5ff',
                    fontWeight: 700, marginRight: 8,
                  }}>
                    {term}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{def}</span>
                </div>
              ))}
            </div>

            {/* ── Footer ── */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: 32,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)' }}>
                Staffd © 2026 — Beta
              </span>
              <Link href="/login" style={{
                textDecoration: 'none', fontSize: 12, fontWeight: 600,
                color: '#00e5ff', padding: '8px 20px', borderRadius: 4,
                border: '1px solid rgba(0,229,255,0.3)',
                background: 'rgba(0,229,255,0.05)',
              }}>
                Sign in to Staffd →
              </Link>
            </div>

          </main>
        </div>
      </div>
    </>
  )
}