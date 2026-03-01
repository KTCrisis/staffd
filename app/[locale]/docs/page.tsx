'use client'

/**
 * app/[locale]/docs/page.tsx
 * Page publique — accessible sans auth à /docs
 * Branding : fl7ai | Thème : flux7.art
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Particle canvas (Background) ───────────────────────────────────────────

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const pts = Array.from({ length: 40 }, () => ({ 
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

const Brand = () => (
  <span style={{ color: '#fff', fontWeight: 'inherit', textTransform: 'none' }}>
    fl7<span style={{ color: 'var(--green)' }}>ai</span>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
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
        .nav-tag{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-left:16px;}
        .nav-links{display:flex;gap:28px;list-style:none;align-items:center;}
        .nav-links a{color:var(--text2);text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;transition:color 0.2s;position:relative;}
        .nav-links a::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:1px;background:var(--green);transition:width 0.2s;}
        .nav-links a:hover{color:var(--green);}.nav-links a:hover::after{width:100%;}
        .nav-cta{background:var(--green)!important;color:#060a06!important;padding:6px 16px!important;border-radius:2px;font-weight:700!important;text-decoration:none;}

        /* ── LAYOUT ── */
        .layout{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:200px 1fr;position:relative;z-index:1;padding-top:72px;}
        aside{position:sticky;top:72px;height:calc(100vh - 72px);padding:48px 0;overflow-y:auto;border-right:1px solid var(--border);}
        main{padding:48px 40px 120px 48px;}

        /* ── MOBILE SPECIFIC ── */
        .mobile-fab {
          display: none; position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
          border-radius: 50%; background: var(--green); color: #060a06; border: none;
          z-index: 1000; box-shadow: 0 4px 20px rgba(0,255,136,0.3); font-weight: 700;
          cursor: pointer; align-items: center; justify-content: center; font-family: var(--font);
        }
        .mobile-overlay {
          position: fixed; inset: 0; background: rgba(6,10,6,0.98); z-index: 999;
          display: flex; flex-direction: column; padding: 100px 40px;
          transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .mobile-overlay.open { transform: translateY(0); }
        .mobile-toc-link { font-size: 20px; color: #fff; text-decoration: none; margin-bottom: 24px; letter-spacing: 2px; text-transform: uppercase; }

        @media (max-width: 900px) {
          .layout { grid-template-columns: 1fr; }
          aside, .nav-links { display: none; }
          main { padding: 40px 20px 100px 20px; }
          .mobile-fab { display: flex; }
          .hero-title { font-size: 42px; letter-spacing: -1px; }
          .workflow-grid { grid-template-columns: 1fr; }
          .data-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .data-table { min-width: 500px; }
        }

        /* ── REVEAL ── */
        .reveal{opacity:0;transform:translateY(20px);transition:opacity 0.6s ease,transform 0.6s ease;}
        .reveal.visible{opacity:1;transform:translateY(0);}
        
        /* ── ELEMENTS ── */
        .toc-label{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;padding-left:24px;}
        .toc-link{display:block;padding:6px 0 6px 24px;font-size:11px;text-decoration:none;color:var(--text2);letter-spacing:1px;border-left:2px solid transparent;}
        .toc-link.active{color:var(--green);border-left-color:var(--green);}
        .role-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:28px;margin-bottom:28px;}
        .workflow-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
        .data-table-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:4px;overflow:hidden;}
        .data-table{width:100%;border-collapse:collapse;font-size:11px;}
        .data-table th, .data-table td{padding:12px 16px; text-align:left; border-bottom:1px solid var(--border);}
        .yes{color:var(--green);} .no{color:rgba(255,45,107,0.5);}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .cursor{animation:blink 1s step-end infinite;}
      `}</style>

      <ParticleCanvas />
      <div className="grid-bg" />

      {/* Navigation */}
      <nav className="doc-nav">
        <div style={{ display:'flex', alignItems:'center' }}>
          <Link href="/" className="nav-logo"><Brand /></Link>
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
          <a href="#workflows"  className="toc-link">Workflows</a>
          <a href="#access"     className="toc-link">Data access</a>
          <a href="#ai"         className="toc-link">Agentic AI <span style={{color:'var(--pink)', fontSize:8}}>[WIP]</span></a>
          <a href="#glossary"   className="toc-link">Glossary</a>
        </aside>

        <main>
          {/* Hero */}
          <section id="overview">
            <div className="hero-tag"><span>Beta 2026</span> — intelligence engine</div>
            <h1 className="hero-title">
              <span style={{color:'#fff'}}>staffing ops,</span><br />
              <span style={{color: 'transparent', WebkitTextStroke: '1px var(--green)'}}>finally</span> <span style={{color:'var(--green)'}}>clear</span>
              <span className="cursor">_</span>
            </h1>
            <p style={{fontSize:13, color:'var(--text2)', marginTop:28, lineHeight:1.8, maxWidth:520}}>
              <Brand /> centralises resource management for <b>ESN and creative agencies</b>. 
              One engine for availability, financial margins, and AI-driven staffing.
            </p>
          </section>

          {/* Section 01: Roles */}
          <section id="roles" style={{ marginBottom: 80 }}>
            <SectionHeader num="01" title="Roles" />
            <RoleSep label="→ admin" color="var(--cyan)" who="CEO · Director" />
            <RoleCard role="admin" who="Full control" accent="cyan" desc="Configures the engine and monitors all financial data." 
              can={['Manage daily rates (TJM)', 'View global margins', 'Approve all leaves']} />
            
            <RoleSep label="→ manager" color="var(--green)" who="Project Manager" />
            <RoleCard role="manager" who="Operations" accent="green" desc="Handles projects and team assignments day-to-day." 
              can={['Create projects', 'Assign consultants', 'Review workloads']} cant={['View financial TJM']} />
          </section>

          {/* Section 02: Workflows */}
          <section id="workflows" style={{ marginBottom: 80 }}>
            <SectionHeader num="02" title="Workflows" />
            <div className="workflow-grid reveal">
              <div className="role-card" style={{margin:0}}>
                <div style={{fontSize:9, color:'var(--green)', letterSpacing:2, marginBottom:20}}>// STAFFING</div>
                <WfStep n={1} label="Setup Client" desc="Create profile in /clients." />
                <WfStep n={2} label="New Project" desc="Define dates and sold rates." />
                <WfStep n={3} label="Assign Team" desc="Select consultants and allocation %." last />
              </div>
              <div className="role-card" style={{margin:0}}>
                <div style={{fontSize:9, color:'var(--green)', letterSpacing:2, marginBottom:20}}>// LEAVES</div>
                <WfStep n={1} label="Request" desc="Consultant submits dates." />
                <WfStep n={2} label="Impact" desc="Manager reviews project collision." />
                <WfStep n={3} label="Decision" desc="Approve or refuse in one click." last />
              </div>
            </div>
          </section>

          {/* Section 03: Data Access */}
          <section id="access" style={{ marginBottom: 80 }}>
            <SectionHeader num="03" title="Data access" />
            <div className="data-table-wrap reveal">
              <table className="data-table">
                <thead>
                  <tr><th>Feature</th><th>Admin</th><th>Manager</th><th>Consultant</th></tr>
                </thead>
                <tbody>
                  {[['Daily rates (TJM)', '✓', '✗', '✗'], ['Margins', '✓', '✗', '✗'], ['Availability', '✓', '✓', '✓']].map((row, i) => (
                    <tr key={i}><td>{row[0]}</td><td className={row[1]==='✓'?'yes':'no'}>{row[1]}</td><td className={row[2]==='✓'?'yes':'no'}>{row[2]}</td><td className={row[3]==='✓'?'yes':'no'}>{row[3]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 04: AI [WIP] */}
          <section id="ai" style={{ marginBottom: 80 }}>
            <SectionHeader num="04" title="Agentic AI" color="var(--pink)" />
            <div className="role-card reveal" style={{borderColor:'var(--pink)', background:'rgba(255,45,107,0.02)'}}>
              <div style={{fontSize:9, color:'var(--pink)', letterSpacing:2, marginBottom:16}}>WIP · EXPERIMENTAL</div>
              <p style={{fontSize:12, color:'var(--text2)', lineHeight:1.7}}>
                Exposing <Brand /> data to LLMs via <b>Model Context Protocol (MCP)</b>. 
                Natural language staffing queries meeting database-level RLS security.
              </p>
              <div style={{marginTop:20, padding:12, border:'1px dashed var(--pink)', fontSize:11, color:'#fff', fontStyle:'italic'}}>
                "Find a React dev available in April with a TJM &lt; 650€"
              </div>
            </div>
          </section>

          {/* Section 05: Glossary */}
          <section id="glossary">
            <SectionHeader num="05" title="Glossary" />
            <div className="data-table-wrap reveal" style={{padding:20}}>
              <div style={{marginBottom:12}}><span style={{color:'var(--cyan)'}}>Tenant</span> : One company workspace (multi-tenant).</div>
              <div><span style={{color:'var(--cyan)'}}>TJM</span> : Daily sold rate (Taux Journalier Moyen).</div>
            </div>
          </section>

          {/* Contact */}
          <section id="contact" className="reveal" style={{ marginTop: 100 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '60px 40px', textAlign: 'center' }}>
              <h3 style={{ fontSize: 28, color: '#fff', marginBottom: 16 }}>Interested in <Brand />?</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 32 }}>Custom AI integrations or private instance deployment.</p>
              <a href="mailto:flux7art@gmail.com" className="nav-cta" style={{padding:'12px 24px'}}>flux7art@gmail.com</a>
            </div>
          </section>

          <footer style={{ marginTop: 80, fontSize: 10, color: 'var(--text2)', textAlign: 'center' }}>
            <Brand /> · 2026
          </footer>
        </main>
      </div>

      {/* Mobile Menu */}
      <button className="mobile-fab" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        {isMenuOpen ? '✕' : 'MENU'}
      </button>
      <div className={`mobile-overlay ${isMenuOpen ? 'open' : ''}`}>
        {['overview', 'roles', 'workflows', 'access', 'ai', 'glossary'].map(id => (
          <a key={id} href={`#${id}`} className="mobile-toc-link" onClick={() => setIsMenuOpen(false)}>{id}</a>
        ))}
      </div>
    </>
  )
}