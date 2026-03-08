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
    <div className="login-root">

      {/* Décors */}
      <div className="login-grid"      aria-hidden />
      <div className="login-glow"      aria-hidden />
      <div className="login-scanlines" aria-hidden />

      {/* Card */}
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo-wrap">
          <div className="logo-glitch login-logo">
            <span className="login-logo-white">staff</span>
            <span className="login-logo-green">7</span>
          </div>
          <div className="login-tagline">// Staffing ops, AI-first</div>
        </div>

        {/* Auth required */}
        <div className="login-auth-tag">Authentication required</div>

        {/* Champs — vraie balise <form> pour password managers + autocomplétion */}
        <form className="login-fields" onSubmit={handleSubmit} noValidate>

          <div>
            <label className="login-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="login-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@company.com"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="login-pwd-header">
              <label className="login-label" htmlFor="login-password">Password</label>
              <button
                type="button"
                className="login-toggle-pwd"
                onClick={() => setShowPwd(v => !v)}
              >
                {showPwd ? '[ hide ]' : '[ show ]'}
              </button>
            </div>
            <input
              id="login-password"
              type={showPwd ? 'text' : 'password'}
              className="login-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {/* Erreur */}
          {error && (
            <div className="login-error">⚠ {error}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="login-submit"
            disabled={loading || !email || !password}
            style={{ opacity: (!email || !password) ? 0.5 : 1 }}
          >
            {loading ? (
              <span className="login-connecting">
                <span className="spinner" /> connecting...
              </span>
            ) : '→ Sign in'}
          </button>

        </form>

        {/* Footer */}
        <div className="login-footer">
          <span className="login-footer-text">Access by invitation only</span>
          <Link href="/docs" className="login-docs-link">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
    </div>
  )
}