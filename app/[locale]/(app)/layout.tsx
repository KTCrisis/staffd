import AppShell  from '@/components/layout/AppShell'
export const runtime = 'edge'
import { ReactNode } from 'react'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
