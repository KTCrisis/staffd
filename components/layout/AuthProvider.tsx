// components/layout/AuthProvider.tsx
// Rôle réduit : redirect /login si session expirée côté client.
// Plus de données user dans le contexte — elles viennent du layout server.
'use client'

import { useEffect }     from 'react'
import { useRouter }     from '@/lib/navigation'
import { supabase }      from '@/lib/supabase'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/login' as never)
    })
    return () => subscription.unsubscribe()
  }, [router])

  return <>{children}</>
}