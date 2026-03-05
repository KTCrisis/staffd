'use client'

import { useEffect }  from 'react'
import { useAuth }    from '@/lib/auth'
import { useRouter }  from '@/lib/navigation'

export default function DashboardPage() {
  const { user } = useAuth()
  const router   = useRouter()

  useEffect(() => {
    if (!user?.role) return
    if (user.role === 'consultant')                                router.replace('/dashboard/consultant' as never)
    else if (user.role === 'manager')                              router.replace('/dashboard/manager'    as never)
    else if (user.role === 'admin' || user.role === 'super_admin') router.replace('/dashboard/admin'      as never)
  }, [user?.role])

  // Skeleton pendant le redirect
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text2)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
        // loading…
      </div>
    </div>
  )
}