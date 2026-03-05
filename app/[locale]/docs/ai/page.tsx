'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Particle canvas ────────────────────────────────────────────────────────

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
    const ids = ['overview','ai-console','models','mcp','agents','roles','glossary']
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

// ── Helpers ────────────────────────────────────────────────────────────────

const Staff7 = () => (
  <span style={{ color:'#fff', fontWeight:'inherit', textTransform:'none' }}>
    staff<span style={{ color:'var(--green)' }}>7</span>
  </span>
)

function SectionHeader({ num, title, id, color }: { num: string; title: string; id?: string; color?: string }) {
  return (
    <div id={id} className="section-header reveal" style={{ scrollMarginTop: 80 }}>
      <span className="section-num" style={color ? { color } : {}}>{num} //</span>
      <h2 className="section-title">{title}</h2>
      <div className="section-line" />
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

function ModelCard({ name, type, badge, badgeColor, desc, tags, accent }: {
  name: string; type: string; badge: string; badgeColor: string
  desc: string; tags: string[]; accent: string
}) {
  return (
    <div className="model-card reveal" style={{ borderColor: `${accent}22` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{name}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 1 }}>{type}</div>
        </div>
        <span style={{
          fontSize: 8, padding: '2px 8px', borderRadius: 2,
          background: `${badgeColor}18`, color: badgeColor,
          border: `1px solid ${badgeColor}44`,
          letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700,
        }}>{badge}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 14 }}>{desc}</p>
      <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
        {tags.map((t, i) => (
          <span key={i} style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 2,
            background: `${accent}0d`, color: accent,
            border: `1px solid ${accent}33`, letterSpacing: 1,
          }}>{t}</span>
        ))}
      </div>
      <div style={{ marginTop: 14, height: 1, background: `linear-gradient(90deg, ${accent}44, transparent)` }} />
    </div>
  )
}

