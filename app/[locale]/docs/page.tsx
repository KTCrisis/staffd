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

const Staff7 = () => (
  <span style={{ color:'#fff', fontWeight:'inherit' }}>
    staff<span style={{ color:'var(--green)' }}>7</span>
  </span>
)

export default function DocsIndexPage() {
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

        .doc-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 40px;background:linear-gradient(to bottom,rgba(6,10,6,0.97),transparent);backdrop-filter:blur(2px);}
        .nav-logo{font-size:18px;font-weight:700;letter-spacing:-0.5px;text-decoration:none;}
        .nav-logo .s{color:#fff;}.nav-logo .d{color:var(--green);}
        .nav-tag{font-size:9px;color:var(--text2);letter-spacing:3px;text-transform:uppercase;margin-left:16px;}
        .nav-links{display:flex;gap:28px;list-style:none;align-items:center;}
        .nav-links a{color:var(--text2);text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;transition:color 0.2s;}
        .nav-links a:hover{color:var(--green);}
        .nav-cta{background:var(--green)!important;color:#060a06!important;padding:6px 16px!important;border-radius:2px;font-weight:700!important;}

        .wrap{max-width:1000px;margin:0 auto;padding:0 40px;position:relative;z-index:1;}

        .hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding-top:80px;}
        .hero-eyebrow{font-size:10px;letter-spacing:4px;color:var(--text2);text-transform:uppercase;margin-bottom:28px;opacity:0;animation:fadeUp .6s ease .2s forwards;}
        .hero-eyebrow span{color:var(--green);border:1px solid rgba(0,255,136,.3);padding:2px 10px;border-radius:2px;margin-right:10px;}
        .hero-title{font-size:clamp(48px,8vw,88px);font-weight:700;line-height:.92;letter-spacing:-4px;margin-bottom:32px;opacity:0;animation:fadeUp .6s ease .4s forwards;}
        .hero-title em{font-style:normal;color:transparent;-webkit-text-stroke:1px var(--green);}
        .hero-title strong{color:var(--green);}
        .hero-desc{font-size:14px;color:var(--text2);line-height:1.9;max-width:560px;margin-bottom:48px;opacity:0;animation:fadeUp .6s ease .6s forwards;}
        .hero-desc b{color:var(--cyan);font-weight:400;}

        .pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:48px;opacity:0;animation:fadeUp .6s ease .7s forwards;}
        .pillar{padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:11px;}
        .pillar-icon{font-size:16px;margin-bottom:8px;}
        .pillar-label{font-weight:700;margin-bottom:4px;color:white;}
        .pillar-desc{color:var(--text2);font-size:10px;line-height:1.5;}

        /* ── BETA BANNER ── */
        .beta-banner{margin-bottom:48px;padding:28px 32px;background:rgba(0,255,136,0.04);border:1px solid rgba(0,255,136,0.2);border-radius:4px;opacity:0;animation:fadeUp .6s ease .8s forwards;}
        .beta-header{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
        .beta-pill{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--green);padding:2px 10px;border:1px solid rgba(0,255,136,.3);border-radius:2px;}
        .beta-subtitle{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text2);}
        .beta-desc{font-size:13px;color:var(--text);line-height:1.8;margin-bottom:20px;}
        .beta-targets{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:24px;}
        .beta-target{display:flex;gap:12px;align-items:flex-start;}
        .beta-target-icon{font-size:20px;flex-shrink:0;}
        .beta-target-label{font-size:11px;font-weight:700;color:#fff;margin-bottom:3px;}
        .beta-target-desc{font-size:10px;color:var(--text2);line-height:1.6;}
        .beta-actions{display:flex;gap:12px;flex-wrap:wrap;}
        .beta-cta-primary{display:inline-block;padding:10px 24px;border-radius:2px;background:var(--green);color:#060a06;font-size:11px;font-weight:700;letter-spacing:2px;text-decoration:none;text-transform:uppercase;}
        .beta-cta-secondary{display:inline-block;padding:10px 24px;border-radius:2px;background:none;border:1px solid rgba(0,255,136,.3);color:var(--green);font-size:11px;font-weight:700;letter-spacing:2px;text-decoration:none;text-transform:uppercase;}

        .portal{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:80px;opacity:0;animation:fadeUp .6s ease .9s forwards;}
        .portal-card{display:flex;flex-direction:column;padding:36px;border-radius:4px;text-decoration:none;transition:all .25s;position:relative;overflow:hidden;}
        .portal-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;transition:opacity .25s;}
        .portal-card:hover{transform:translateY(-3px);}
        .portal-card.platform{background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.2);}
        .portal-card.platform::before{background:var(--cyan);}
        .portal-card.platform:hover{background:rgba(0,229,255,.07);border-color:rgba(0,229,255,.4);}
        .portal-card.ai{background:rgba(255,45,107,.04);border:1px solid rgba(255,45,107,.2);}
        .portal-card.ai::before{background:var(--pink);}
        .portal-card.ai:hover{background:rgba(255,45,107,.07);border-color:rgba(255,45,107,.4);}
        .portal-label{font-size:9px;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;}
        .portal-card.platform .portal-label{color:var(--cyan);}
        .portal-card.ai .portal-label{color:var(--pink);}
        .portal-icon{font-size:32px;margin-bottom:16px;}
        .portal-title{font-size:22px;font-weight:700;color:#fff;letter-spacing:-1px;margin-bottom:12px;}
        .portal-desc{font-size:12px;color:var(--text2);line-height:1.8;flex:1;}
        .portal-topics{display:flex;flex-wrap:wrap;gap:6px;margin-top:20px;}
        .portal-tag{font-size:9px;padding:2px 8px;border-radius:2px;letter-spacing:1px;}
        .portal-card.platform .portal-tag{background:rgba(0,229,255,.08);color:var(--cyan);border:1px solid rgba(0,229,255,.25);}
        .portal-card.ai .portal-tag{background:rgba(255,45,107,.08);color:var(--pink);border:1px solid rgba(255,45,107,.25);}
        .portal-arrow{margin-top:24px;font-size:11px;font-weight:700;letter-spacing:2px;}
        .portal-card.platform .portal-arrow{color:var(--cyan);}
        .portal-card.ai .portal-arrow{color:var(--pink);}

        .diff-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:80px;}
        .diff-item{padding:20px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;}
        .diff-num{font-size:9px;color:var(--text2);letter-spacing:3px;margin-bottom:10px;}
        .diff-title{font-size:13px;font-weight:700;color:#fff;margin-bottom:6px;}
        .diff-desc{font-size:11px;color:var(--text2);line-height:1.7;}

        .doc-footer{border-top:1px solid var(--border);padding:32px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
        .doc-footer-cta{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#060a06;background:var(--green);padding:8px 20px;border-radius:2px;text-decoration:none;}

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .cursor{animation:blink 1s step-end infinite;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px;}

        @media(max-width:800px){
          .doc-nav{padding:16px 20px;}
          .nav-links{display:none;}
          .wrap{padding:0 20px;}
          .portal{grid-template-columns:1fr;}
          .pillars{grid-template-columns:1fr 1fr;}
          .diff-grid{grid-template-columns:1fr;}
          .hero-title{letter-spacing:-2px;}
          .beta-targets{grid-template-columns:1fr;}
        }
        @media(max-width:500px){
          .hero-title{font-size:clamp(32px,10vw,52px);letter-spacing:-1.5px;}
          .portal-card{padding:24px;}
          .pillars{grid-template-columns:1fr;}
        }
      `}</style>

      <ParticleCanvas />
      <div className="grid-bg" />

      {/* Nav */}
      <nav className="doc-nav">
        <div style={{ display:'flex', alignItems:'center' }}>
          <Link href="/login" className="nav-logo"><span className="s">staff</span><span className="d">7</span></Link>
          <span className="nav-tag">// docs</span>
        </div>
        <ul className="nav-links">
          <li><Link href="/docs/platform">Platform</Link></li>
          <li><Link href="/docs/ai">AI layer</Link></li>
          <li><Link href="/login" style={{ fontSize:10, letterSpacing:2, color:'var(--text2)', padding:'8px 16px', border:'1px solid var(--border)', borderRadius:2, textDecoration:'none', textTransform:'uppercase' }}>
              sign in →
            </Link></li>
        </ul>
      </nav>

      <div className="wrap">
        <section className="hero">

          {/* Eyebrow */}
          <div className="hero-eyebrow">
            <span>Open Beta 2026</span> PSA · Professional Services Automation
          </div>

          {/* Title */}
          <h1 className="hero-title">
            the PSA built for<br />
            <em>creative &</em><br />
            <strong>service firms<span className="cursor">_</span></strong>
          </h1>

          {/* Desc */}
          <p className="hero-desc">
            <Staff7 /> is a <b>PSA platform</b> for <b>marketing agencies, creative studios,
            consulting firms, and digital service companies</b> — with an AI layer that
            understands your team and works the way you do.
          </p>

          {/* Pillars */}
          <div className="pillars">
            {[
              { icon:'◈', label:'Staffing ops',      desc:'Consultant availability, assignments, and occupancy in real time.' },
              { icon:'⏱', label:'Timesheet & CRA',   desc:'Weekly time tracking with submit/approve workflow and project allocation.' },
              { icon:'◷', label:'Leave management',  desc:'Paid leave, flex days, unpaid — request, approve, and track balances automatically.' },
              { icon:'◧', label:'Project tracking',  desc:'Client CRM, missions, financial margins. External and internal.' },
              { icon:'⚡', label:'AI console',        desc:'Ask your data in plain language. Local or cloud LLM, your choice.' },
              { icon:'🔐', label:'Privacy-by-design', desc:'Multi-tenant, RLS-enforced. Your data never leaves without your consent.' },
            ].map((p,i) => (
              <div key={i} className="pillar">
                <div className="pillar-icon">{p.icon}</div>
                <div className="pillar-label">{p.label}</div>
                <div className="pillar-desc">{p.desc}</div>
              </div>
            ))}
          </div>

          {/* ── Beta banner ── */}
          <div className="beta-banner">
            <div className="beta-header">
              <span className="beta-pill">Open Beta</span>
              <span className="beta-subtitle">· looking for early adopters & contributors</span>
            </div>
            <p className="beta-desc">
              We're building <Staff7 /> in the open and looking for{' '}
              <strong>agencies willing to test it on real projects</strong> — and{' '}
              <strong>developers who want to contribute</strong> to the platform or AI layer.
            </p>
            <div className="beta-targets">
              {[
                { icon:'🎨', label:'Creative & branding agencies',
                  desc:'Brand studios, packaging, advertising, logo — managing freelancers and client briefs.' },
                { icon:'📣', label:'Marketing agencies',
                  desc:'Performance, content, social — any team tracking consultants across campaigns and clients.' },
                { icon:'💻', label:'Digital & consulting firms',
                  desc:'Dev agencies, strategy consultancies, IT consulting with project-based billing.' },
                { icon:'⚡', label:'Developers & contributors',
                  desc:'Interested in AI agents, MCP integration, or the Next.js / Supabase stack.' },
              ].map(item => (
                <div key={item.label} className="beta-target">
                  <span className="beta-target-icon">{item.icon}</span>
                  <div>
                    <div className="beta-target-label">{item.label}</div>
                    <div className="beta-target-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="beta-actions">
              <a href="mailto:flux7art@gmail.com" className="beta-cta-primary">→ join the beta</a>
            </div>
          </div>

          {/* Portal cards */}
          <div className="portal">
            <Link href="/docs/platform" className="portal-card platform">
              <div className="portal-label">// platform docs</div>
              <div className="portal-icon">◧</div>
              <div className="portal-title">Platform</div>
              <p className="portal-desc">
                Everything the platform does out of the box — staffing, timesheets,
                leave management, project tracking, and financial margins.
              </p>
              <div className="portal-topics">
                {['Consultant mgmt','Project staffing','Timesheets','Leave workflows','Roles & access','Multi-tenant'].map(t => (
                  <span key={t} className="portal-tag">{t}</span>
                ))}
              </div>
              <div className="portal-arrow">→ explore platform</div>
            </Link>

            <Link href="/docs/ai" className="portal-card ai">
              <div className="portal-label">// ai layer docs</div>
              <div className="portal-icon">⚡</div>
              <div className="portal-title">AI layer</div>
              <p className="portal-desc">
                The intelligence layer — bring your own model, natural language queries,
                MCP integration, and autonomous agents. Local or cloud, privacy-first.
              </p>
              <div className="portal-topics">
                {['Local LLM','Cloud API','AI Console','MCP Protocol','Agents','Privacy-by-design'].map(t => (
                  <span key={t} className="portal-tag">{t}</span>
                ))}
              </div>
              <div className="portal-arrow">→ explore AI layer</div>
            </Link>
          </div>

          {/* Differentiators */}
          <div className="diff-grid">
            {[
              { num:'01', title:'PSA for every agency type',
                desc:'Marketing, creative, consulting, digital services — the same ops problems, one platform. Not just for IT firms.' },
              { num:'02', title:'Privacy-first AI',
                desc:'Run a local Ollama model — your staffing and financial data never leaves your infrastructure.' },
              { num:'03', title:'Real-time profitability',
                desc:'Daily rates, margins, sold vs actual days — financial data at project and consultant level, gated by role.' },
              { num:'04', title:'Multi-tenant from day one',
                desc:'Bench management, pre-sales, training — modelled natively. One platform for your whole firm.' },
            ].map(d => (
              <div key={d.num} className="diff-item">
                <div className="diff-num">// {d.num}</div>
                <div className="diff-title">{d.title}</div>
                <div className="diff-desc">{d.desc}</div>
              </div>
            ))}
          </div>

        </section>

        {/* Footer */}
        <div className="doc-footer">
          <span style={{ fontSize:10, color:'var(--text2)', letterSpacing:2 }}>
            <Staff7 /> · cloudflare · supabase · ollama · open beta 2026
          </span>
          <div style={{ display:'flex', gap:10 }}>
            <Link href="/login" style={{ fontSize:10, letterSpacing:2, color:'var(--text2)', padding:'8px 16px', border:'1px solid var(--border)', borderRadius:2, textDecoration:'none', textTransform:'uppercase' }}>
              sign in →
            </Link>
            <a href="mailto:flux7art@gmail.com" className="doc-footer-cta">join beta →</a>
          </div>
        </div>

      </div>
    </>
  )
}