'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

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
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
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

function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useTocSpy() {
  useEffect(() => {
    const links = document.querySelectorAll('.toc-link')
    const ids = ['overview','consultants','projects','timesheets','leaves','availability','financials','roles']
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

const Staff7 = () => (
  <span style={{ color:'#fff', fontWeight:'inherit' }}>
    staff<span style={{ color:'var(--green)' }}>7</span>
  </span>
)

function SectionHeader({ num, title, id, color = 'var(--green)' }: { num:string; title:string; id?:string; color?:string }) {
  return (
    <div id={id} className="section-header reveal" style={{ scrollMarginTop:80 }}>
      <span className="section-num" style={{ color }}>{num} //</span>
      <h2 className="section-title">{title}</h2>
      <div className="section-line" />
    </div>
  )
}

function WfStep({ n, label, desc, last }: { n:number; label:string; desc:string; last?:boolean }) {
  return (
    <div className="wf-step">
      <div className="wf-step-left">
        <div className="wf-num">{n}</div>
        {!last && <div className="wf-line" />}
      </div>
      <div className="wf-content" style={last ? { paddingBottom:0 } : {}}>
        <div className="wf-label">{label}</div>
        <div className="wf-desc">{desc}</div>
      </div>
    </div>
  )
}

function RoleCard({ role, who, accent, desc, can, cant }: {
  role:string; who:string; accent:'green'|'cyan'|'gold'
  desc:string; can:string[]; cant?:string[]
}) {
  return (
    <div className={`role-card ${accent} reveal`}>
      <div className="role-header">
        <span className={`role-badge ${accent}`}>{role}</span>
        <span className="role-who">{who}</span>
      </div>
      <p className="role-desc">{desc}</p>
      <div className="can-list">
        {can.map((item,i) => <div key={i} className="can-item"><span className="tick">✓</span>{item}</div>)}
      </div>
      {cant && cant.length > 0 && (
        <div className="cant-list">
          {cant.map((item,i) => <div key={i} className="cant-item"><span className="cross">✗</span>{item}</div>)}
        </div>
      )}
    </div>
  )
}

function MobileMenu({ open, onClose }: { open:boolean; onClose:()=>void }) {
  const sections = ['overview','consultants','projects','timesheets','leaves','availability','financials','roles']
  if (!open) return null
  return (
    <div className="mobile-menu-overlay" onClick={onClose}>
      <div className="mobile-menu" onClick={e => e.stopPropagation()}>
        <div className="mobile-menu-header">
          <span style={{ fontSize:9, letterSpacing:3, color:'var(--text2)', textTransform:'uppercase' }}>// contents</span>
          <button onClick={onClose} className="mobile-menu-close">✕</button>
        </div>
        {sections.map(s => (
          <a key={s} href={`#${s}`} className="mobile-menu-link" onClick={onClose}>{s}</a>
        ))}
        <Link href="/login" className="mobile-menu-cta" onClick={onClose}>→ sign in</Link>
      </div>
    </div>
  )
}

export default function PlatformDocsPage() {
  useReveal()
  useTocSpy()
  const [menuOpen, setMenuOpen] = useState(false)

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

        .doc-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:linear-gradient(to bottom,rgba(6,10,6,0.97),transparent);backdrop-filter:blur(2px);}
        .nav-logo{font-size:18px;font-weight:700;letter-spacing:-0.5px;text-decoration:none;}
        .nav-logo .s{color:#fff;}.nav-logo .d{color:var(--green);}
        .nav-tag{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-left:16px;}
        .nav-links{display:flex;gap:28px;list-style:none;align-items:center;}
        .nav-links a{color:var(--text2);text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;transition:color .2s;position:relative;}
        .nav-links a::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:1px;background:var(--green);transition:width .2s;}
        .nav-links a:hover{color:var(--green);}.nav-links a:hover::after{width:100%;}
        .nav-cta{background:var(--green)!important;color:#060a06!important;padding:6px 16px!important;border-radius:2px;font-weight:700!important;}
        .nav-cta::after{display:none!important;}
        .hamburger{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:4px;background:none;border:none;}
        .hamburger span{display:block;width:20px;height:1.5px;background:var(--text2);}

        .mobile-menu-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);}
        .mobile-menu{position:absolute;top:0;right:0;width:260px;height:100%;background:var(--bg2);border-left:1px solid var(--border);padding:24px;display:flex;flex-direction:column;gap:4px;}
        .mobile-menu-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
        .mobile-menu-close{background:none;border:none;color:var(--text2);font-size:14px;cursor:pointer;font-family:var(--font);}
        .mobile-menu-link{display:block;padding:10px 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--text2);text-decoration:none;border:1px solid transparent;border-radius:2px;transition:all .15s;}
        .mobile-menu-link:hover{color:var(--green);border-color:rgba(0,255,136,.2);}
        .mobile-menu-cta{display:block;margin-top:16px;padding:10px 16px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#060a06;background:var(--green);border-radius:2px;text-decoration:none;text-align:center;}

        .layout{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:200px 1fr;position:relative;z-index:1;padding-top:72px;}
        aside{position:sticky;top:72px;height:calc(100vh - 72px);padding:48px 0;overflow-y:auto;border-right:1px solid var(--border);}
        .toc-label{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;padding-left:24px;}
        .toc-link{display:block;padding:6px 0 6px 24px;font-size:11px;text-decoration:none;color:var(--text2);letter-spacing:1px;border-left:2px solid transparent;transition:all .15s;}
        .toc-link:hover{color:var(--green);border-left-color:rgba(0,255,136,.4);}
        .toc-link.active{color:var(--green);border-left-color:var(--green);}
        .toc-back{display:block;padding:6px 0 20px 24px;font-size:10px;color:var(--text2);text-decoration:none;letter-spacing:1px;transition:color .15s;}
        .toc-back:hover{color:var(--cyan);}

        main{padding:48px 40px 120px 48px;}

        /* ── HERO ── */
        #overview{min-height:60vh;display:flex;flex-direction:column;justify-content:center;padding-top:40px;margin-bottom:80px;}
        .hero-tag{font-size:11px;letter-spacing:4px;color:var(--text2);text-transform:uppercase;margin-bottom:24px;opacity:0;animation:fadeUp .6s ease .2s forwards;}
        .hero-tag span{color:var(--cyan);border:1px solid rgba(0,229,255,.3);padding:2px 10px;border-radius:2px;}
        .hero-title{font-size:clamp(36px,6vw,68px);font-weight:700;line-height:.95;letter-spacing:-3px;margin-bottom:8px;opacity:0;animation:fadeUp .6s ease .4s forwards;color:#fff;}
        .hero-title em{font-style:normal;color:var(--cyan);}
        .hero-sub{font-size:13px;color:var(--text2);margin-top:24px;line-height:1.8;max-width:520px;opacity:0;animation:fadeUp .6s ease .6s forwards;}
        .hero-sub b{color:var(--green);font-weight:400;}

        /* ── SECTION ── */
        .section-header{display:flex;align-items:baseline;gap:20px;margin-bottom:40px;}
        .section-num{font-size:11px;color:var(--green);letter-spacing:3px;}
        .section-title{font-size:30px;font-weight:700;color:#fff;letter-spacing:-1px;}
        .section-line{flex:1;height:1px;background:var(--border);}

        /* ── FEATURE BLOCK ── */
        .feature-block{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:28px;margin-bottom:16px;}
        .feature-block-label{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--text2);margin-bottom:16px;}
        .feature-list{display:flex;flex-direction:column;gap:10px;}
        .feature-item{display:flex;gap:12px;font-size:12px;color:var(--text);line-height:1.6;}
        .feature-item-icon{flex-shrink:0;color:var(--green);font-size:14px;margin-top:1px;}

        /* ── WORKFLOW ── */
        .workflow-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px;}
        .workflow-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:28px;}
        .workflow-title{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--text2);margin-bottom:24px;border-left:2px solid var(--green);padding-left:10px;}
        .wf-step{display:flex;gap:16px;}
        .wf-step-left{display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
        .wf-num{width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,255,136,.4);background:rgba(0,255,136,.05);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--green);}
        .wf-line{width:1px;flex:1;background:var(--border);margin:4px 0;}
        .wf-content{padding-bottom:20px;}
        .wf-label{font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;}
        .wf-desc{font-size:11px;color:var(--text2);line-height:1.6;}

        /* ── STATUS CHIPS ── */
        .status-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
        .chip{font-size:9px;padding:3px 10px;border-radius:2px;letter-spacing:1px;font-weight:700;text-transform:uppercase;}

        /* ── ROLE CARDS ── */
        .role-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:28px;margin-bottom:20px;transition:all .2s;}
        .role-card:hover{background:var(--bg3);}
        .role-card.green:hover{border-color:rgba(0,255,136,.25);}
        .role-card.cyan:hover{border-color:rgba(0,229,255,.25);}
        .role-card.gold:hover{border-color:rgba(255,209,102,.25);}
        .role-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;}
        .role-badge{font-size:9px;letter-spacing:3px;text-transform:uppercase;padding:2px 10px;border-radius:2px;}
        .role-badge.green{background:rgba(0,255,136,.1);color:var(--green);border:1px solid rgba(0,255,136,.3);}
        .role-badge.cyan{background:rgba(0,229,255,.1);color:var(--cyan);border:1px solid rgba(0,229,255,.3);}
        .role-badge.gold{background:rgba(255,209,102,.1);color:var(--gold);border:1px solid rgba(255,209,102,.3);}
        .role-who{font-size:10px;color:var(--text2);}
        .role-desc{font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:20px;}
        .can-list{display:flex;flex-direction:column;gap:7px;margin-bottom:14px;}
        .can-item{display:flex;gap:10px;font-size:11px;color:var(--text);}
        .tick{color:var(--green);flex-shrink:0;}
        .cant-list{display:flex;flex-direction:column;gap:7px;border-top:1px solid var(--border);padding-top:14px;}
        .cant-item{display:flex;gap:10px;font-size:11px;color:var(--text2);}
        .cross{color:rgba(255,45,107,.5);flex-shrink:0;}

        /* ── DATA TABLE ── */
        .data-table-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:4px;overflow-x:auto;}
        .data-table{width:100%;border-collapse:collapse;font-size:11px;min-width:420px;}
        .data-table th{padding:10px 16px;text-align:left;color:var(--text2);font-weight:600;letter-spacing:1px;border-bottom:1px solid var(--border);background:rgba(0,0,0,.3);}
        .data-table th.green{color:var(--green);}.data-table th.cyan{color:var(--cyan);}.data-table th.gold{color:var(--gold);}
        .data-table td{padding:10px 16px;border-bottom:1px solid var(--border);color:var(--text);}
        .data-table tr:last-child td{border-bottom:none;}
        .yes{color:var(--green)!important;}.no{color:rgba(255,45,107,.5)!important;}.partial{color:var(--gold)!important;}

        /* ── GLOSSARY ── */
        .glossary-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 20px;}
        .gloss-row{display:flex;gap:14px;padding:10px 0;border-bottom:1px solid var(--border);font-size:11px;}
        .gloss-row:last-child{border-bottom:none;}
        .gloss-term{color:var(--cyan);min-width:140px;flex-shrink:0;}
        .gloss-def{color:var(--text2);line-height:1.6;}

        /* ── AI CTA BANNER ── */
        .ai-banner{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 28px;background:rgba(255,45,107,.04);border:1px solid rgba(255,45,107,.2);border-radius:4px;margin-top:80px;flex-wrap:wrap;}
        .ai-banner-text{font-size:13px;color:var(--text2);line-height:1.7;}
        .ai-banner-text b{color:#fff;font-weight:600;}
        .ai-banner-cta{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#060a06;background:var(--pink);padding:10px 22px;border-radius:2px;text-decoration:none;white-space:nowrap;flex-shrink:0;}

        /* ── FOOTER ── */
        .doc-footer{border-top:1px solid var(--border);padding-top:32px;margin-top:60px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
        .doc-footer-cta{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#060a06;background:var(--green);padding:8px 20px;border-radius:2px;text-decoration:none;}

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .reveal{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease;}
        .reveal.visible{opacity:1;transform:translateY(0);}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .cursor{animation:blink 1s step-end infinite;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px;}

        @media(max-width:900px){
          .doc-nav{padding:16px 24px;}.nav-links{display:none;}.hamburger{display:flex;}
          .layout{grid-template-columns:1fr;}aside{display:none;}
          main{padding:40px 24px 80px;}
          .workflow-grid{grid-template-columns:1fr;}
        }
        @media(max-width:600px){
          .doc-nav{padding:14px 16px;}
          #overview{min-height:50vh;margin-bottom:40px;}
          .hero-title{font-size:clamp(28px,9vw,44px);letter-spacing:-1px;}
          .section-header{gap:10px;margin-bottom:24px;}
          .section-title{font-size:20px;letter-spacing:-.5px;}
          .section-line{display:none;}
          main{padding:28px 14px 80px;}
          .data-table{min-width:320px;font-size:10px;}
          .data-table th,.data-table td{padding:8px 10px;}
          .gloss-row{flex-direction:column;gap:4px;}
          .gloss-term{min-width:unset;}
          .ai-banner{flex-direction:column;}
          section{margin-bottom:40px!important;}
        }
      `}</style>

      <ParticleCanvas />
      <div className="grid-bg" />

      {/* Nav */}
      <nav className="doc-nav">
        <div style={{ display:'flex', alignItems:'center' }}>
          <Link href="/docs" className="nav-logo"><span className="s">staff</span><span className="d">7</span></Link>
          <span className="nav-tag">// platform</span>
        </div>
        <ul className="nav-links">
          <li><Link href="/docs">← docs</Link></li>
          <li><Link href="/docs/ai">AI layer →</Link></li>
          <li><Link href="/login" className="nav-cta">sign in →</Link></li>
        </ul>
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="layout">
        <aside>
          <Link href="/docs" className="toc-back">← back to docs</Link>
          <div className="toc-label">// platform</div>
          <a href="#overview"      className="toc-link active">Overview</a>
          <a href="#consultants"   className="toc-link">Consultants</a>
          <a href="#projects"      className="toc-link">Projects</a>
          <a href="#timesheets"    className="toc-link">Timesheets</a>
          <a href="#leaves"        className="toc-link">Leave mgmt</a>
          <a href="#availability"  className="toc-link">Availability</a>
          <a href="#financials"    className="toc-link">Financials</a>
          <a href="#roles"         className="toc-link">Roles</a>
        </aside>

        <main>

          {/* Hero */}
          <section id="overview">
            <div className="hero-tag"><span>Platform docs</span> — professional services automation</div>
            <h1 className="hero-title">
              everything you need<br />to run a <em>consulting firm</em>
              <span className="cursor">_</span>
            </h1>
            <p className="hero-sub">
              From consultant onboarding to project delivery —{' '}
              <b>availability tracking, timesheet validation, leave management,</b>{' '}
              and financial margin monitoring. All in one place.
            </p>
          </section>

          {/* ── 01 Consultants ── */}
          <section id="consultants" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="01" title="Consultant management" color="var(--cyan)" />
            <p className="reveal" style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, marginBottom:28 }}>
              Consultants are the core entity. Each profile tracks identity, role, skills,
              availability status, and financial data visible only to admins.
            </p>
            <div className="feature-block reveal">
              <div className="feature-block-label">// consultant profile</div>
              <div className="feature-list">
                {[
                  ['◈', 'Name, role title, seniority, and skills'],
                  ['$', 'Daily rate (TJM) — visible to Admin only'],
                  ['◉', 'Linked client and current project assignment'],
                  ['◫', 'Real-time availability status (available / assigned / partial / leave)'],
                  ['%', 'Occupancy rate — sum of active assignment allocations'],
                ].map(([icon, text],i) => (
                  <div key={i} className="feature-item">
                    <span className="feature-item-icon">{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div className="status-row" style={{ marginTop:16 }}>
                {[
                  { label:'Available',  bg:'rgba(0,255,136,.1)',   color:'var(--green)',  border:'rgba(0,255,136,.3)' },
                  { label:'Assigned',   bg:'rgba(0,229,255,.1)',   color:'var(--cyan)',   border:'rgba(0,229,255,.3)' },
                  { label:'Partial',    bg:'rgba(255,209,102,.1)', color:'var(--gold)',   border:'rgba(255,209,102,.3)' },
                  { label:'On leave',   bg:'rgba(255,45,107,.1)',  color:'var(--pink)',   border:'rgba(255,45,107,.3)' },
                  { label:'Interco',    bg:'rgba(100,100,100,.1)', color:'var(--text2)',  border:'rgba(100,100,100,.3)' },
                ].map(s => (
                  <span key={s.label} className="chip"
                    style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── 02 Projects ── */}
          <section id="projects" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="02" title="Projects & clients" color="var(--cyan)" />
            <div className="workflow-grid reveal">
              <div className="workflow-card">
                <div className="workflow-title">// staffing a project</div>
                <WfStep n={1} label="Create the client" desc="Name, sector, contact — reusable across projects." />
                <WfStep n={2} label="Create the project" desc="External or internal, with start/end dates and status." />
                <WfStep n={3} label="Assign consultants" desc="Set allocation % and date range per consultant." />
                <WfStep n={4} label="Track in real time" desc="Availability grid updates immediately on assignment." last />
              </div>
              <div className="workflow-card">
                <div className="workflow-title">// project types</div>
                <WfStep n={1} label="External" desc="Billable client project. Linked to a client with financial data." />
                <WfStep n={2} label="Intercontrat" desc="Bench period between missions. Configurable per tenant." />
                <WfStep n={3} label="Formation" desc="Training and upskilling. Counts in occupancy." />
                <WfStep n={4} label="Avant-vente / Interne" desc="Pre-sales and internal work. Tenant-configurable types." last />
              </div>
            </div>
            <div className="feature-block reveal">
              <div className="feature-block-label">// project statuses</div>
              <div className="status-row">
                {[
                  { label:'Draft',     bg:'rgba(100,100,100,.1)', color:'var(--text2)', border:'var(--border)' },
                  { label:'Active',    bg:'rgba(0,229,255,.1)',   color:'var(--cyan)',  border:'rgba(0,229,255,.3)' },
                  { label:'On hold',   bg:'rgba(255,209,102,.1)', color:'var(--gold)',  border:'rgba(255,209,102,.3)' },
                  { label:'Completed', bg:'rgba(0,255,136,.1)',   color:'var(--green)', border:'rgba(0,255,136,.3)' },
                  { label:'Archived',  bg:'rgba(100,100,100,.05)',color:'var(--text2)', border:'var(--border)' },
                ].map(s => (
                  <span key={s.label} className="chip"
                    style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── 03 Timesheets ── */}
          <section id="timesheets" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="03" title="Timesheets — CRA" color="var(--cyan)" />
            <p className="reveal" style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, marginBottom:28 }}>
              Weekly time tracking. Consultants fill in their CRA (Compte-Rendu d'Activité),
              managers validate. Full/half day entries per project or internal activity.
            </p>
            <div className="workflow-grid reveal">
              <div className="workflow-card">
                <div className="workflow-title">// submission workflow</div>
                <WfStep n={1} label="Consultant fills the week" desc="Per-day entries: full day, half day, or none. Selects the project." />
                <WfStep n={2} label="Submits for validation" desc="Status moves from Draft → Submitted." />
                <WfStep n={3} label="Manager reviews" desc="Can approve or send back for correction." />
                <WfStep n={4} label="Approved" desc="Locked entry. Feeds financial reports." last />
              </div>
              <div className="workflow-card">
                <div className="workflow-title">// entry statuses</div>
                <WfStep n={1} label="Draft" desc="Saved locally. Not yet submitted. Editable by consultant." />
                <WfStep n={2} label="Submitted" desc="Sent to manager for review. Visible in pending queue." />
                <WfStep n={3} label="Approved" desc="Validated. Entry is locked and contributes to billing." last />
              </div>
            </div>
            <div className="feature-block reveal">
              <div className="feature-block-label">// entry values</div>
              <div className="feature-list">
                <div className="feature-item"><span className="feature-item-icon" style={{ color:'var(--text2)' }}>—</span><span>No entry — day not filled</span></div>
                <div className="feature-item"><span className="feature-item-icon" style={{ color:'var(--gold)' }}>½</span><span>Half day — 0.5 assigned to project or internal activity</span></div>
                <div className="feature-item"><span className="feature-item-icon" style={{ color:'var(--green)' }}>1</span><span>Full day — 1 day assigned</span></div>
              </div>
            </div>
          </section>

          {/* ── 04 Leaves ── */}
          <section id="leaves" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="04" title="Leave management" color="var(--cyan)" />
            <div className="workflow-grid reveal">
              <div className="workflow-card">
                <div className="workflow-title">// leave request workflow</div>
                <WfStep n={1} label="Consultant submits a request" desc="Selects type, start/end dates, and number of days." />
                <WfStep n={2} label="Pending badge in sidebar" desc="Managers see a red badge with count of pending requests." />
                <WfStep n={3} label="Admin or Manager reviews" desc="Checks impact on project coverage and team availability." />
                <WfStep n={4} label="Approve ✓ or Refuse ✗" desc="Status updates immediately. Availability grid reflects the change." last />
              </div>
              <div className="workflow-card">
                <div className="workflow-title">// leave types</div>
                <WfStep n={1} label="CP — Congés Payés" desc="Standard paid leave. Counted against annual balance." />
                <WfStep n={2} label="RTT" desc="Reduction du Temps de Travail. Accrued days off." />
                <WfStep n={3} label="Unpaid" desc="Leave without pay. Tracked but not deducted from CP/RTT." />
                <WfStep n={4} label="Absence autorisée" desc="Exceptional leave — medical, family events, etc." last />
              </div>
            </div>
          </section>

          {/* ── 05 Availability ── */}
          <section id="availability" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="05" title="Availability & timeline" color="var(--cyan)" />
            <p className="reveal" style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, marginBottom:28 }}>
              Two complementary views of your team's schedule — one by consultant, one by project.
            </p>
            <div className="feature-block reveal">
              <div className="feature-block-label">// /availability — consultant view</div>
              <div className="feature-list">
                {[
                  ['◫', 'Monthly Gantt grid — one row per consultant'],
                  ['◈', 'Colour-coded bars by project with visible labels'],
                  ['◷', 'Leave segments with type indicator'],
                  ['◉', 'Today column highlighted — quick scan of current status'],
                  ['%', 'Stats row — assigned / available / leave / partial counts'],
                ].map(([icon,text],i) => (
                  <div key={i} className="feature-item">
                    <span className="feature-item-icon">{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="feature-block reveal">
              <div className="feature-block-label">// /timeline — project view</div>
              <div className="feature-list">
                {[
                  ['◧', 'Monthly Gantt grid — one row per project'],
                  ['◈', 'Assigned consultants shown as stacked avatars'],
                  ['●', 'Project status colour (active / on hold / draft / completed)'],
                  ['▤', 'Project name label inline when bar is wide enough'],
                ].map(([icon,text],i) => (
                  <div key={i} className="feature-item">
                    <span className="feature-item-icon">{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 06 Financials ── */}
          <section id="financials" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="06" title="Financial tracking" color="var(--gold)" />
            <p className="reveal" style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, marginBottom:28 }}>
              Admin-only section. Tracks sold rates, actual costs, and gross margin per project.
            </p>
            <div className="feature-block reveal" style={{ borderLeft:'2px solid var(--gold)' }}>
              <div className="feature-block-label">// financial data — admin only</div>
              <div className="feature-list">
                {[
                  ['$', 'Consultant TJM (daily rate) — cost side of the margin'],
                  ['$', 'Project sold rate — what the client pays per day'],
                  ['%', 'Gross margin per project — sold vs cost in real time'],
                  ['◧', 'Days sold vs days actually logged — variance tracking'],
                  ['◉', 'Per-client revenue aggregation'],
                ].map(([icon,text],i) => (
                  <div key={i} className="feature-item">
                    <span className="feature-item-icon" style={{ color:'var(--gold)' }}>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal" style={{
              padding:'14px 18px', background:'rgba(255,209,102,.04)',
              border:'1px solid rgba(255,209,102,.2)', borderRadius:4, fontSize:11, color:'var(--text2)',
            }}>
              Financial data is gated by RLS. Managers and consultants never see TJMs or project margins,
              even if they query the API directly.
            </div>
          </section>

          {/* ── 07 Roles ── */}
          <section id="roles" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="07" title="Roles & access" color="var(--cyan)" />

            <RoleCard role="admin" who="CEO · Director · Operations" accent="cyan"
              desc="Full platform access including financial data. Configures the workspace, manages all users, and controls all settings."
              can={[
                'Create and manage consultants with daily rates (TJM)',
                'Create and manage clients, projects, and assignments',
                'Approve or refuse leave requests',
                'Access /financials — margins, sold rates, project budgets',
                'Configure internal project types and AI model settings',
              ]}
            />

            <RoleCard role="manager" who="Project manager · HR lead" accent="green"
              desc="Day-to-day operational access. Manages staffing and validates timesheets. No access to financial data."
              can={[
                'View and manage consultant profiles (without TJM)',
                'Create and edit projects and clients',
                'Manage assignments and availability',
                'Approve or refuse leave requests',
                'Validate (approve) submitted timesheets',
              ]}
              cant={[
                'Access /financials or see TJMs',
                'Configure settings or AI model',
              ]}
            />

            <RoleCard role="consultant" who="Team member" accent="gold"
              desc="Scoped to personal data. Manages their own timesheet, leave requests, and sees their project assignments."
              can={[
                'Fill in and submit their weekly CRA',
                'Request time off (CP, RTT, unpaid)',
                'View their current and upcoming assignments',
                'See the team availability grid',
              ]}
              cant={[
                'See other consultants\' profiles, rates, or timesheets',
                'Create or edit projects, clients, or assignments',
                'Access financials, settings, or AI configuration',
              ]}
            />

            {/* Data access table */}
            <div className="data-table-wrap reveal" style={{ marginTop:32 }}>
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
                    ['Consultant list',    '✓ All',  '✓ All',          '✗'],
                    ['Consultant TJM',     '✓',      '✗',              '✗'],
                    ['Project list',       '✓ All',  '✓ All',          '✓ Own only'],
                    ['Project financials', '✓',      '✗',              '✗'],
                    ['Timesheets',         '✓ All',  '✓ All',          '✓ Own only'],
                    ['Leave requests',     '✓ All',  '✓ All',          '✓ Own only'],
                    ['Availability grid',  '✓',      '✓',              '✓'],
                    ['Settings',          '✓',      '✗',              '✗'],
                  ].map(([label,admin,manager,consultant],i) => (
                    <tr key={i}>
                      <td>{label}</td>
                      <td className={admin==='✗'?'no':'yes'}>{admin}</td>
                      <td className={manager==='✗'?'no':'yes'}>{manager}</td>
                      <td className={
                        consultant==='✗'?'no':
                        consultant.includes('Own')?'partial':'yes'
                      }>{consultant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* AI CTA Banner */}
          <div className="ai-banner reveal">
            <div className="ai-banner-text">
              <b>Want to go further?</b><br />
              The AI layer adds natural language queries, local LLM support,
              MCP integration, and autonomous agents on top of everything above.
            </div>
            <Link href="/docs/ai" className="ai-banner-cta">⚡ explore AI layer →</Link>
          </div>

          {/* Footer */}
          <div className="doc-footer reveal">
            <span style={{ fontSize:10, color:'var(--text2)', letterSpacing:2 }}>
              <Staff7 /> · platform docs · beta 2026
            </span>
            <Link href="/login" className="doc-footer-cta">→ sign in</Link>
          </div>

        </main>
      </div>
    </>
  )
}