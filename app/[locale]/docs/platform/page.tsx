'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Shared nav (identique index + ai) ────────────────────────────────────────
function DocNav({ active }: { active: 'platform' | 'ai' }) {
  return (
    <nav className="doc-nav">
      <div style={{ display:'flex', alignItems:'center' }}>
        <Link href="/docs" className="nav-logo"><span className="s">staff</span><span className="d">7</span></Link>
        <span className="nav-tag">// docs</span>
      </div>
      <ul className="nav-links">
        <li><Link href="/docs/platform" style={{ color: active === 'platform' ? 'var(--cyan)' : undefined }}>Platform</Link></li>
        <li><Link href="/docs/ai"       style={{ color: active === 'ai'       ? 'var(--pink)' : undefined }}>AI layer</Link></li>
        <li><Link href="/login" className="nav-cta">sign in →</Link></li>
      </ul>
    </nav>
  )
}

// ── Sidebar sections ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id:'overview',     label:'Overview',         icon:'◈' },
  { id:'dashboard',    label:'Dashboard',        icon:'▣' },
  { id:'consultants',  label:'Consultants',      icon:'◉' },
  { id:'projects',     label:'Projects',         icon:'◧' },
  { id:'timesheets',   label:'Timesheets / CRA', icon:'⏱' },
  { id:'leaves',       label:'Leave management', icon:'◷' },
  { id:'planning',     label:'Planning',         icon:'▦' },
  { id:'finance',      label:'Finance',          icon:'◬' },
  { id:'roles',        label:'Roles & access',   icon:'🔐' },
  { id:'multitenancy', label:'Multi-tenancy',    icon:'⬡' },
]

