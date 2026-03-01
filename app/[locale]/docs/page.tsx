'use client'

/**
 * app/[locale]/docs/page.tsx
 * Page publique — accessible sans auth à /docs
 * Thème flux7.art : JetBrains Mono, particles, scanlines, multi-roles
 */

import { useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Particle canvas (Background) ───────────────────────────────────────────

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5, c: Math.random() > 0.5 ? '#00ff88' : '#00e5ff',
    }))
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.c; ctx.fill()
      })
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
          ctx.strokeStyle = `rgba(0,255,136,${0.15 * (1 - d / 120)})`
          ctx.lineWidth = 0.5; ctx.stroke()
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.35 }} />
}

// ── Hooks ──────────────────────────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useTocSpy() {
  useEffect(() => {
    const links = document.querySelectorAll('.toc-link')
    const ids = ['overview','roles','workflows','access','ai','glossary']
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(l => l.classList.remove('active'))
          document.querySelector(`.toc-link[href="#${e.target.id}"]`)?.classList.add('active')
        }
      })
    }, { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' })
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])
}

// ── Components ─────────────────────────────────────────────────────────────

function SectionHeader({ num, title, id, color }: { num: string; title: string; id?: string, color?: string }) {
  return (
    <div id={id} className="section-header reveal" style={{ scrollMarginTop: 80 }}>
      <span className="section-num" style={color ? { color } : {}}>{num} //</span>
      <h2 className="section-title">{title}</h2>
      <div className="section-line" />
    </div>
  )
}

