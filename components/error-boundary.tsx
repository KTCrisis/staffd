/**
 * components/error-boundary.tsx
 * ErrorBoundary React — capture les erreurs de rendu dans l'arbre enfant.
 *
 * Usage (autour d'une page ou d'un module) :
 *   <ErrorBoundary>
 *     <MonComposant />
 *   </ErrorBoundary>
 *
 * Usage avec fallback custom :
 *   <ErrorBoundary fallback={<div>Oops</div>}>
 *     <MonComposant />
 *   </ErrorBoundary>
 */

'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

interface Props {
  children:  ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message:  string
}

// ──────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// ──────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En production, envoyer à un service de monitoring (ex: Sentry)
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="font-mono text-sm text-red-400">
            {this.state.message}
          </p>
          <button
            onClick={this.reset}
            className="rounded border border-red-500/30 px-4 py-1.5 font-mono text-xs text-red-400 transition hover:bg-red-500/10"
          >
            Réessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ──────────────────────────────────────────────────────────────
// WRAPPER FONCTIONNEL — pour les layouts de page entière
// ──────────────────────────────────────────────────────────────

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a]">
          <p className="font-mono text-sm text-red-400">
            Une erreur inattendue est survenue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded border border-white/10 px-4 py-1.5 font-mono text-xs text-white/60 transition hover:bg-white/5"
          >
            Recharger la page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}