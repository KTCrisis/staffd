// app/[locale]/(app)/cmd/page.tsx  (ou /ai/page.tsx)
// ── Server Component (wrapper minimal) ───────────────────────

import { cookies }            from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Topbar }             from '@/components/layout/Topbar'
import { AIContent }          from '@/components/ai/AIContent'
import { Suspense }           from 'react'

export default async function AIPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email ?? null

  return (
    <>
      <Topbar title="Agentic Console" breadcrumb="// staff7 intelligence" />
      <div className="app-content">
        <Suspense fallback={<div className="ai-loading">// initializing agents…</div>}>
          <AIContent userEmail={userEmail} />
        </Suspense>
      </div>
    </>
  )
}