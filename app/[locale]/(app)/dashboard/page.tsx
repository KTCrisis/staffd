// app/[locale]/(app)/dashboard/page.tsx

import { redirect }    from 'next/navigation'
import { getPageAuth } from '@/lib/auth/page-auth'

export default async function DashboardPage() {
  const { role } = await getPageAuth()

  if (role === 'consultant' || role === 'freelance')                     redirect('/dashboard/consultant')
  if (role === 'manager')                          redirect('/dashboard/manager')
  if (role === 'admin' || role === 'super_admin')  redirect('/dashboard/admin')

  redirect('/login')
}