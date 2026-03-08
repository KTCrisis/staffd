// app/[locale]/docs/platform/page.tsx
'use client'

import {
  DocNav, DocSidebar, Section, FeatureGrid, CodeBlock,
  Table, Note, Screenshot, DemoBanner, useScrollSpy,
} from '@/components/docs'
import '@/styles/docs.css'

const SECTIONS = [
  { id: 'overview',     label: 'Overview',         icon: '◈' },
  { id: 'dashboard',    label: 'Dashboard',        icon: '▣' },
  { id: 'consultants',  label: 'Consultants',      icon: '◉' },
  { id: 'projects',     label: 'Projects',         icon: '◧' },
  { id: 'timesheets',   label: 'Timesheets',       icon: '⏱' },
  { id: 'leaves',       label: 'Leave management', icon: '◷' },
  { id: 'planning',     label: 'Planning',         icon: '▦' },
  { id: 'finance',      label: 'Finance',          icon: '◬' },
  { id: 'invoices',     label: 'Invoices',         icon: '◉' },
  { id: 'roles',        label: 'Roles & access',   icon: '◫' },
  { id: 'multitenancy', label: 'Multi-tenancy',    icon: '⬡' },
]

export default function PlatformDocsPage() {
  const active = useScrollSpy(SECTIONS.map(s => s.id))

  return (
    <>
      <div className="doc-grid-bg" />
      <DocNav active="platform" />

      <div className="doc-layout">
        <DocSidebar
          sections={SECTIONS}
          active={active}
          variant="platform"
          crossLink={{ href: '/docs/ai', label: '⚡ AI layer docs →', color: 'var(--pink)' }}
        />

        <main style={{ flex: 1, minWidth: 0 }}>

          <DemoBanner />

          {/* ── Overview ── */}
          <Section id="overview" label="Platform overview" icon="◈">
            <p>
              <strong>staff7</strong> is a multi-tenant SaaS platform built for <strong>ESNs, consulting agencies,
              and independent firms</strong>. It centralises the full operational stack — from consultant
              availability to project profitability — in a single, role-aware interface.
            </p>
            
            <Screenshot src="/docs/dashboard-admin.png" caption="Dashboard admin — KPIs, projets actifs, activité, calendrier" />
            <FeatureGrid items={[
              { icon: '◉', title: 'Consultant management',    desc: 'Profiles, skills, status, occupancy, contract type (employee/freelance), and financial costs.' },
              { icon: '◧', title: 'Project & client tracking', desc: 'External and internal projects, client CRM, assignment management, and budget tracking.' },
              { icon: '⏱', title: 'Timesheets (CRA)',         desc: 'Weekly time entry with draft/submit/approve workflow, per project, per consultant.' },
              { icon: '◷', title: 'Leave management',         desc: 'CP, RTT, unpaid, authorised absence — request, approve, and balance tracking.' },
              { icon: '▦', title: 'Planning & timeline',      desc: 'Weekly availability grid and monthly Gantt-style view across the team.' },
              { icon: '◬', title: 'Financial tracking',       desc: 'Daily Rate sold vs actual, gross margin per project, profitability per consultant.' },
            ]} />
            <Note color="var(--cyan)">
              ⬡ <strong>All data is multi-tenant and RLS-enforced.</strong> Each company{"'"}s data is
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
              { icon: '◈', title: 'KPI cards',         desc: 'Active consultants, active projects, occupancy rate, and pending leave requests — updated on every load.' },
              { icon: '▦', title: 'Live calendar',     desc: 'Weekly calendar with real events: public holidays (per country), approved leaves, and project deadlines.' },
              { icon: '⚡', title: 'Activity feed',     desc: 'Recent team actions — assignments, leave approvals, new projects — in reverse chronological order.' },
              { icon: '◧', title: 'Actionable panels', desc: 'Managers see "approve →" CTAs on pending timesheets and leave requests. Consultants see "submit CRA →".' },
            ]} />
            <Table
              headers={['Role', 'What they see']}
              rows={[
                ['consultant', 'Own assignments, own leave balance, CRA week with submit CTA, personal occupancy'],
                ['freelance',  'Same as consultant + invoice KPI (draft/sent/paid count) and "new invoice →" CTA'],
                ['manager',    'Team occupancy, pending validations with approve CTAs, team calendar with leave events'],
                ['admin',      'Full KPIs, financial summary, all pending actions, calendar with holidays + deadlines'],
                ['super_admin', 'Cross-tenant view via OrgSwitcher (all companies)'],
              ]}
            />
          </Section>

          {/* ── Consultants ── */}
          <Section id="consultants" label="Consultants" icon="◉" color="var(--cyan)">
            <p>
              The consultant directory is the operational core of the platform. Each profile
              tracks availability, assignments, financial cost, and leave entitlements.
            </p>
            <Screenshot src="/docs/consultants-list.png" caption="Consultants — filtres, statuts, drawer profil" />
            <FeatureGrid items={[
              { icon: '◉', title: 'Employee profile',    desc: 'Gross salary, employer charges (%), working days/year → actual daily cost calculated automatically.' },
              { icon: '◧', title: 'Freelance profile',   desc: 'Billed daily rate with per-assignment override. No paid leave or flex-day entitlements.' },
              { icon: '◎', title: 'Target rate',         desc: 'Admin sets a target daily rate — the platform tracks the gap vs actual cost to flag margin risk.' },
              { icon: '◬', title: 'Occupancy tracking',  desc: 'Real-time occupancy % derived from active assignments, updated across planning views.' },
            ]} />
            <Table
              headers={['Field', 'Employee', 'Freelance']}
              rows={[
                ['Daily cost basis', 'Salary × (1 + charges%) ÷ days/yr', 'Billed Rate (or per-assignment override)'],
                ['Paid Leave / Flex Days', '✓ tracked', '— not applicable'],
                ['Leave requests', 'Paid Leave, Flex Days, unpaid, auth. absence', 'Unpaid, auth. absence only'],
                ['Profitability margin', 'Revenue − fully-loaded cost', 'Revenue − billed rate'],
              ]}
            />
            <Note color="var(--cyan)">
              Consultant accounts are linked via <strong>user_id</strong>. An admin can send an email
              invitation directly from the consultant drawer — the platform creates a Supabase auth
              account and sets the role in <code>app_metadata</code>.
              Consultants and freelancers can view the team directory (read-only) but cannot edit profiles or see financial data.
            </Note>
          </Section>

          {/* ── Projects ── */}
          <Section id="projects" label="Projects & clients" icon="◧" color="var(--purple)">
            <p>
              Projects are the financial and operational unit of the platform. Each project
              links a client, a team, and a financial envelope.
            </p>
            <FeatureGrid items={[
              { icon: '◈', title: 'Client CRM',          desc: 'Client directory with sector, contact info, and linked projects. Revenue and active project counts per client.' },
              { icon: '◧', title: 'Project lifecycle',   desc: 'Draft → Active → On hold → Completed → Archived. Each status gates what actions are available.' },
              { icon: '◉', title: 'Team assignments',    desc: 'Assign consultants with start/end dates and allocation %. Freelancers can have a per-assignment daily rate override.' },
              { icon: '◬', title: 'Financial envelope',  desc: 'Rate sold, days sold, total budget — visible to admins only. Used to calculate gross margin.' },
            ]} />
            <Table
              headers={['Status', 'Description', 'Visible in financials']}
              rows={[
                ['draft',     'Project created, not yet active. No assignments.',          'No'],
                ['active',    'Ongoing — included in occupancy and financial views.',       '<span style="color:var(--green)">Yes</span>'],
                ['on_hold',   'Paused — consultants retained but not counted as assigned.', 'No'],
                ['completed', 'Closed — historical data preserved.',                        'No'],
                ['archived',  'Hidden from main views.',                                    'No'],
              ]}
            />
            <Note color="var(--purple)">
              Consultants and freelancers can view their assigned projects (read-only) but cannot edit, archive, or delete.
              Financial data (Daily Rate, budget, days sold) is hidden for non-admin roles.
            </Note>
          </Section>

          {/* ── Timesheets ── */}
          <Section id="timesheets" label="Timesheets" icon="⏱" color="var(--gold)">
            <p>
              The timesheet module provides weekly time tracking with a structured validation workflow.
              Each day entry can be 0, 0.5, or 1 day — and moves through <strong>draft → submitted → approved</strong>.
            </p>
            <FeatureGrid items={[
              { icon: '▦', title: 'Weekly grid',     desc: 'Each consultant sees their week with day cells. Click to toggle empty → half → full day.' },
              { icon: '◎', title: 'Submit workflow',  desc: 'Consultant submits the week → manager/admin reviews and approves per consultant.' },
              { icon: '◉', title: 'Manager view',     desc: 'Managers see all team members for the selected week. Can approve all submitted entries in one click.' },
              { icon: '◫', title: 'Public holidays',  desc: 'Holidays displayed per consultant country (via date.nager.at). Excluded from working day calculations.' },
            ]} />
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
              Freelancers are redirected — CP and RTT are not available.
            </p>
            <FeatureGrid items={[
              { icon: '◈', title: 'Leave request',      desc: 'Consultant selects type, dates, and submits. Working days calculated automatically (weekends + holidays excluded).' },
              { icon: '◎', title: 'Approval workflow',  desc: 'Manager/admin sees pending requests with impact warnings. One-click approve or refuse.' },
              { icon: '◧', title: 'Balance tracking',   desc: 'CP and RTT balances displayed per consultant with a visual bar. Depletes automatically on approval.' },
              { icon: '▲', title: 'Impact warning',     desc: 'System flags if an approved leave overlaps with an active project assignment.' },
            ]} />
            <Table
              headers={['Type', 'Available to', 'Duration']}
              rows={[
                ['Paid leave (CP)',       'Employee only', 'Custom — calculated in working days'],
                ['Flex days (RTT)',       'Employee only', 'Custom — from RTT balance'],
                ['Unpaid leave',          'All',           'Custom'],
                ['Authorised absence',    'All',           'Fixed by legal motif (bereavement, marriage…)'],
              ]}
            />
          </Section>

          {/* ── Planning ── */}
          <Section id="planning" label="Planning" icon="▦" color="var(--purple)">
            <p>
              Two complementary views give a spatial sense of team availability and workload.
              Both are restricted to admin, manager, and super_admin roles.
            </p>
            <Screenshot src="/docs/staffing-grid.png" caption="Staffing — disponibilité mensuelle par consultant" />
            <FeatureGrid items={[
              { icon: '▦', title: 'Monthly availability',  desc: 'Row per consultant, column per day. Colour cells: free / on assignment / partial / leave / weekend. Hatch patterns distinguish leave from projects.' },
              { icon: '▬', title: 'Monthly timeline',      desc: 'Gantt-style view. Assignment bars span across days. Leave blocks appear as a separate layer. Manager sees only their team.' },
              { icon: '+', title: 'Quick assign',          desc: 'Click any free cell to open the assignment drawer — pre-filled with the consultant and date.' },
              { icon: '◷', title: 'Live status',           desc: 'Views derive status from assignments and leave_requests in real time — no manual sync needed.' },
            ]} />
          </Section>

          {/* ── Finance ── */}
          <Section id="finance" label="Finance & profitability" icon="◬" color="var(--pink)">
            <p>
              Financial data is <strong>admin-only</strong>. Two views expose different angles:
              project-level margins in <strong>Finances</strong>, and consultant-level profitability
              in <strong>Profitability</strong>.
            </p>
            <FeatureGrid items={[
              { icon: '◬', title: 'Project margins',          desc: 'Sold rate vs actual daily cost per project. Gross margin in € and %. Colour-coded by health threshold.' },
              { icon: '◈', title: 'Consultant profitability', desc: 'Revenue generated, gross margin, occupancy rate — per consultant, sorted by any metric.' },
              { icon: '◎', title: 'Target vs actual',         desc: 'Admin sets a target daily rate per consultant. Platform shows the gap % — red if margin < 10%.' },
              { icon: '▲', title: 'Alert system',             desc: 'Banner surfaces consultants whose target rate leaves less than 10% margin over actual cost.' },
            ]} />
            <CodeBlock>{`// Gross margin per consultant
revenue      = SUM(sold_rate × days) on active assignments
cost         = actual_daily_cost × billed_days
gross_margin = revenue - cost
margin_pct   = gross_margin / revenue × 100

// Margin health thresholds
≥ 25%  →  Excellent  (green)
15–25% →  Correct    (gold)
< 15%  →  Watch      (pink)`}</CodeBlock>
          </Section>

          {/* ── Invoices ── */}
          <Section id="invoices" label="Invoices" icon="◉" color="var(--cyan)">
            <p>
              The invoice module lets <strong>admins, managers, and freelancers</strong> generate
              client invoices. Freelancers access via their dashboard CTA and can only see their own invoices.
            </p>
            <FeatureGrid items={[
              { icon: '⏱', title: 'Timesheet import',  desc: 'Select a month — pulls approved entries, groups by consultant × project, pre-fills line items.' },
              { icon: '◉', title: 'Live preview',       desc: 'Split-screen — form on the left, PDF-style preview on the right, updating on every keystroke.' },
              { icon: '✓', title: 'Mark as paid',       desc: 'One-click "✓ paid" on sent/overdue invoices. Optimistic UI update with Supabase sync.' },
              { icon: '◬', title: 'Auto-numbering',     desc: 'Invoice numbers follow a configurable prefix + sequential counter. Thread-safe via atomic SQL.' },
            ]} />
            <Table
              headers={['Status', 'Description', 'Actions']}
              rows={[
                ['draft',     'Created but not sent — fully editable',         'Edit, Send, Delete'],
                ['sent',      'Marked as sent to client',                       'Mark as paid'],
                ['paid',      'Payment received — paid_at date recorded',       'View only'],
                ['overdue',   'Past due date — computed automatically',         'Mark as paid'],
                ['cancelled', 'Voided invoice',                                 'View only'],
              ]}
            />
          </Section>

          {/* ── Roles ── */}
          <Section id="roles" label="Roles & access" icon="◫" color="var(--gold)">
            <p>
              Roles are stored in <code>auth.users.app_metadata.user_role</code> —
              not in a user-editable table. Set at invite time, changeable by admin only.
            </p>
            <Table
              headers={['Role', 'Scope', 'Key permissions']}
              rows={[
                ['consultant',  'Own data only', 'View assignments, submit timesheets, request leave, view project list (read-only)'],
                ['freelance',   'Own data only', 'All consultant + create/view own invoices. No CP/RTT. Dashboard shows invoice KPIs.'],
                ['manager',     'Team',          'View team, approve timesheets & leave, manage assignments, team-filtered planning views'],
                ['admin',       'Company',       'Full CRUD, financial views, invoices, invite consultants, settings'],
                ['super_admin', 'All tenants',   'Cross-tenant access via OrgSwitcher, company management'],
              ]}
            />
            <Note color="var(--gold)">
              Server-side guards via <code>getPageAuth()</code> enforce access on every page.
              Guards are doubled by Supabase RLS — no client-side bypass is possible.
            </Note>
          </Section>

          {/* ── Multi-tenancy ── */}
          <Section id="multitenancy" label="Multi-tenancy" icon="⬡" color="var(--cyan)">
            <p>
              Every table has a <code>company_id</code> column.
              Supabase RLS policies enforce tenant isolation at the database level.
            </p>
            <FeatureGrid items={[
              { icon: '⬡', title: 'Database-level isolation', desc: 'RLS policies on every table. Even direct API calls cannot cross tenant boundaries.' },
              { icon: '◈', title: 'Tenant badge',             desc: 'Each user sees their company name in the topbar. Super admin sees the OrgSwitcher dropdown.' },
              { icon: '⚡', title: 'AI agent isolation',       desc: 'The AI route uses the user\'s JWT — RLS applies to all agent queries.' },
              { icon: '◎', title: 'Solo mode',                desc: 'companies.mode = \'solo\' — simplified sidebar for independent freelancers. Same architecture, UI-only difference.' },
            ]} />
            <Table
              headers={['companies.mode', 'Team section', 'Leave management', 'Timeline', 'Finance']}
              rows={[
                ['team', 'Visible', 'Visible', 'Visible', 'Full (admin/manager)'],
                ['solo', 'Hidden',  'Hidden',  'Hidden',  'Full (self only)'],
              ]}
            />
          </Section>

        </main>
      </div>
    </>
  )
}