'use client'

// ══════════════════════════════════════════════════════════════
// app/[locale]/activate/page.tsx
// Activation d'un compte à partir du lien généré par un admin (/api/invite) :
//   ?token_hash=…&type=invite    premier accès, création du mot de passe
//   ?token_hash=…&type=recovery  nouveau mot de passe sur un compte existant
// Le jeton n'est vérifié qu'à la validation du formulaire : l'aperçu d'un
// lien dans une messagerie (robot sans JavaScript) ne le consomme pas.
// ══════════════════════════════════════════════════════════════

import { Suspense, useState, FormEvent } from 'react'
import { useSearchParams }     from 'next/navigation'
import { useTranslations }     from 'next-intl'
import { supabase }            from '@/lib/supabase'

const MIN_LENGTH = 10

// useSearchParams exige une frontière Suspense (sinon le build échoue)
export default function ActivatePage() {
  return <Suspense><ActivateForm /></Suspense>
}

function ActivateForm() {
  const t      = useTranslations('activate')
  const params = useSearchParams()
  const tokenHash = params.get('token_hash') ?? ''
  const type      = params.get('type') === 'recovery' ? 'recovery' : 'invite'

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && confirm !== password
  const ready    = !!tokenHash && password.length >= MIN_LENGTH && password === confirm

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setError(null); setLoading(true)
    try {
      const { error: otpErr } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      if (otpErr) throw new Error(t('errors.link'))
      const { error: pwdErr } = await supabase.auth.updateUser({ password })
      if (pwdErr) throw new Error(pwdErr.message)
      // Rechargement complet : le middleware voit la nouvelle session
      window.location.assign('/fr/dashboard')
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      <div className="login-grid"      aria-hidden />
      <div className="login-glow"      aria-hidden />
      <div className="login-scanlines" aria-hidden />

      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="logo-glitch login-logo">
            <span className="login-logo-white">staff</span>
            <span className="login-logo-green">7</span>
          </div>
          <div className="login-tagline">{t(type === 'invite' ? 'taglineInvite' : 'taglineRecovery')}</div>
        </div>

        {!tokenHash ? (
          <div className="login-error">⚠ {t('errors.missing')}</div>
        ) : (
          <form className="login-fields" onSubmit={handleSubmit} noValidate>
            <div>
              <div className="login-pwd-header">
                <label className="login-label" htmlFor="activate-password">{t('password')}</label>
                <button type="button" className="login-toggle-pwd" onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? t('hide') : t('show')}
                </button>
              </div>
              <input
                id="activate-password"
                type={showPwd ? 'text' : 'password'}
                className="login-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              {tooShort && <div className="login-error" style={{ marginTop: 6 }}>{t('errors.short', { min: MIN_LENGTH })}</div>}
            </div>

            <div>
              <label className="login-label" htmlFor="activate-confirm">{t('confirm')}</label>
              <input
                id="activate-confirm"
                type={showPwd ? 'text' : 'password'}
                className="login-input"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {mismatch && <div className="login-error" style={{ marginTop: 6 }}>{t('errors.mismatch')}</div>}
            </div>

            {error && <div className="login-error">⚠ {error}</div>}

            <button type="submit" className="login-submit" disabled={loading || !ready} style={{ opacity: ready ? 1 : 0.5 }}>
              {loading ? <span className="login-connecting"><span className="spinner" /> …</span> : t('submit')}
            </button>
          </form>
        )}

        <div className="login-footer">
          <span className="login-footer-text">{t('footer')}</span>
        </div>
      </div>
    </div>
  )
}