function RoleCard({ role, who, accent, desc, can, cant }: {
  role: string; who: string; accent: 'green' | 'cyan' | 'gold' | 'pink'
  desc: string; can: string[]; cant?: string[]
}) {
  return (
    <div className={`role-card ${accent} reveal`}>
      <div className="role-header">
        <span className={`role-badge ${accent}`}>{role}</span>
        <span className="role-who">{who}</span>
      </div>
      <p className="role-desc">{desc}</p>
      <div className="can-list">
        {can.map((item, i) => (
          <div key={i} className="can-item"><span className="tick">✓</span>{item}</div>
        ))}
      </div>
      {cant && cant.length > 0 && (
        <div className="cant-list">
          {cant.map((item, i) => (
            <div key={i} className="cant-item"><span className="cross">✗</span>{item}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoleSep({ label, color, who }: { label: string; color: string; who: string }) {
  return (
    <div className="role-sep reveal">
      <span style={{ color }}>{label}</span>
      <div className="line" />
      <span className="who">{who}</span>
    </div>
  )
}

function WfStep({ n, label, desc, last }: { n: number; label: string; desc: string; last?: boolean }) {
  return (
    <div className="wf-step">
      <div className="wf-step-left">
        <div className="wf-num">{n}</div>
        {!last && <div className="wf-line" />}
      </div>
      <div className="wf-content" style={last ? { paddingBottom: 0 } : {}}>
        <div className="wf-label">{label}</div>
        <div className="wf-desc">{desc}</div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

const Staffd = () => (
  <span style={{ color: '#fff', fontWeight: 'inherit', textTransform: 'none' }}>
    staff<span style={{ color: 'var(--green)' }}>d</span>
  </span>
);


export default function DocsPage() {
  useReveal()
  useTocSpy()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&display=swap');
        :root {
          --bg:#060a06; --bg2:#0c120c; --bg3:#111811;
          --green:#00ff88; --pink:#ff2d6b; --cyan:#00e5ff; --gold:#ffd166;
          --dim:#2a3a2a; --text:#b8ccb8; --text2:#5a7a5a; --border:#1a2a1a;
          --font:'JetBrains Mono',monospace;
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;}
        body::after{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px);pointer-events:none;z-index:9999;}
        .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(#1a2a1a 1px,transparent 1px),linear-gradient(90deg,#1a2a1a 1px,transparent 1px);background-size:40px 40px;opacity:0.4;}

        /* ── NAV ── */
        .doc-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:linear-gradient(to bottom,rgba(6,10,6,0.97),transparent);backdrop-filter:blur(2px);}
        .nav-logo{font-size:18px;font-weight:700;letter-spacing:-0.5px;text-decoration:none;}
        .nav-logo .s{color:#fff;}.nav-logo .d{color:var(--green);}
        .nav-tag{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-left:16px;}
        .nav-links{display:flex;gap:28px;list-style:none;align-items:center;}
        .nav-links a{color:var(--text2);text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;transition:color 0.2s;position:relative;}
        .nav-links a::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:1px;background:var(--green);transition:width 0.2s;}
        .nav-links a:hover{color:var(--green);}.nav-links a:hover::after{width:100%;}
        .nav-cta{background:var(--green)!important;color:#060a06!important;padding:6px 16px!important;border-radius:2px;font-weight:700!important;}
        .nav-cta::after{display:none!important;}.nav-cta:hover{opacity:0.9;}

        /* ── LAYOUT ── */
        .layout{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:200px 1fr;position:relative;z-index:1;padding-top:72px;}

        /* ── SIDEBAR ── */
        aside{position:sticky;top:72px;height:calc(100vh - 72px);padding:48px 0;overflow-y:auto;border-right:1px solid var(--border);}
        .toc-label{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;padding-left:24px;}
        .toc-link{display:block;padding:6px 0 6px 24px;font-size:11px;text-decoration:none;color:var(--text2);letter-spacing:1px;border-left:2px solid transparent;transition:all 0.15s;}
        .toc-link:hover{color:var(--green);border-left-color:rgba(0,255,136,0.4);}
        .toc-link.active{color:var(--green);border-left-color:var(--green);}
        .toc-link.sub{padding-left:36px;font-size:10px;}

        /* ── MAIN ── */
        main{padding:48px 40px 120px 48px;}

        /* ── HERO ── */
        #overview{min-height:70vh;display:flex;flex-direction:column;justify-content:center;padding-top:40px;margin-bottom:80px;}
        .hero-tag{font-size:11px;letter-spacing:4px;color:var(--text2);text-transform:uppercase;margin-bottom:24px;opacity:0;animation:fadeUp 0.6s ease 0.2s forwards;}
        .hero-tag span{color:var(--green);border:1px solid var(--green);padding:2px 10px;border-radius:2px;}
        .hero-title{font-size:clamp(40px,7vw,78px);font-weight:700;line-height:0.95;letter-spacing:-3px;margin-bottom:8px;opacity:0;animation:fadeUp 0.6s ease 0.4s forwards;}
        .hero-title .t1{color:#fff;}.hero-title .t2{color:transparent;-webkit-text-stroke:1px var(--green);}.hero-title .t3{color:var(--green);}
        .hero-sub{font-size:13px;color:var(--text2);margin-top:28px;line-height:1.8;max-width:520px;opacity:0;animation:fadeUp 0.6s ease 0.6s forwards;}
        .hero-sub b{color:var(--cyan);font-weight:400;}
        .hero-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:32px;opacity:0;animation:fadeUp 0.6s ease 0.8s forwards;}
        .htag{font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border:1px solid var(--border);border-radius:2px;color:var(--text2);transition:all 0.2s;display:inline-block;}
        .htag:hover{border-color:var(--green);color:var(--green);background:rgba(0,255,136,0.05);}

        /* ── INTRO BLOCK ── */
        .intro-block{background:var(--bg2);border:1px solid var(--border);border-left:2px solid var(--green);padding:24px 28px;margin-bottom:80px;}
        .block-label{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--text2);margin-bottom:14px;}
        .intro-block p{font-size:13px;line-height:1.8;color:var(--text);}

        /* ── SECTION HEADER ── */
        .section-header{display:flex;align-items:baseline;gap:20px;margin-bottom:40px;}
        .section-num{font-size:11px;color:var(--green);letter-spacing:3px;}
        .section-title{font-size:30px;font-weight:700;color:#fff;letter-spacing:-1px;}
        .section-line{flex:1;height:1px;background:var(--border);}

        /* ── ROLE SEP ── */
        .role-sep{display:flex;align-items:center;gap:12px;font-size:9px;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;}
        .role-sep .line{flex:1;height:1px;background:var(--border);}
        .role-sep .who{color:var(--text2);}

        /* ── ROLE CARD ── */
        .role-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:28px;position:relative;overflow:hidden;transition:all 0.3s;margin-bottom:28px;}
        .role-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:transparent;transition:background 0.3s;}
        .role-card:hover{border-color:var(--dim);transform:translateY(-1px);background:var(--bg3);}
        .role-card.green:hover{border-color:rgba(0,255,136,0.3);}.role-card.green:hover::before{background:var(--green);}
        .role-card.cyan:hover{border-color:rgba(0,229,255,0.3);}.role-card.cyan:hover::before{background:var(--cyan);}
        .role-card.gold:hover{border-color:rgba(255,209,102,0.3);}.role-card.gold:hover::before{background:var(--gold);}
        .role-card.pink:hover{border-color:rgba(255,45,107,0.3);}.role-card.pink:hover::before{background:var(--pink);}
        
        .role-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
        .role-badge{font-size:9px;letter-spacing:3px;text-transform:uppercase;padding:2px 10px;border-radius:2px;}
        .role-badge.green{background:rgba(0,255,136,0.1);color:var(--green);border:1px solid rgba(0,255,136,0.3);}
        .role-badge.cyan{background:rgba(0,229,255,0.1);color:var(--cyan);border:1px solid rgba(0,229,255,0.3);}
        .role-badge.gold{background:rgba(255,209,102,0.1);color:var(--gold);border:1px solid rgba(255,209,102,0.3);}
        .role-badge.pink{background:rgba(255,45,107,0.1);color:var(--pink);border:1px solid rgba(255,45,107,0.3);}
        
        .role-who{font-size:10px;color:var(--text2);}
        .role-desc{font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:20px;}
        .can-list{display:flex;flex-direction:column;gap:7px;margin-bottom:14px;}
        .can-item{display:flex;gap:10px;font-size:11px;color:var(--text);}
        .tick{color:var(--green);flex-shrink:0;}
        .cant-list{display:flex;flex-direction:column;gap:7px;border-top:1px solid var(--border);padding-top:14px;}
        .cant-item{display:flex;gap:10px;font-size:11px;color:var(--text2);}
        .cross{color:rgba(255,45,107,0.5);flex-shrink:0;}

        /* ── WORKFLOW ── */
        .workflow-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
        .workflow-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:28px;}
        .workflow-title{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--text2);margin-bottom:24px;border-left:2px solid var(--green);padding-left:10px;}
        .wf-step{display:flex;gap:16px;}
        .wf-step-left{display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
        .wf-num{width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,255,136,0.4);background:rgba(0,255,136,0.05);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--green);}
        .wf-line{width:1px;flex:1;background:var(--border);margin:4px 0;}
        .wf-content{padding-bottom:20px;}
        .wf-label{font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;}
        .wf-desc{font-size:11px;color:var(--text2);line-height:1.6;}

        /* ── DATA TABLE ── */
        .data-table-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:4px;overflow:hidden;}
        .data-table{width:100%;border-collapse:collapse;font-size:11px;}
        .data-table th{padding:10px 16px;text-align:left;color:var(--text2);font-weight:600;letter-spacing:1px;border-bottom:1px solid var(--border);background:rgba(0,0,0,0.3);}
        .data-table th.green{color:var(--green);}.data-table th.cyan{color:var(--cyan);}.data-table th.gold{color:var(--gold);}
        .data-table td{padding:10px 16px;border-bottom:1px solid var(--border);color:var(--text);}
        .data-table tr:last-child td{border-bottom:none;}
        .data-table tr:nth-child(even) td{background:rgba(255,255,255,0.01);}
        .yes{color:var(--green)!important;}.no{color:rgba(255,45,107,0.5)!important;}.partial{color:var(--gold)!important;}

        /* ── GLOSSARY ── */
        .glossary-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 20px;}
        .gloss-row{display:flex;gap:14px;padding:10px 0;border-bottom:1px solid var(--border);font-size:11px;}
        .gloss-row:last-child{border-bottom:none;}
        .gloss-term{color:var(--cyan);min-width:140px;flex-shrink:0;}
        .gloss-def{color:var(--text2);line-height:1.6;}

        /* ── FOOTER ── */
        .doc-footer{border-top:1px solid var(--border);padding-top:32px;margin-top:80px;display:flex;justify-content:space-between;align-items:center;}
        .doc-footer-cta{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#060a06;background:var(--green);padding:8px 20px;border-radius:2px;text-decoration:none;transition:opacity 0.2s;}
        .doc-footer-cta:hover{opacity:0.85;}

        /* ── ANIMATIONS ── */
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .reveal{opacity:0;transform:translateY(20px);transition:opacity 0.6s ease,transform 0.6s ease;}
        .reveal.visible{opacity:1;transform:translateY(0);}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .cursor{animation:blink 1s step-end infinite;}

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px;}
      `}</style>

      <ParticleCanvas />
      <div className="grid-bg" />

      {/* ── Nav ── */}
      <nav className="doc-nav">
        <div style={{ display:'flex', alignItems:'center' }}>
          <Link href="/login" className="nav-logo">
            <span className="s">staff</span><span className="d">d</span>
          </Link>
          <span className="nav-tag">// docs</span>
        </div>
        <ul className="nav-links">
          {['overview','roles','workflows','access','ai','glossary'].map(s => (
            <li key={s}><a href={`#${s}`}>{s}</a></li>
          ))}
          <li><Link href="/login" className="nav-cta">sign in →</Link></li>
        </ul>
      </nav>

      <div className="layout">
        <aside>
          <div className="toc-label">// contents</div>
          <a href="#overview"   className="toc-link active">Overview</a>
          <a href="#roles"      className="toc-link">Roles</a>
          <a href="#admin"      className="toc-link sub">→ Admin</a>
          <a href="#manager"    className="toc-link sub">→ Manager</a>
          <a href="#consultant" className="toc-link sub">→ Consultant</a>
          <a href="#workflows"  className="toc-link">Workflows</a>
          <a href="#access"     className="toc-link">Data access</a>
          <a href="#ai"         className="toc-link">Agentic AI <span style={{ fontSize: 8, color: 'var(--pink)', marginLeft: 4 }}>[WIP]</span></a>
          <a href="#glossary"   className="toc-link">Glossary</a>
        </aside>

        <main>
          {/* Hero */}
          <section id="overview">
            <div className="hero-tag">
              <span>Beta 2026</span> — consultant resource management
            </div>
            <h1 className="hero-title">
              <span className="t1">staffing ops,</span><br />
              <span className="t2">finally</span> <span className="t3">clear</span>
              <span className="cursor">_</span>
            </h1>
            <p className="hero-sub">
              staffd centralises consultant management for{' '}
              <b>staffing agencies and consulting firms</b>.
              One platform for availability, project assignments,
              time-off, and financial margins.
            </p>
            <div className="hero-tags">
              {['Real-time occupancy','Project assignments','Leave workflows','Financial margins','Monthly timeline','Multi-tenant'].map((f,i) => (
                <span key={i} className="htag">{f}</span>
              ))}
            </div>
          </section>

          {/* Intro Block */}
          <div className="intro-block reveal">
            <div className="block-label">// what is staffd</div>
            <p>
              staffd replaces spreadsheets and fragmented tools with a fast, role-aware interface.
              It gives operations and project managers a single source of truth for{' '}
              <span style={{ color:'var(--green)' }}>consultant availability</span>,{' '}
              <span style={{ color:'var(--cyan)' }}>project staffing</span>, and{' '}
              <span style={{ color:'var(--gold)' }}>financial performance</span>.
              Each company runs in its own isolated workspace — fully multi-tenant.
            </p>
          </div>

          {/* ── Section 01: Roles ── */}
          <section style={{ marginBottom: 80 }}>
            <SectionHeader num="01" title="Roles" id="roles" />

            <div id="admin" style={{ scrollMarginTop: 80 }}>
              <RoleSep label="→ admin" color="var(--cyan)" who="CEO · Director" />
              <RoleCard role="admin" who="Full access including financials" accent="cyan"
                desc="Configures and operates the entire platform. Sees all data — including confidential daily rates and financial margins."
                can={[
                  'Create, edit, delete consultants — including daily rates (TJM)',
                  'Create and manage clients with sector and contact info',
                  'Create projects (external or internal) with full financial data',
                  'Assign consultants to projects with allocation %',
                  'Approve or refuse time-off requests',
                  'Access /financials — margins, sold rates, gross margin per project',
                ]}
              />
            </div>

            <div id="manager" style={{ scrollMarginTop: 80 }}>
              <RoleSep label="→ manager" color="var(--green)" who="Project manager · HR" />
              <RoleCard role="manager" who="Operational access — no financials" accent="green"
                desc="Handles day-to-day staffing and project operations. Cannot see confidential financial data."
                can={[
                  'View consultant profiles and manage assignments',
                  'Create and edit projects (without financial fields)',
                  'Create and manage clients',
                  'Approve or refuse time-off requests',
                  'View the availability grid and timeline',
                ]}
                cant={[
                  'Access /financials (margins, sold rates)',
                  'See consultant daily rates (TJM)',
                  'See project financial data (sold days, budget)',
                ]}
              />
            </div>

            <div id="consultant" style={{ scrollMarginTop: 80 }}>
              <RoleSep label="→ consultant" color="var(--gold)" who="Team member" />
              <RoleCard role="consultant" who="Own data only" accent="gold"
                desc="Limited to their own data. Focused on personal availability, current missions, and time-off."
                can={[
                  'View their own profile (daily rate hidden)',
                  'See their current and upcoming project assignments',
                  'Submit time-off requests',
                  'View the team timeline',
                ]}
                cant={[
                  "See other consultants' profiles or data",
                  'Create or edit projects or clients',
                  'Access /financials or any financial data',
                ]}
              />
            </div>
          </section>

          {/* ── Section 02: Workflows ── */}
          <section id="workflows" style={{ scrollMarginTop: 80, marginBottom: 80 }}>
            <SectionHeader num="02" title="Workflows" />
            <div className="workflow-grid reveal">
              <div className="workflow-card">
                <div className="workflow-title">// time-off request</div>
                <WfStep n={1} label="Consultant submits a request"    desc="Selects type, dates, and number of days." />
                <WfStep n={2} label="Appears in /leaves as Pending"   desc="Red badge in the sidebar shows count of pending requests." />
                <WfStep n={3} label="Manager or Admin reviews"       desc="Reviews impact on projects." />
                <WfStep n={4} label="Approve ✓ or Refuse ✗"           desc="Status updates immediately." last />
              </div>
              <div className="workflow-card">
                <div className="workflow-title">// staffing a project</div>
                <WfStep n={1} label="Create the client"       desc="Add name, sector, and contact details." />
                <WfStep n={2} label="Create the project"      desc="Fill in dates, status, and financial data." />
                <WfStep n={3} label="Assign consultants"      desc="Set dates and allocation % in the project drawer." />
                <WfStep n={4} label="Track in real time"      desc="Monitor occupancy and margins." last />
              </div>
            </div>
          </section>

          {/* ── Section 03: Data Access ── */}
          <section id="access" style={{ scrollMarginTop: 80, marginBottom: 80 }}>
            <SectionHeader num="03" title="Data access" />
            <div className="data-table-wrap reveal">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th className="cyan">Admin</th>
                    <th className="green">Manager</th>
                    <th className="gold">Consultant</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Consultant list',     '✓ All',  '✓ All',           '✗'],
                    ['Consultant profile',  '✓ Full', '✓ No daily rate', '✓ Own only'],
                    ['Daily rates (TJM)',   '✓',      '✗',               '✗'],
                    ['Project list',        '✓ All',  '✓ All',           '✓ Own projects'],
                    ['Project financials',  '✓',      '✗',               '✗'],
                    ['Availability grid',   '✓',      '✓',               '✓'],
                  ].map(([label, admin, manager, consultant], i) => (
                    <tr key={i}>
                      <td>{label}</td>
                      <td className={admin === '✗' ? 'no' : 'yes'}>{admin}</td>
                      <td className={manager === '✗' ? 'no' : 'yes'}>{manager}</td>
                      <td className={consultant === '✗' ? 'no' : consultant.includes('Own') ? 'partial' : 'yes'}>{consultant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 04: Agentic AI (WIP) ── */}
          <section id="ai" style={{ scrollMarginTop: 80, marginBottom: 80 }}>
            <SectionHeader num="04" title="Agentic AI" color="var(--pink)" />
            
            <div className="role-card pink reveal" style={{ background: 'rgba(255, 45, 107, 0.02)', borderColor: 'rgba(255, 45, 107, 0.2)' }}>
              <div className="role-header">
                <span className="role-badge pink">WIP · EXPERIMENTAL</span>
                <span className="role-who">Model Context Protocol (MCP)</span>
              </div>
              
              <p className="role-desc">
                We are prototyping an <b>intelligence layer</b> that exposes staffd data directly to LLMs (Claude, GPT) via the MCP protocol. 
                This enables natural language interactions while enforcing your existing security rules.
              </p>

              <div className="workflow-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
                <div style={{ borderLeft: '2px solid var(--pink)', paddingLeft: '16px' }}>
                  <div style={{ fontSize: 11, fontWeight: '700', color: '#fff', marginBottom: 4 }}>Semantic Staffing Queries</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 12 }}>
                    Ask: <i>"Find a React consultant available in April with a daily rate under 600€"</i>.
                  </div>
                </div>
                
                <div style={{ borderLeft: '2px solid var(--pink)', paddingLeft: '16px' }}>
                  <div style={{ fontSize: 11, fontWeight: '700', color: '#fff', marginBottom: 4 }}>Role-Aware Intelligence</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    The AI inherits your <b>Supabase RLS policies</b>. Confidential data remains hidden if the user's role doesn't allow it.
                  </div>
                </div>
              </div>

              

              <div className="hero-tags" style={{ marginTop: 24 }}>
                {['FastAPI MCP Server', 'Natural Language SQL', 'Security Context', 'Agentic Workflows'].map((t, i) => (
                  <span key={i} className="htag" style={{ borderColor: 'var(--pink)', color: 'var(--pink)', fontSize: 9 }}>{t}</span>
                ))}
              </div>
            </div>
          </section>

          {/* ── Section 05: Glossary ── */}
          <section id="glossary" style={{ scrollMarginTop: 80, marginBottom: 80 }}>
            <SectionHeader num="05" title="Glossary" />
            <div className="glossary-wrap reveal">
              {[
                ['Tenant',           'A company using staffd (e.g. NexDigital).'],
                ['Consultant',       'A team member, billable or not.'],
                ['Client',           'An external company the firm sells services to.'],
                ['Internal project', 'A non-billable project — R&D, training, pre-sales.'],
                ['Assignment',       'A consultant allocated to a project with an allocation %.'],
                ['Daily rate',       "The sold price per day for a consultant (TJM in French)."],
                ['Occupancy rate',   'Total occupation = sum of all active allocations.'],
              ].map(([term, def], i) => (
                <div key={i} className="gloss-row">
                  <span className="gloss-term">{term}</span>
                  <span className="gloss-def">{def}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section Contact / Lead Generation ── */}
          <section id="contact" className="reveal" style={{ marginTop: 100, marginBottom: 40 }}>
            <div style={{ 
              background: 'linear-gradient(145deg, var(--bg2), var(--bg))',
              border: '1px solid var(--dim)',
              borderRadius: '4px',
              padding: '60px 40px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Petite ligne décorative animée en haut */}
              <div style={{ 
                position: 'absolute', 
                top: 0, left: 0, width: '100%', height: '2px', 
                background: 'linear-gradient(90deg, transparent, var(--green), transparent)' 
              }} />
              
              <h3 style={{ fontSize: 28, color: '#fff', marginBottom: 16, letterSpacing: '-1px' }}>
                Interested in <Staffd/>?
              </h3>
              
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 32, maxWidth: '500px', margin: '0 auto 32px', lineHeight: 1.6 }}>
                Whether you want to deploy a private instance, join the Beta, 
                or discuss custom AI integrations for your agency.
              </p>

              <a href="mailto:flux7art@gmail.com" 
                className="doc-footer-cta" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '12px 24px',
                  fontSize: 13 
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                </svg>
                flux7art@gmail.com
              </a>
            </div>
          </section>


          <div className="doc-footer reveal">
            <span style={{ fontSize:10, color:'var(--text2)', letterSpacing:2 }}>
              staffd · built on cloudflare · beta 2026
            </span>
            <Link href="/login" className="doc-footer-cta">→ sign in</Link>
          </div>
        </main>
      </div>
    </>
  )
}