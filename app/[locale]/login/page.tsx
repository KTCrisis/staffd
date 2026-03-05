'use client'

import { useState, FormEvent } from 'react'
import { useRouter }            from '@/lib/navigation'
import { signIn }               from '@/lib/auth'
import Link                     from 'next/link'

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      router.push('/dashboard' as never)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060a06',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font)',
      position: 'relative',
      overflow: 'hidden',
      colorScheme: 'dark',
    }}>

      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(#1e2a1e 1px, transparent 1px),
          linear-gradient(90deg, #1e2a1e 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        opacity: 0.4,
        pointerEvents: 'none',
      }} />

      {/* Green glow */}
      <div style={{
        position: 'absolute',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(0,255,136,0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 400,
        margin: '0 20px',
        background: '#0d120d',
        border: '1px solid #1e2a1e',
        borderRadius: 6,
        padding: '40px 36px',
      }}>

        {/* Logo with glitch */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="logo-glitch" style={{
            fontSize: 28, fontWeight: 700,
            letterSpacing: -1, marginBottom: 6,
            display: 'inline-block', position: 'relative',
          }}>
            <span style={{ color: '#fff' }}>staff</span>
            <span style={{ color: 'var(--green)' }}>7</span>
          </div>
          <div style={{
            fontSize: 10, color: '#6b7f6b',
            letterSpacing: 3, textTransform: 'uppercase',
          }}>
            // Staffing ops, AI-first
          </div>
        </div>

        {/* Auth required tag */}
        <div style={{
          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
          color: '#6b7f6b', marginBottom: 24,
          borderLeft: '2px solid var(--green)',
          paddingLeft: 10,
        }}>
          Authentication required
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Email */}
          <div>
            <label style={{
              fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
              color: '#6b7f6b', display: 'block', marginBottom: 6,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@company.com"
              autoComplete="email"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#060a06', border: '1px solid #1e2a1e',
                borderRadius: 4, color: '#e8f5e8',
                fontFamily: 'var(--font)', fontSize: 13,
                outline: 'none', transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e  => e.target.style.borderColor = 'var(--green)'}
              onBlur={e   => e.target.style.borderColor = '#1e2a1e'}
            />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{
                fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#6b7f6b',
              }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 9, color: '#6b7f6b', letterSpacing: 1,
                  padding: 0, fontFamily: 'var(--font)',
                  textTransform: 'uppercase',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7f6b')}
              >
                {showPwd ? '[ hide ]' : '[ show ]'}
              </button>
            </div>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#060a06', border: '1px solid #1e2a1e',
                borderRadius: 4, color: '#e8f5e8',
                fontFamily: 'var(--font)', fontSize: 13,
                outline: 'none', transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e  => e.target.style.borderColor = 'var(--green)'}
              onBlur={e   => e.target.style.borderColor = '#1e2a1e'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e as unknown as FormEvent)}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(255,45,107,0.08)',
              border: '1px solid rgba(255,45,107,0.3)',
              borderRadius: 4, fontSize: 11,
              color: 'var(--pink)',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            style={{
              marginTop: 8,
              padding: '12px',
              background: loading ? '#1e2a1e' : 'var(--green)',
              color: '#060a06',
              border: 'none', borderRadius: 4,
              fontFamily: 'var(--font)', fontSize: 12,
              fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase',
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (!email || !password) ? 0.5 : 1,
              position: 'relative', overflow: 'hidden',
            }}
          >
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="spinner" /> connecting...
                </span>
              : '→ Sign in'
            }
          </button>

        </div>

        {/* Footer */}
        <div style={{
          marginTop: 32, paddingTop: 24,
          borderTop: '1px solid #1e2a1e',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#6b7f6b', letterSpacing: 1 }}>
            Access by invitation only
          </div>
          <Link href="/docs" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: '#6b7f6b', letterSpacing: 1,
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7f6b')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            docs →
          </Link>
        </div>

      </div>

      {/* Scanlines */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
        pointerEvents: 'none', zIndex: 10,
      }} />

      <style>{`
        /* ── Glitch logo ── */
        .logo-glitch {
          animation: glitch-idle 6s infinite;
        }
        .logo-glitch::before,
        .logo-glitch::after {
          content: 'staff7';
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          opacity: 0;
        }
        .logo-glitch::before {
          color: var(--pink);
          animation: glitch-before 6s infinite;
          clip-path: polygon(0 30%, 100% 30%, 100% 50%, 0 50%);
        }
        .logo-glitch::after {
          color: var(--cyan);
          animation: glitch-after 6s infinite;
          clip-path: polygon(0 60%, 100% 60%, 100% 75%, 0 75%);
        }
        @keyframes glitch-idle {
          0%, 90%, 100% { transform: none; }
          91%  { transform: skewX(-1deg); }
          92%  { transform: skewX(1deg); }
          93%  { transform: none; }
          95%  { transform: skewX(-0.5deg); }
          96%  { transform: none; }
        }
        @keyframes glitch-before {
          0%, 90%, 100% { opacity: 0; transform: none; }
          91% { opacity: 0.7; transform: translate(-2px, 0); }
          92% { opacity: 0; }
          95% { opacity: 0.5; transform: translate(2px, 0); }
          96% { opacity: 0; }
        }
        @keyframes glitch-after {
          0%, 90%, 100% { opacity: 0; transform: none; }
          91% { opacity: 0.7; transform: translate(2px, 0); }
          93% { opacity: 0; }
          95% { opacity: 0.4; transform: translate(-2px, 0); }
          96% { opacity: 0; }
        }

        /* ── Spinner ── */
        .spinner {
          display: inline-block;
          width: 10px; height: 10px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #060a06;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  )
}