function AgentCard({ icon, name, status, desc, accent }: {
  icon: string; name: string; status: string; desc: string; accent: string
}) {
  return (
    <div className="agent-card reveal" style={{ borderColor: `${accent}22` }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{name}</div>
        <span style={{
          fontSize: 8, padding: '1px 6px', borderRadius: 2,
          background: `${accent}18`, color: accent,
          border: `1px solid ${accent}44`,
          letterSpacing: 2, textTransform: 'uppercase',
        }}>{status}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.7 }}>{desc}</p>
    </div>
  )
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sections = ['overview','ai-console','models','mcp','agents','roles','glossary']
  if (!open) return null
  return (
    <div className="mobile-menu-overlay" onClick={onClose}>
      <div className="mobile-menu" onClick={e => e.stopPropagation()}>
        <div className="mobile-menu-header">
          <span style={{ fontSize:9, letterSpacing:3, color:'var(--text2)', textTransform:'uppercase' }}>// contents</span>
          <button onClick={onClose} className="mobile-menu-close">✕</button>
        </div>
        {sections.map(s => (
          <a key={s} href={`#${s}`} className="mobile-menu-link" onClick={onClose}>{s.replace('-',' ')}</a>
        ))}
        <Link href="/login" className="mobile-menu-cta" onClick={onClose}>→ sign in</Link>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
  useReveal()
  useTocSpy()
  const [menuOpen, setMenuOpen] = useState(false)

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
        .hamburger{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:4px;background:none;border:none;}
        .hamburger span{display:block;width:20px;height:1.5px;background:var(--text2);}

        /* ── MOBILE MENU ── */
        .mobile-menu-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);}
        .mobile-menu{position:absolute;top:0;right:0;width:260px;height:100%;background:var(--bg2);border-left:1px solid var(--border);padding:24px;display:flex;flex-direction:column;gap:4px;}
        .mobile-menu-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
        .mobile-menu-close{background:none;border:none;color:var(--text2);font-size:14px;cursor:pointer;font-family:var(--font);}
        .mobile-menu-link{display:block;padding:10px 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--text2);text-decoration:none;border:1px solid transparent;border-radius:2px;transition:all 0.15s;}
        .mobile-menu-link:hover{color:var(--green);border-color:rgba(0,255,136,0.2);}
        .mobile-menu-cta{display:block;margin-top:16px;padding:10px 16px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#060a06;background:var(--green);border-radius:2px;text-decoration:none;text-align:center;}

        /* ── LAYOUT ── */
        .layout{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:200px 1fr;position:relative;z-index:1;padding-top:72px;}

        /* ── SIDEBAR TOC ── */
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
        .hero-tag span{color:var(--pink);border:1px solid var(--pink);padding:2px 10px;border-radius:2px;}
        .hero-title{font-size:clamp(40px,7vw,78px);font-weight:700;line-height:0.95;letter-spacing:-3px;margin-bottom:8px;opacity:0;animation:fadeUp 0.6s ease 0.4s forwards;}
        .hero-title .t1{color:#fff;}.hero-title .t2{color:transparent;-webkit-text-stroke:1px var(--green);}.hero-title .t3{color:var(--green);}
        .hero-sub{font-size:13px;color:var(--text2);margin-top:28px;line-height:1.8;max-width:520px;opacity:0;animation:fadeUp 0.6s ease 0.6s forwards;}
        .hero-sub b{color:var(--cyan);font-weight:400;}
        .hero-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:32px;opacity:0;animation:fadeUp 0.6s ease 0.8s forwards;}
        .htag{font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border:1px solid var(--border);border-radius:2px;color:var(--text2);transition:all 0.2s;display:inline-block;}
        .htag:hover{border-color:var(--green);color:var(--green);background:rgba(0,255,136,0.05);}

        /* ── INTRO BLOCK ── */
        .intro-block{background:var(--bg2);border:1px solid var(--border);border-left:2px solid var(--pink);padding:24px 28px;margin-bottom:80px;}
        .block-label{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--text2);margin-bottom:14px;}
        .intro-block p{font-size:13px;line-height:1.8;color:var(--text);}

        /* ── SECTION HEADER ── */
        .section-header{display:flex;align-items:baseline;gap:20px;margin-bottom:40px;}
        .section-num{font-size:11px;color:var(--green);letter-spacing:3px;}
        .section-title{font-size:30px;font-weight:700;color:#fff;letter-spacing:-1px;}
        .section-line{flex:1;height:1px;background:var(--border);}

        /* ── CONSOLE DEMO ── */
        .console-wrap{background:#030603;border:1px solid var(--border);border-radius:4px;overflow:hidden;margin-bottom:16px;}
        .console-bar{display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--bg2);border-bottom:1px solid var(--border);}
        .console-dot{width:8px;height:8px;border-radius:50%;}
        .console-title{font-size:9px;color:var(--text2);letter-spacing:2px;margin-left:4px;}
        .console-body{padding:20px;font-size:11px;line-height:2;}
        .c-prompt{color:var(--green);}
        .c-user{color:var(--cyan);}
        .c-ai{color:var(--text);}
        .c-data{color:var(--gold);}
        .c-dim{color:var(--text2);}
        .c-pink{color:var(--pink);}

        /* ── MODEL CARDS ── */
        .models-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;}
        .model-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:22px;transition:all 0.2s;}
        .model-card:hover{background:var(--bg3);transform:translateY(-2px);}

        /* ── MCP DIAGRAM ── */
        .mcp-flow{display:flex;align-items:center;gap:0;margin:32px 0;overflow-x:auto;padding-bottom:8px;}
        .mcp-node{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:14px 18px;text-align:center;min-width:120px;flex-shrink:0;}
        .mcp-node .mcp-icon{font-size:20px;margin-bottom:6px;}
        .mcp-node .mcp-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text2);}
        .mcp-node .mcp-name{font-size:11px;font-weight:700;color:'#fff';margin-top:2px;}
        .mcp-arrow{flex-shrink:0;color:var(--green);font-size:14px;padding:0 8px;opacity:0.6;}
        .mcp-node.highlight{border-color:rgba(255,45,107,0.4);background:rgba(255,45,107,0.04);}
        .mcp-node.highlight .mcp-label{color:var(--pink);}

        /* ── AGENT CARDS ── */
        .agents-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
        .agent-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:22px;transition:all 0.2s;}
        .agent-card:hover{background:var(--bg3);transform:translateY(-1px);}

        /* ── ROLE TABLE ── */
        .data-table-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:4px;overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .data-table{width:100%;border-collapse:collapse;font-size:11px;min-width:420px;}
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

        /* ── WORKFLOW ── */
        .workflow-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
        .workflow-card{background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:28px;}
        .workflow-title{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--text2);margin-bottom:24px;border-left:2px solid var(--pink);padding-left:10px;}
        .wf-step{display:flex;gap:16px;}
        .wf-step-left{display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
        .wf-num{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,45,107,0.4);background:rgba(255,45,107,0.05);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--pink);}
        .wf-line{width:1px;flex:1;background:var(--border);margin:4px 0;}
        .wf-content{padding-bottom:20px;}
        .wf-label{font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;}
        .wf-desc{font-size:11px;color:var(--text2);line-height:1.6;}

        /* ── FOOTER ── */
        .doc-footer{border-top:1px solid var(--border);padding-top:32px;margin-top:80px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
        .doc-footer-cta{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#060a06;background:var(--green);padding:8px 20px;border-radius:2px;text-decoration:none;transition:opacity 0.2s;}
        .doc-footer-cta:hover{opacity:0.85;}

        /* ── ANIMATIONS ── */
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .reveal{opacity:0;transform:translateY(20px);transition:opacity 0.6s ease,transform 0.6s ease;}
        .reveal.visible{opacity:1;transform:translateY(0);}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .cursor{animation:blink 1s step-end infinite;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px;}

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .doc-nav{padding:16px 24px;}
          .nav-links{display:none;}
          .hamburger{display:flex;}
          .layout{grid-template-columns:1fr;}
          aside{display:none;}
          main{padding:40px 24px 80px;}
          .workflow-grid{grid-template-columns:1fr;}
          .models-grid{grid-template-columns:1fr;}
          .agents-grid{grid-template-columns:1fr;}
        }
        @media (max-width: 600px) {
          .doc-nav{padding:14px 16px;}
          #overview{min-height:55vh;padding-top:20px;margin-bottom:40px;}
          .hero-title{font-size:clamp(28px,9vw,46px);letter-spacing:-1px;line-height:1.05;}
          .hero-sub{font-size:12px;margin-top:16px;}
          .section-header{gap:10px;margin-bottom:24px;}
          .section-title{font-size:20px;letter-spacing:-0.5px;}
          .section-line{display:none;}
          main{padding:28px 14px 80px;}
          .console-body{padding:14px;font-size:10px;}
          .mcp-flow{gap:4px;}
          .mcp-node{min-width:90px;padding:10px 12px;}
          .data-table{min-width:320px;font-size:10px;}
          .data-table th,.data-table td{padding:8px 10px;}
          .gloss-row{flex-direction:column;gap:4px;}
          .gloss-term{min-width:unset;font-size:10px;}
          .doc-footer{flex-direction:column;align-items:center;text-align:center;}
          section{margin-bottom:40px!important;}
        }
        @media (max-width: 390px) {
          main{padding:24px 12px 60px;}
          .hero-title{font-size:clamp(24px,8vw,36px);}
        }
      `}</style>

      <ParticleCanvas />
      <div className="grid-bg" />

      {/* ── Nav ── */}
      <nav className="doc-nav">
        <div style={{ display:'flex', alignItems:'center' }}>
          <Link href="/login" className="nav-logo">
            <span className="s">staff</span><span className="d">7</span>
          </Link>
          <span className="nav-tag">// docs</span>
        </div>
        <ul className="nav-links">
          {['overview','ai-console','models','mcp','agents','roles'].map(s => (
            <li key={s}><a href={`#${s}`}>{s.replace('-',' ')}</a></li>
          ))}
          <li><Link href="/login" className="nav-cta">sign in →</Link></li>
        </ul>
        <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="layout">

        {/* ── Sidebar TOC ── */}
        <aside>
          <Link href="/docs" className="toc-back">← back to docs</Link> 
          <div className="toc-label">// contents</div>
          <a href="#overview"   className="toc-link active">Overview</a>
          <a href="#ai-console" className="toc-link">AI Console</a>
          <a href="#models"     className="toc-link">Models</a>
          <a href="#mcp"        className="toc-link">MCP</a>
          <a href="#agents"     className="toc-link">Agents <span style={{ fontSize:8, color:'var(--pink)', marginLeft:4 }}>[soon]</span></a>
          <a href="#roles"      className="toc-link">Roles</a>
          <a href="#roles"      className="toc-link sub">→ Admin</a>
          <a href="#roles"      className="toc-link sub">→ Manager</a>
          <a href="#roles"      className="toc-link sub">→ Consultant</a>
          <a href="#glossary"   className="toc-link">Glossary</a>
        </aside>

        <main>

          {/* ── Hero ── */}
          <section id="overview">
            <div className="hero-tag">
              <span>AI-first · Beta 2026</span> — resource management, reimagined
            </div>
            <h1 className="hero-title">
              <span className="t1">your staffing ops,</span><br />
              <span className="t2">now</span> <span className="t3">AI-native</span>
              <span className="cursor">_</span>
            </h1>
            <p className="hero-sub">
              <Staff7 /> embeds AI directly into your staffing workflows.
              Ask questions in plain language, connect your own model —
              local or cloud — and keep <b>full control over your data.</b>
            </p>
            <div className="hero-tags">
              {['Local LLM','Cloud API','MCP Protocol','Agentic Workflows','Privacy-by-design','Multi-tenant'].map((f,i) => (
                <span key={i} className="htag">{f}</span>
              ))}
            </div>
          </section>

          {/* ── Intro ── */}
          <div className="intro-block reveal">
            <div className="block-label">// philosophy</div>
            <p>
              Most platforms lock you into their AI. <Staff7 /> does the opposite —
              bring your own model, run it locally with{' '}
              <span style={{ color:'var(--green)' }}>Ollama</span> for full data sovereignty,
              or connect any{' '}
              <span style={{ color:'var(--cyan)' }}>OpenAI-compatible cloud API</span>.
              The AI inherits your{' '}
              <span style={{ color:'var(--gold)' }}>role-based access policies</span> —
              consultants cannot query data they wouldn't see in the UI.
            </p>
          </div>

          {/* ── Section 01: AI Console ── */}
          <section id="ai-console" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="01" title="AI Console" color="var(--pink)" />

            <p className="reveal" style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, marginBottom:32 }}>
              The AI console is a live chat interface embedded in the sidebar.
              It streams responses directly from your configured model,
              with real-time access to your Supabase context — consultants, projects, assignments, leaves.
            </p>

            {/* Console demo */}
            <div className="console-wrap reveal">
              <div className="console-bar">
                <div className="console-dot" style={{ background:'#ff2d6b' }} />
                <div className="console-dot" style={{ background:'#ffd166' }} />
                <div className="console-dot" style={{ background:'#00ff88' }} />
                <span className="console-title">staff7 · agentic console</span>
              </div>
              <div className="console-body">
                <div><span className="c-prompt">⚡ </span><span className="c-user">who is available next week for a React mission?</span></div>
                <div style={{ marginTop:8 }}><span className="c-dim">// querying consultant_occupancy + assignments...</span></div>
                <div style={{ marginTop:8 }}><span className="c-ai">Based on current assignments, </span><span className="c-data">3 consultants</span><span className="c-ai"> are fully available next week:</span></div>
                <div style={{ marginTop:4, paddingLeft:16 }}>
                  <div><span className="c-data">→ Alice Martin</span><span className="c-dim"> — Lead Developer, React/TypeScript</span></div>
                  <div><span className="c-data">→ Baptiste Leroy</span><span className="c-dim"> — Frontend, available from Monday</span></div>
                  <div><span className="c-data">→ Emma Petit</span><span className="c-dim"> — Fullstack, 50% available (partial)</span></div>
                </div>
                <div style={{ marginTop:8 }}><span className="c-dim">// context: week of Mar 10 · company_id scoped · RLS enforced</span></div>
                <div style={{ marginTop:4 }}><span className="c-prompt">⚡ </span><span className="c-pink" style={{ animation:'blink 1s step-end infinite' }}>▌</span></div>
              </div>
            </div>

            <div className="reveal" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[
                { label:'SSE streaming', desc:'Responses stream token by token — no waiting for full generation.', color:'var(--green)' },
                { label:'Context injection', desc:'Live Supabase data injected at query time — always up to date.', color:'var(--cyan)' },
                { label:'Role-aware', desc:'AI sees only what your role allows. RLS policies enforced end-to-end.', color:'var(--gold)' },
                { label:'Sidebar shortcut', desc:'Quick-access command bar in the sidebar for fast queries.', color:'var(--purple)' },
              ].map((item, i) => (
                <div key={i} style={{
                  padding:'16px 18px', background:'var(--bg2)',
                  border:`1px solid var(--border)`, borderRadius:4,
                  borderLeft:`2px solid ${item.color}`,
                }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#fff', marginBottom:6 }}>{item.label}</div>
                  <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 02: Models ── */}
          <section id="models" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="02" title="Bring your own model" />

            <p className="reveal" style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, marginBottom:32 }}>
              Connect any model that fits your constraints — from a private local instance
              to a managed cloud API. Configuration is per-tenant in Settings.
            </p>

            <div className="models-grid">
              <ModelCard
                name="Ollama"
                type="Local · Self-hosted"
                badge="Privacy-first"
                badgeColor="#00ff88"
                accent="#00ff88"
                desc="Run models entirely on your infrastructure. Zero data leaves your server. Ideal for agencies with strict data governance or GDPR requirements."
                tags={['llama3','mistral','deepseek','phi3','No API key']}
              />
              <ModelCard
                name="OpenAI / Compatible"
                type="Cloud API"
                badge="Most capable"
                badgeColor="#00e5ff"
                accent="#00e5ff"
                desc="Connect GPT-4o, Claude, or any OpenAI-compatible endpoint. Bring your own API key — no markup, no vendor lock-in."
                tags={['GPT-4o','Claude','Groq','OpenRouter','BYOK']}
              />
              <ModelCard
                name="Custom endpoint"
                type="Self-hosted cloud"
                badge="Flexible"
                badgeColor="#b388ff"
                accent="#b388ff"
                desc="Point to any custom base URL — vLLM, LM Studio, Together AI, or your own FastAPI server. Full control over the inference layer."
                tags={['vLLM','LM Studio','FastAPI','Together AI']}
              />
            </div>

            {/* Config snippet */}
            <div className="console-wrap reveal">
              <div className="console-bar">
                <span className="console-title">settings · ai model configuration</span>
              </div>
              <div className="console-body">
                <div><span className="c-dim">// configured in Settings → AI → Model</span></div>
                <div style={{ marginTop:8 }}>
                  <span className="c-data">provider</span>
                  <span className="c-dim">: </span>
                  <span className="c-green" style={{ color:'var(--green)' }}>"ollama"</span>
                  <span className="c-dim"> | </span>
                  <span className="c-green" style={{ color:'var(--cyan)' }}>"openai"</span>
                  <span className="c-dim"> | </span>
                  <span className="c-green" style={{ color:'var(--purple)' }}>"custom"</span>
                </div>
                <div style={{ marginTop:4 }}><span className="c-data">base_url</span><span className="c-dim">: </span><span className="c-ai">"http://localhost:11434"</span></div>
                <div style={{ marginTop:4 }}><span className="c-data">model</span><span className="c-dim">: </span><span className="c-ai">"llama3.2"</span></div>
                <div style={{ marginTop:4 }}><span className="c-data">api_key</span><span className="c-dim">: </span><span className="c-ai">"sk-..."</span><span className="c-dim"> // optional for local</span></div>
              </div>
            </div>
          </section>

          {/* ── Section 03: MCP ── */}
          <section id="mcp" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="03" title="Model Context Protocol" color="var(--pink)" />

            <div className="intro-block reveal" style={{ borderColor:'rgba(255,45,107,0.3)', background:'rgba(255,45,107,0.03)' }}>
              <div className="block-label">// coming soon · beta</div>
              <p>
                MCP exposes <Staff7 /> data as structured <b>tools</b> that any compatible AI client can call —
                Claude Desktop, Cursor, custom agents. Your staffing data becomes
                a first-class context source for any LLM workflow.
              </p>
            </div>

            {/* Flow diagram */}
            <div className="mcp-flow reveal">
              {[
                { icon:'🤖', label:'AI client', name:'Claude / GPT', highlight: false },
                { icon:'⚡', label:'MCP server', name:'FastAPI + staff7', highlight: true },
                { icon:'🔐', label:'RLS context', name:'Supabase', highlight: false },
                { icon:'📊', label:'Your data', name:'Consultants · Projects', highlight: false },
              ].map((node, i, arr) => (
                <div key={i} style={{ display:'flex', alignItems:'center' }}>
                  <div className={`mcp-node ${node.highlight ? 'highlight' : ''}`}>
                    <div className="mcp-icon">{node.icon}</div>
                    <div className="mcp-label">{node.label}</div>
                    <div className="mcp-name" style={{ color: node.highlight ? 'var(--pink)' : '#fff' }}>{node.name}</div>
                  </div>
                  {i < arr.length - 1 && <div className="mcp-arrow">→</div>}
                </div>
              ))}
            </div>

            <div className="workflow-grid reveal">
              <div className="workflow-card">
                <div className="workflow-title">// what MCP enables</div>
                <WfStep n={1} label="Natural language queries" desc={`"Who is available in April with a TJM under 600€?" — answered directly from your live data.`} />
                <WfStep n={2} label="Cross-tool context" desc="Use staff7 data inside Claude Desktop, Cursor, or your own agents without copy-paste." />
                <WfStep n={3} label="Secure by design" desc="RLS policies apply at the MCP layer — AI cannot access data the user's role doesn't allow." last />
              </div>
              <div className="workflow-card">
                <div className="workflow-title">// exposed tools (planned)</div>
                <WfStep n={1} label="search_consultants" desc="Query by skills, availability, rate, or status." />
                <WfStep n={2} label="get_project_staffing" desc="Return current and upcoming assignments for a project." />
                <WfStep n={3} label="check_availability" desc="Return occupancy status for a consultant on a date range." last />
              </div>
            </div>
          </section>

          {/* ── Section 04: Agents ── */}
          <section id="agents" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="04" title="Agents" color="var(--purple)" />

            <p className="reveal" style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, marginBottom:32 }}>
              Beyond the console, <Staff7 /> is designed to host autonomous agents —
              specialised workers that run in the background, triggered by events or schedules.
              The MCP layer is the foundation that makes this possible.
            </p>

            <div className="agents-grid">
              <AgentCard icon="📋" name="Staffing Agent" status="planned" accent="#00e5ff"
                desc="Automatically suggests consultant assignments based on skills, availability, and project requirements. Flags conflicts before they happen." />
              <AgentCard icon="📤" name="CRA Reminder Agent" status="planned" accent="#ffd166"
                desc="Detects unfilled timesheets at end-of-week and sends nudges. Escalates to manager if submissions are missing after deadline." />
              <AgentCard icon="📈" name="Margin Alert Agent" status="planned" accent="#00ff88"
                desc="Monitors project financial margins in real time. Alerts when actual TJM deviates from sold rate by a configurable threshold." />
              <AgentCard icon="🔍" name="Availability Scanner" status="planned" accent="#b388ff"
                desc="Pre-emptively scans upcoming project end dates and flags consultants going bench. Triggers staffing pipeline for replacement." />
            </div>

            <div className="reveal" style={{
              marginTop:24, padding:'16px 20px',
              background:'rgba(179,136,255,0.04)', border:'1px solid rgba(179,136,255,0.2)',
              borderRadius:4,
            }}>
              <div style={{ fontSize:9, color:'var(--purple)', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>
                // agent architecture
              </div>
              <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.8 }}>
                Agents are built on top of the MCP layer — each agent is a tool consumer with
                a defined scope and trigger. You will be able to enable, configure, and chain agents
                from Settings → Agents. Custom agents via the API are on the roadmap.
              </p>
            </div>
          </section>

          {/* ── Section 05: Roles ── */}
          <section id="roles" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="05" title="Roles & access" />

            <div className="data-table-wrap reveal">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className="cyan">Admin</th>
                    <th className="green">Manager</th>
                    <th className="gold">Consultant</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['AI Console',            '✓',          '✓',              '✓ own context'],
                    ['Model configuration',   '✓',          '✗',              '✗'],
                    ['MCP access',            '✓',          '✓',              '✓ scoped'],
                    ['Agent management',      '✓',          '✗',              '✗'],
                    ['Consultant data',       '✓ Full',     '✓ No TJM',       '✓ Own only'],
                    ['Project financials',    '✓',          '✗',              '✗'],
                    ['Leave approval',        '✓',          '✓',              '✗'],
                    ['Settings',              '✓',          '✗',              '✗'],
                  ].map(([label, admin, manager, consultant], i) => (
                    <tr key={i}>
                      <td>{label}</td>
                      <td className={admin === '✗' ? 'no' : 'yes'}>{admin}</td>
                      <td className={manager === '✗' ? 'no' : 'yes'}>{manager}</td>
                      <td className={
                        consultant === '✗' ? 'no' :
                        consultant.includes('own') || consultant.includes('scoped') ? 'partial' : 'yes'
                      }>{consultant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 06: Glossary ── */}
          <section id="glossary" style={{ scrollMarginTop:80, marginBottom:80 }}>
            <SectionHeader num="06" title="Glossary" />
            <div className="glossary-wrap reveal">
              {[
                ['Ollama',        'Open-source tool to run LLMs locally. Supports llama3, mistral, deepseek and more.'],
                ['MCP',           'Model Context Protocol — open standard for exposing data as AI-callable tools.'],
                ['RLS',           'Row-Level Security — Supabase policy layer enforcing per-user data access.'],
                ['BYOK',          'Bring Your Own Key — connect your OpenAI/Anthropic key with no markup.'],
                ['SSE',           'Server-Sent Events — used for streaming AI responses token by token.'],
                ['Agent',         'An autonomous AI worker triggered by events, with defined tools and scope.'],
                ['Tenant',        'A company workspace — fully isolated. Each tenant configures its own AI model.'],
                ['TJM',           'Taux Journalier Moyen — daily rate billed to the client. Visible to Admin only.'],
                ['Occupancy',     'Sum of active allocations for a consultant. 100% = fully booked.'],
              ].map(([term, def], i) => (
                <div key={i} className="gloss-row">
                  <span className="gloss-term">{term}</span>
                  <span className="gloss-def">{def}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Contact ── */}
          <section className="reveal" style={{ marginTop:100, marginBottom:40 }}>
            <div style={{
              padding:'60px 40px', textAlign:'center',
              background:'linear-gradient(145deg, var(--bg2), var(--bg))',
              border:'1px solid var(--dim)', borderRadius:4,
              position:'relative', overflow:'hidden',
            }}>
              <div style={{
                position:'absolute', top:0, left:0, width:'100%', height:'2px',
                background:'linear-gradient(90deg, transparent, var(--pink), transparent)',
              }} />
              <h3 style={{ fontSize:28, color:'#fff', marginBottom:16, letterSpacing:'-1px' }}>
                Interested in <Staff7 />?
              </h3>
              <p style={{ fontSize:13, color:'var(--text2)', maxWidth:500, margin:'0 auto 32px', lineHeight:1.6 }}>
                Deploy a private instance, join the beta, or discuss
                custom AI integrations for your agency.
              </p>
              <a href="mailto:flux7art@gmail.com" className="doc-footer-cta"
                style={{ display:'inline-flex', alignItems:'center', gap:12, padding:'12px 24px', fontSize:13 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                </svg>
                flux7art@gmail.com
              </a>
            </div>
          </section>

          <div className="doc-footer reveal">
            <span style={{ fontSize:10, color:'var(--text2)', letterSpacing:2 }}>
              <Staff7 /> · built on cloudflare · ai-first · beta 2026
            </span>
            <Link href="/login" className="doc-footer-cta">→ sign in</Link>
          </div>

        </main>
      </div>
    </>
  )
}