function Sidebar({ active }: { active: string }) {
  return (
    <aside style={{
      width: 220, flexShrink: 0, position: 'sticky', top: 80,
      height: 'calc(100vh - 100px)', overflowY: 'auto',
      paddingRight: 20,
    }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 16 }}>
        // platform docs
      </div>
      {SECTIONS.map(s => (
        <a key={s.id} href={`#${s.id}`} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 3, marginBottom: 2,
          textDecoration: 'none', fontSize: 11,
          background: active === s.id ? 'rgba(0,229,255,.08)' : 'transparent',
          borderLeft: `2px solid ${active === s.id ? 'var(--cyan)' : 'transparent'}`,
          color: active === s.id ? 'var(--cyan)' : 'var(--text2)',
          transition: 'all .15s',
        }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{s.icon}</span>
          {s.label}
        </a>
      ))}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <Link href="/docs/ai" style={{
          display: 'block', padding: '10px 12px',
          background: 'rgba(255,45,107,.06)', border: '1px solid rgba(255,45,107,.2)',
          borderRadius: 3, textDecoration: 'none',
          fontSize: 10, color: 'var(--pink)', letterSpacing: 1,
        }}>
          ⚡ AI layer docs →
        </Link>
      </div>
    </aside>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, label, icon, color = 'var(--cyan)', children }: {
  id: string; label: string; icon: string; color?: string; children: React.ReactNode
}) {
  return (
    <section id={id} style={{ marginBottom: 80, scrollMarginTop: 90 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <span style={{ fontSize: 24, color }}>{icon}</span>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
            // {id}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -1 }}>{label}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

function FeatureGrid({ items }: { items: { icon: string; title: string; desc: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map(item => (
        <div key={item.title} style={{
          padding: '18px 20px', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 4,
        }}>
          <div style={{ fontSize: 18, marginBottom: 10 }}>{item.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{item.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.7 }}>{item.desc}</div>
        </div>
      ))}
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4, padding: '16px 20px', fontSize: 11,
      color: 'var(--cyan)', overflowX: 'auto', lineHeight: 1.8,
      marginBottom: 24,
    }}>
      <code>{children}</code>
    </pre>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 24 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 16px',
                background: 'var(--bg2)', color: 'var(--text2)',
                fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '10px 16px', color: j === 0 ? '#fff' : 'var(--text2)',
                  borderBottom: '1px solid var(--border)',
                  fontWeight: j === 0 ? 700 : 400,
                }}
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Note({ color = 'var(--gold)', children }: { color?: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 4, marginBottom: 24,
      background: `${color}08`, border: `1px solid ${color}25`,
      fontSize: 11, color: 'var(--text2)', lineHeight: 1.7,
    }}>
      {children}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PlatformDocsPage() {
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) })
      },
      { rootMargin: '-30% 0px -60% 0px' }
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
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&display=swap');
        :root {
          --bg:#060a06; --bg2:#0c120c; --bg3:#111811;
          --green:#00ff88; --pink:#ff2d6b; --cyan:#00e5ff; --gold:#ffd166; --purple:#b388ff;
          --dim:#2a3a2a; --text:#b8ccb8; --text2:#5a7a5a; --border:#1a2a1a;
          --font:'JetBrains Mono',monospace;
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;}
        body::after{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px);pointer-events:none;z-index:9999;}
        .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(#1a2a1a 1px,transparent 1px),linear-gradient(90deg,#1a2a1a 1px,transparent 1px);background-size:40px 40px;opacity:0.3;}
        .doc-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:rgba(6,10,6,0.95);border-bottom:1px solid var(--border);backdrop-filter:blur(4px);}
        .nav-logo{font-size:18px;font-weight:700;letter-spacing:-0.5px;text-decoration:none;}
        .nav-logo .s{color:#fff;}.nav-logo .d{color:var(--green);}
        .nav-tag{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-left:16px;}
        .nav-links{display:flex;gap:28px;list-style:none;align-items:center;}
        .nav-links a{color:var(--text2);text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;transition:color 0.2s;}
        .nav-links a:hover{color:var(--green);}
        .nav-cta{background:var(--green)!important;color:#060a06!important;padding:6px 16px!important;border-radius:2px;font-weight:700!important;}
        p{color:var(--text2);font-size:12px;line-height:1.9;margin-bottom:16px;}
        strong{color:#fff;font-weight:700;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px;}
        aside a:hover{color:var(--cyan)!important;background:rgba(0,229,255,.05)!important;}
        @media(max-width:800px){
          .doc-nav{padding:16px 20px;}
          .nav-links{display:none;}
          .doc-layout{flex-direction:column!important;}
          aside{width:100%!important;position:static!important;height:auto!important;}
        }
      `}</style>

      <div className="grid-bg" />
      <DocNav active="platform" />

      <div style={{ paddingTop: 70, maxWidth: 1100, margin: '0 auto', padding: '70px 40px 80px' }}>
        <div className="doc-layout" style={{ display: 'flex', gap: 60, alignItems: 'flex-start' }}>

          <Sidebar active={activeSection} />

          <main style={{ flex: 1, minWidth: 0 }}>

            {/* ── Overview ── */}
            <Section id="overview" label="Platform overview" icon="◈">
              <p>
                <strong>staff7</strong> is a multi-tenant SaaS platform built for <strong>ESNs, consulting agencies,
                and independent firms</strong>. It centralises the full operational stack — from consultant
                availability to project profitability — in a single, role-aware interface.
              </p>
              <FeatureGrid items={[
                { icon:'◉', title:'Consultant management',  desc:'Profiles, skills, status, occupancy, contract type (employee/freelance), and financial costs.' },
                { icon:'◧', title:'Project & client tracking', desc:'External and internal projects, client CRM, assignment management, and budget tracking.' },
                { icon:'⏱', title:'Timesheets (CRA)',       desc:'Weekly time entry with draft/submit/approve workflow, per project, per consultant.' },
                { icon:'◷', title:'Leave management',       desc:'CP, RTT, unpaid, authorised absence — request, approve, and balance tracking.' },
                { icon:'▦', title:'Planning & timeline',    desc:'Weekly availability grid and monthly Gantt-style view across the team.' },
                { icon:'◬', title:'Financial tracking',     desc:'TJM sold vs actual, gross margin per project, profitability per consultant.' },
              ]} />
              <Note color="var(--cyan)">
                🔐 <strong>All data is multi-tenant and RLS-enforced.</strong> Each company's data is
                isolated at the database level — no query can cross tenant boundaries.
              </Note>
            </Section>

            {/* ── Dashboard ── */}
            <Section id="dashboard" label="Dashboard" icon="▣" color="var(--green)">
              <p>
                The dashboard is the entry point for all roles. It aggregates key metrics in real time
                and surfaces pending actions without navigating away.
              </p>
              <FeatureGrid items={[
                { icon:'📊', title:'KPI cards',        desc:'Active consultants, active projects, occupancy rate, and pending leave requests — updated on every load.' },
                { icon:'📅', title:'Mini calendar',    desc:'Monthly calendar with colour-coded events: leave requests, project milestones, and availability blocks.' },
                { icon:'⚡', title:'Activity feed',    desc:'Recent team actions — assignments, leave approvals, new projects — in reverse chronological order.' },
                { icon:'▦',  title:'Project snapshot', desc:'Active projects with deadline proximity and assigned consultant count.' },
              ]} />
              <Table
                headers={['Role', 'What they see']}
                rows={[
                  ['consultant', 'Own assignments, own leave balance, personal occupancy'],
                  ['manager', 'Team occupancy, pending validations, project status'],
                  ['admin', 'Full KPIs, financial summary, all pending actions'],
                  ['super_admin', 'Cross-tenant view (all companies)'],
                ]}
              />
            </Section>

            {/* ── Consultants ── */}
            <Section id="consultants" label="Consultants" icon="◉" color="var(--cyan)">
              <p>
                The consultant directory is the operational core of the platform. Each profile
                tracks availability, assignments, financial cost, and leave entitlements.
              </p>
              <FeatureGrid items={[
                { icon:'👤', title:'Employee profile',   desc:'Gross salary, employer charges (%), working days/year → actual daily cost calculated automatically.' },
                { icon:'🔗', title:'Freelance profile',  desc:'Billed rate (TJM facturé) with per-assignment override. No CP/RTT entitlements.' },
                { icon:'🎯', title:'Target rate (cible)',desc:'Admin sets a target TJM — the platform tracks the gap vs actual cost to flag margin risk.' },
                { icon:'📋', title:'Occupancy tracking', desc:'Real-time occupancy % derived from active assignments, updated across planning views.' },
              ]} />
              <p style={{ marginBottom: 16 }}><strong>Contract types</strong> drive behaviour across the platform:</p>
              <Table
                headers={['Field', 'Employee', 'Freelance']}
                rows={[
                  ['Daily cost basis', 'Salary × (1 + charges%) ÷ days/yr', 'Billed TJM (or per-assignment override)'],
                  ['CP / RTT', '✓ tracked', '— not applicable'],
                  ['Leave requests', 'CP, RTT, unpaid, auth. absence', 'Unpaid, auth. absence only'],
                  ['Profitability margin', 'Revenue − fully-loaded cost', 'Revenue − billed rate'],
                ]}
              />
              <CodeBlock>{`// Actual daily cost formula (employee)
tjm_cout_reel = salaire_annuel_brut × (1 + charges_pct / 100) / jours_travailles

// Default values (FR market)
charges_pct     = 42%   // employer charges
jours_travailles = 218  // working days / year`}</CodeBlock>
              <Note color="var(--cyan)">
                Consultant accounts are linked via <strong>user_id</strong>. An admin can send an email
                invitation directly from the consultant drawer — the platform creates a Supabase auth
                account and sets the role in <code style={{ color:'var(--cyan)' }}>app_metadata</code>.
              </Note>
            </Section>

            {/* ── Projects ── */}
            <Section id="projects" label="Projects & clients" icon="◧" color="var(--purple)">
              <p>
                Projects are the financial and operational unit of the platform. Each project
                links a client, a team, and a financial envelope.
              </p>
              <FeatureGrid items={[
                { icon:'🏢', title:'Client CRM',           desc:'Client directory with sector, contact info, and linked projects. Revenue and active project counts per client.' },
                { icon:'📁', title:'Project lifecycle',    desc:'Draft → Active → On hold → Completed → Archived. Each status gates what actions are available.' },
                { icon:'👥', title:'Team assignments',     desc:'Assign consultants with start/end dates and allocation %. Freelancers can have a per-assignment TJM override.' },
                { icon:'💶', title:'Financial envelope',   desc:'TJM sold, days sold, total budget — visible to admins only. Used to calculate gross margin.' },
              ]} />
              <Table
                headers={['Status', 'Description', 'Visible in financials']}
                rows={[
                  ['draft',     'Project created, not yet active. No assignments.',           'No'],
                  ['active',    'Ongoing — included in occupancy and financial views.',        '<span style="color:var(--green)">Yes</span>'],
                  ['on_hold',   'Paused — consultants retained but not counted as assigned.',  'No'],
                  ['completed', 'Closed — historical data preserved.',                         'No'],
                  ['archived',  'Hidden from main views.',                                     'No'],
                ]}
              />
            </Section>

            {/* ── Timesheets ── */}
            <Section id="timesheets" label="Timesheets / CRA" icon="⏱" color="var(--gold)">
              <p>
                The CRA module provides weekly time tracking with a structured validation workflow.
                Each day entry can be 0, 0.5, or 1 day — and moves through <strong>draft → submitted → approved</strong>.
              </p>
              <FeatureGrid items={[
                { icon:'📅', title:'Weekly grid',       desc:'Each consultant sees their week with day cells. Click to toggle empty → half → full day.' },
                { icon:'✓',  title:'Submit workflow',   desc:'Consultant submits the week → manager/admin reviews and approves per consultant.' },
                { icon:'👁', title:'Manager view',      desc:'Managers see all team members for the selected week. Can approve all submitted entries in one click.' },
                { icon:'🔒', title:'Approval lock',     desc:'Approved entries are locked — no edits without admin override.' },
              ]} />
              <CodeBlock>{`// Entry states
empty     → no entry (0j)
half      → 0.5j (demi-journée)
full      → 1j
draft     → saved but not submitted
submitted → awaiting manager approval
approved  → locked`}</CodeBlock>
              <Table
                headers={['Role', 'Can enter', 'Can submit', 'Can approve']}
                rows={[
                  ['consultant', '✓ own', '✓ own', '—'],
                  ['manager',    '✓ team', '✓ team', '✓ team'],
                  ['admin',      '✓ all',  '✓ all',  '✓ all'],
                ]}
              />
            </Section>

            {/* ── Leaves ── */}
            <Section id="leaves" label="Leave management" icon="◷" color="var(--green)">
              <p>
                The leave module handles request submission, manager approval, and balance tracking.
                Freelancers have a restricted set of leave types — CP and RTT are not available.
              </p>
              <FeatureGrid items={[
                { icon:'📝', title:'Leave request',     desc:'Consultant selects type, dates, and submits. Working days calculated automatically (weekends excluded).' },
                { icon:'✓',  title:'Approval workflow', desc:'Manager/admin sees pending requests with impact warnings. One-click approve or refuse.' },
                { icon:'📊', title:'Balance tracking',  desc:'CP and RTT balances displayed per consultant with a visual bar. Depletes automatically on approval.' },
                { icon:'⚠',  title:'Impact warning',   desc:'System flags if an approved leave overlaps with an active project assignment.' },
              ]} />
              <Table
                headers={['Type', 'Available to', 'Duration']}
                rows={[
                  ['CP (Paid leave)',       'Employee only', 'Custom — calculated in working days'],
                  ['RTT',                  'Employee only', 'Custom — from RTT balance'],
                  ['Sans solde (Unpaid)',   'All',           'Custom'],
                  ['Absence autorisée',     'All',           'Fixed by legal motif (death, marriage…)'],
                ]}
              />
              <Note color="var(--green)">
                <strong>Absence autorisée</strong> has a fixed legal duration per motif — the end date
                is calculated automatically. No CP/RTT balance is deducted.
              </Note>
            </Section>

            {/* ── Planning ── */}
            <Section id="planning" label="Planning" icon="▦" color="var(--purple)">
              <p>
                Two complementary views give a spatial sense of team availability and workload.
              </p>
              <FeatureGrid items={[
                { icon:'▦', title:'Weekly availability', desc:'Row per consultant, column per weekday. Colour cells show: free / on assignment / partial / leave / weekend.' },
                { icon:'▬', title:'Monthly timeline',    desc:'Gantt-style view. Assignment bars span across days. Leave blocks appear as a separate layer.' },
                { icon:'↓', title:'Export',             desc:'Monthly view can be exported. Format depends on deployment configuration.' },
                { icon:'◷', title:'Live status',        desc:'Views derive status from assignments and leave_requests in real time — no manual sync needed.' },
              ]} />
              <Table
                headers={['Colour', 'Meaning']}
                rows={[
                  ['<span style="color:var(--green)">Green</span>',   'Free / available'],
                  ['<span style="color:var(--cyan)">Cyan</span>',     'On assignment (100%)'],
                  ['<span style="color:var(--gold)">Gold</span>',     'Partial / 50%'],
                  ['<span style="color:#ff2d6b">Pink</span>',         'On leave'],
                  ['<span style="color:var(--text2)">Dim</span>',     'Weekend'],
                ]}
              />
            </Section>

            {/* ── Finance ── */}
            <Section id="finance" label="Finance & profitability" icon="◬" color="var(--pink)">
              <p>
                Financial data is <strong>admin-only</strong>. Two views expose different angles:
                project-level margins in <strong>Finances</strong>, and consultant-level profitability
                in <strong>Rentabilité</strong>.
              </p>
              <FeatureGrid items={[
                { icon:'💶', title:'Project margins',       desc:'TJM sold vs TJM réel per project. Gross margin in € and %. Colour-coded by health threshold.' },
                { icon:'◉',  title:'Consultant profitability', desc:'Revenue generated, gross margin, occupancy rate — per consultant, sorted by any metric.' },
                { icon:'🎯', title:'Target vs actual',      desc:'Admin sets a TJM cible per consultant. Platform shows the gap % — red if margin < 10%.' },
                { icon:'⚠',  title:'Alert system',         desc:'Banner surfaces consultants whose target rate leaves less than 10% margin over actual cost.' },
              ]} />
              <CodeBlock>{`// Gross margin per consultant
ca_genere    = SUM(tjm_vendu × jours) on active assignments
cout         = tjm_cout_reel × jours_generes
marge_brute  = ca_genere - cout
marge_pct    = marge_brute / ca_genere × 100

// Margin health thresholds
≥ 25%  →  Excellent  (green)
15–25% →  Correct    (gold)
< 15%  →  Watch      (pink)`}</CodeBlock>
              <Note color="var(--pink)">
                Financial views are gated by <code style={{ color:'var(--cyan)' }}>canViewFinancials(role)</code> —
                only <strong>admin</strong> and <strong>super_admin</strong> can access them.
                Managers and consultants see no financial data.
              </Note>
              <Table
                headers={['Metric', 'Source', 'Scope']}
                rows={[
                  ['TJM vendu',     'project.tjm_vendu',           'Per project'],
                  ['TJM coût réel', 'consultant_profitability view','Per consultant (calculated)'],
                  ['TJM cible',     'consultant.tjm_cible',         'Per consultant (admin-set)'],
                  ['Marge brute',   'ca_genere − cout_consultant',  'Per consultant / project'],
                  ['Marge %',       'marge_brute / ca_genere',      'Per consultant / project'],
                ]}
              />
            </Section>

            {/* ── Roles ── */}
            <Section id="roles" label="Roles & access" icon="🔐" color="var(--gold)">
              <p>
                Roles are stored in <code style={{ color:'var(--cyan)' }}>auth.users.app_metadata.user_role</code> —
                not in a user-editable table. They are set at invite time and can only be changed by an admin.
              </p>
              <Table
                headers={['Role', 'Scope', 'Key permissions']}
                rows={[
                  ['consultant', 'Own data only', 'View own assignments, submit timesheets, request leave'],
                  ['manager',    'Team',          'View team, approve timesheets & leave, manage assignments'],
                  ['admin',      'Company',       'Full CRUD, financial views, invite consultants'],
                  ['super_admin','All tenants',   'Cross-tenant access, company management'],
                ]}
              />
              <CodeBlock>{`// RLS JWT path (Supabase)
auth.jwt() -> 'app_metadata' ->> 'user_role'

// Guard helpers (lib/auth.ts)
isAdmin(role)          // admin + super_admin
canEdit(role)          // admin + manager + super_admin
canViewFinancials(role)// admin + super_admin`}</CodeBlock>
            </Section>

            {/* ── Multi-tenancy ── */}
            <Section id="multitenancy" label="Multi-tenancy" icon="⬡" color="var(--cyan)">
              <p>
                Every table has a <code style={{ color:'var(--cyan)' }}>company_id</code> column.
                Supabase RLS policies enforce that queries only return rows matching the user's tenant.
                No application-level filtering is required.
              </p>
              <CodeBlock>{`-- RLS policy example (consultants table)
CREATE POLICY "tenant_isolation" ON consultants
  USING (company_id = my_company_id());

-- my_company_id() helper function
CREATE FUNCTION my_company_id() RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
$$ LANGUAGE sql STABLE;

-- super_admin bypass
CREATE POLICY "super_admin_all" ON consultants
  USING (is_super_admin());`}</CodeBlock>
              <FeatureGrid items={[
                { icon:'🔐', title:'Database-level isolation', desc:'RLS policies on every table. Even direct API calls cannot access another tenant\'s data.' },
                { icon:'🏢', title:'Company profiles',         desc:'Each tenant has a companies record. The company name is displayed in the topbar badge.' },
                { icon:'⚡', title:'AI agent isolation',       desc:'The AI route uses the user\'s JWT — not a service key — so RLS applies to all agent queries.' },
                { icon:'👑', title:'Super admin view',         desc:'super_admin role bypasses RLS via is_super_admin() — used for platform-level management.' },
              ]} />
            </Section>

          </main>
        </div>
      </div>
    </>
  )
}