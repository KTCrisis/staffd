import AppShell  from '@/components/layout/AppShell'
import { ReactNode } from 'react'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
