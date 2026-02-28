'use client'

import { useState, FormEvent } from 'react'
import { useRouter }            from '@/lib/navigation'
import { signIn }               from '@/lib/auth'

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(email, password)
      router.push('/dashboard' as never)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grille de fond décorative */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        opacity: 0.4,
        pointerEvents: 'none',
      }} />

      {/* Glow vert centré */}
      <div style={{
        position: 'absolute',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(0,255,136,0.06) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Card login */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 400,
        margin: '0 20px',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '40px 36px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            fontSize: 28, fontWeight: 700,
            letterSpacing: -1, marginBottom: 6,
          }}>
            <span style={{ color: '#fff' }}>staff</span>
            <span style={{ color: 'var(--green)' }}>d</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: 3, textTransform: 'uppercase' }}>
            // consultant manager
          </div>
        </div>

        {/* Tag */}
        <div style={{
          fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
          color: 'var(--text2)', marginBottom: 24,
          borderLeft: '2px solid var(--green)',
          paddingLeft: 10,
        }}>
          Connexion requise
        </div>

        {/* Formulaire */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@staffd.io"
              autoComplete="email"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text)',
                fontFamily: 'var(--font)', fontSize: 13,
                outline: 'none', transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e  => e.target.style.borderColor = 'var(--green)'}
              onBlur={e   => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text)',
                fontFamily: 'var(--font)', fontSize: 13,
                outline: 'none', transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e  => e.target.style.borderColor = 'var(--green)'}
              onBlur={e   => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e as unknown as FormEvent)}
            />
          </div>

          {/* Erreur */}
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
              background: loading ? 'var(--dim)' : 'var(--green)',
              color: '#060a06',
              border: 'none', borderRadius: 4,
              fontFamily: 'var(--font)', fontSize: 12,
              fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (!email || !password) ? 0.5 : 1,
            }}
          >
            {loading ? '// connexion...' : '→ Se connecter'}
          </button>

        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 10, color: 'var(--text2)', letterSpacing: 1 }}>
          Accès sur invitation uniquement
        </div>

      </div>

      {/* Scanlines overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
        pointerEvents: 'none', zIndex: 10,
      }} />

    </div>
  )
}
