// app/[locale]/(app)/cmd/page.tsx  (ou /ai/page.tsx)

import { getPageAuth } from '@/lib/auth/page-auth'
import { Topbar }      from '@/components/layout/Topbar'
import { AIContent }   from '@/components/ai/AIContent'
import { Suspense }    from 'react'

export default async function AIPage() {
  const { user, isSA, companyName } = await getPageAuth()
  const userEmail = user?.email ?? null

  return (
    <>
      <Topbar title="Agentic Console" breadcrumb="// staff7 intelligence" isSuperAdmin={isSA} companyName={companyName} />
      <div className="app-content">
        <Suspense fallback={<div className="ai-loading">// initializing agents…</div>}>
          <AIContent userEmail={userEmail} />
        </Suspense>
      </div>
    </>
  )
}