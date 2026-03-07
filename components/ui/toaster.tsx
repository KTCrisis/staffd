/**
 * components/ui/toaster.tsx
 * Provider Sonner — à placer une seule fois dans app/layout.tsx.
 *
 * Usage dans layout.tsx :
 *   import { Toaster } from '@/components/ui/toaster'
 *   <Toaster />
 */

'use client'

import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'var(--font-jetbrains-mono, monospace)',
          fontSize:   '13px',
          background: '#0f0f0f',
          border:     '1px solid #1f1f1f',
          color:      '#e5e5e5',
        },
      }}
    />
  )
}