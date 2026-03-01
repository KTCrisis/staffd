'use client'

/**
 * app/[locale]/docs/page.tsx
 * Page publique — accessible sans auth à /docs
 * Thème flux7.art : JetBrains Mono, particles, scanlines, responsive
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
    const pts = Array.from({ length: 40 }, () => ({ // Réduit à 40 pour perf mobile
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

const Staff7 = () => (
  <span style={{ color: '#fff', fontWeight: 'inherit', textTransform: 'none' }}>
    staff<span style={{ color: 'var(--green)' }}>7</span>
  </span>
);

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

        /* ── RESPONSIVE OVERRIDES ── */
        @media (max-width: 900px) {
          .layout { grid-template-columns: 1fr; }
          aside { display: none; }
          main { padding: 40px 20px 80px 20px; }
          .nav-links { display: none; }
          .doc-nav { padding: 18px 20px; }
        }

        @media (max-width: 600px) {
          .hero-title { font-size: 42px; letter-spacing: -1px; }
          .workflow-grid { grid-template-columns: 1fr; }
          .section-title { font-size: 26px; }
          .data-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -10px; padding: 0 10px; }
          .data-table { min-width: 500px; }
          .gloss-row { flex-direction: column; gap: 4px; padding: 12px 0; }
          .gloss-term { min-width: auto; font-weight: 700; }
          .doc-footer { flex-direction: column; gap: 20px; text-align: center; }
        }

        /* ── WORKFLOW & TABLES ── */
        .workflow-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
        .data-table-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:4px;overflow:hidden;}
        
        /* ── ANIMATIONS ── */
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .reveal{opacity:0;transform:translateY(20px);transition:opacity 0.6s ease,transform 0.6s ease;}
        .reveal.visible{opacity:1;transform:translateY(0);}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .cursor{animation:blink 1s step-end infinite;}
      `}</style>

      <ParticleCanvas />
      <div className="grid-bg" />

      {/* ── Nav ── */}
      <nav className="doc-nav">
        <div style={{ display:'flex', alignItems:'center' }}>
          <Link href="/" className="nav-logo">
            <span className="s">staff</span><span className="d">7</span>
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
              <Staff7 /> centralises consultant management for{' '}
              <b>staffing agencies and consulting firms</b>.
              One platform for availability, project assignments,
              time-off, and financial margins.
            </p>
          </section>

          {/* Section 01: Roles */}
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
                  'Approve or refuse time-off requests',
                ]}
                cant={[
                  'Access /financials (margins, sold rates)',
                  'See consultant daily rates (TJM)',
                ]}
              />
            </div>

            <div id="consultant" style={{ scrollMarginTop: 80 }}>
              <RoleSep label="→ consultant" color="var(--gold)" who="Team member" />
              <RoleCard role="consultant" who="Own data only" accent="gold"
                desc="Limited to their own data. Focused on personal availability, current missions, and time-off."
                can={[
                  'View their own profile and project assignments',
                  'Submit time-off requests',
                  'View the team timeline',
                ]}
              />
            </div>
          </section>

          {/* Section 02: Workflows */}
          <section id="workflows" style={{ scrollMarginTop: 80, marginBottom: 80 }}>
            <SectionHeader num="02" title="Workflows" />
            <div className="workflow-grid reveal">
              <div className="workflow-card">
                <div className="workflow-title">// time-off request</div>
                <WfStep n={1} label="Consultant submits" desc="Selects dates and type (Paid leave, RTT...)." />
                <WfStep n={2} label="Pending in /leaves" desc="Notification badge appears for managers." />
                <WfStep n={3} label="Manager reviews" desc="Checks project impact (e.g. gap in week 12)." />
                <WfStep n={4} label="Action" desc="Approve ✓ or Refuse ✗. Status updates immediately." last />
              </div>
              <div className="workflow-card">
                <div className="workflow-title">// project staffing</div>
                <WfStep n={1} label="Setup client" desc="Create client profile with contact details." />
                <WfStep n={2} label="Create project" desc="Set dates, sold rates and budget." />
                <WfStep n={3} label="Assign team" desc="Select consultants and set allocation %." />
                <WfStep n={4} label="Live tracking" desc="Occupancy and margins update in real-time." last />
              </div>
            </div>
          </section>

          {/* Section 03: Data Access */}
          <section id="access" style={{ scrollMarginTop: 80, marginBottom: 80 }}>
            <SectionHeader num="03" title="Data access" />
            <div className="data-table-wrap reveal">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th style={{color:'var(--cyan)'}}>Admin</th>
                    <th style={{color:'var(--green)'}}>Manager</th>
                    <th style={{color:'var(--gold)'}}>Consultant</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Consultant list',     '✓ All',  '✓ All',   '✗'],
                    ['Daily rates (TJM)',   '✓',      '✗',       '✗'],
                    ['Project financials',  '✓',      '✗',       '✗'],
                    ['Team time-off',       '✓',      '✓',       '✓ Own only'],
                    ['Availability grid',   '✓',      '✓',       '✓'],
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

          {/* Section 04: Agentic AI */}
          <section id="ai" style={{ scrollMarginTop: 80, marginBottom: 80 }}>
            <SectionHeader num="04" title="Agentic AI" color="var(--pink)" />
            <div className="role-card pink reveal" style={{ background: 'rgba(255, 45, 107, 0.02)', borderColor: 'rgba(255, 45, 107, 0.2)' }}>
              <div className="role-header">
                <span className="role-badge pink">WIP · EXPERIMENTAL</span>
                <span className="role-who">Model Context Protocol (MCP)</span>
              </div>
              <p className="role-desc">
                Prototyping an <b>intelligence layer</b> that exposes <Staff7 /> data to LLMs via MCP. 
                Natural language queries (Claude/GPT) meet database security.
              </p>
              <div style={{ borderLeft: '2px solid var(--pink)', paddingLeft: '16px', marginTop: '16px' }}>
                <div style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Semantic Query:</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                  <i>"Find a React dev available in April with a daily rate under 600€"</i>.
                </div>
              </div>
            </div>
          </section>

          {/* Section 05: Glossary */}
          <section id="glossary" style={{ scrollMarginTop: 80, marginBottom: 80 }}>
            <SectionHeader num="05" title="Glossary" />
            <div className="glossary-wrap reveal">
              {[
                ['Tenant',           'A company using Staff7 (e.g. MyAgency).'],
                ['Assignment',       'A consultant allocated to a project with a %.'],
                ['Daily rate',       'TJM — Sold price per day per consultant.'],
                ['Occupancy rate',   'Total allocation = sum of all active assignments.'],
              ].map(([term, def], i) => (
                <div key={i} className="gloss-row">
                  <span className="gloss-term" style={{color:'var(--cyan)'}}>{term}</span>
                  <span className="gloss-def">{def}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="reveal" style={{ marginTop: 80, marginBottom: 40 }}>
            <div style={{ 
              background: 'linear-gradient(145deg, var(--bg2), var(--bg))',
              border: '1px solid var(--dim)',
              borderRadius: '4px',
              padding: '60px 20px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, var(--green), transparent)' }} />
              <h3 style={{ fontSize: 28, color: '#fff', marginBottom: 16 }}>Interested in <Staff7/>?</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 32, maxWidth: '500px', margin: '0 auto 32px' }}>
                Deploy a private instance or join the beta.
              </p>
              <a href="mailto:flux7art@gmail.com" className="doc-footer-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '12px 24px', fontSize: 13 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                flux7art@gmail.com
              </a>
            </div>
          </section>

          <div className="doc-footer reveal">
            <span style={{ fontSize:10, color:'var(--text2)', letterSpacing:2 }}>
              <Staff7 /> · built on cloudflare · beta 2026
            </span>
            <Link href="/login" className="doc-footer-cta">→ sign in</Link>
          </div>
        </main>
      </div>
    </>
  )
}