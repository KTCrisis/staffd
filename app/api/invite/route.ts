import { createClient } from '@supabase/supabase-js'
import { cookies }      from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// 1. Force la route en mode dynamique pour éviter le scan au build
export const dynamic = 'force-dynamic';

// 2. Déplace l'initialisation dans une fonction (Lazy Loading)
// Cela empêche l'exécution au moment de l'import pendant le build.
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing at runtime');
  }
  
  return createClient(url, key);
}

export async function POST(req: Request) {
  // Initialisation à l'intérieur de la requête
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Vérifier que le caller est bien admin
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.user_role
  
  if (!user || !['admin', 'manager'].includes(role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  
  const { consultantId, email, companyId } = await req.json()
  if (!consultantId || !email) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify companyId matches the caller's company (prevent cross-tenant invite)
  const callerCompanyId = user.app_metadata?.company_id
  if (callerCompanyId && companyId && callerCompanyId !== companyId) {
    return Response.json({ error: 'Cannot invite to a different company' }, { status: 403 })
  }

  // 2. Vérifier si un user Auth existe déjà avec cet email
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)

  let userId: string

  if (existingUser) {
    // Déjà un compte — juste mettre à jour les metadata
    userId = existingUser.id
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...existingUser.app_metadata,
        user_role: 'consultant',
        company_id: companyId,
      }
    })
  } else {
    // 3. Envoyer l'invitation email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
        user_role: 'consultant',
        company_id: companyId,
    }
    })
    if (error) {
    console.error('Invite error:', error) // ← ajouter
    return Response.json({ error: error.message }, { status: 500 })
    }
    userId = data.user.id
  }

  // 4. Lier le user_id au consultant
  const { error: updateError } = await supabaseAdmin
    .from('consultants')
    .update({ user_id: userId })
    .eq('id', consultantId)

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

  return Response.json({ ok: true, userId, alreadyExisted: !!existingUser })
}