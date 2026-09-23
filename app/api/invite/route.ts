import { createClient } from '@supabase/supabase-js'
import { cookies }      from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { serverCookies }      from '@/lib/supabase-cookies'
import { grantableRoles }     from '@/lib/auth/roles'

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
    { cookies: serverCookies(cookieStore) }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.user_role

  if (!user || !['admin', 'manager', 'super_admin'].includes(role)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }


  const { consultantId, email, companyId: bodyCompanyId, role: requestedRole } = await req.json()
  if (!consultantId || !email) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Role granted to the invitee: bounded by the caller's own role.
  const allowedRoles = grantableRoles(role)
  if (requestedRole !== undefined && !allowedRoles.includes(requestedRole)) {
    return Response.json({ error: 'Role not allowed' }, { status: 403 })
  }

  // La company cible vient du JWT de l'appelant, JAMAIS du client (cette route
  // écrit en service_role, qui contourne la RLS). Un admin/manager ne peut inviter
  // que dans sa propre company ; seul un super_admin (sans company) peut viser une
  // company explicite passée dans le body.
  const callerCompanyId = user.app_metadata?.company_id ?? null
  const isSuperAdmin    = role === 'super_admin'
  const targetCompanyId = isSuperAdmin ? (bodyCompanyId ?? null) : callerCompanyId

  if (!targetCompanyId) {
    return Response.json({ error: 'No target company' }, { status: 400 })
  }
  if (!isSuperAdmin && bodyCompanyId && bodyCompanyId !== callerCompanyId) {
    return Response.json({ error: 'Cannot invite to a different company' }, { status: 403 })
  }

  // Le consultant ciblé DOIT appartenir à la company cible. Sans cette vérif, un
  // consultantId arbitraire d'un autre tenant serait lié via service_role.
  const { data: consultant, error: consultantErr } = await supabaseAdmin
    .from('consultants')
    .select('id, company_id')
    .eq('id', consultantId)
    .single()
  if (consultantErr || !consultant) {
    return Response.json({ error: 'Consultant not found' }, { status: 404 })
  }
  if (consultant.company_id !== targetCompanyId) {
    return Response.json({ error: 'Consultant belongs to another company' }, { status: 403 })
  }

  // 2. Compte existant ou nouveau. Aucun e-mail n'est envoyé : l'API rend un
  // lien d'activation que l'admin transmet lui-même (canal privé). Le lien
  // porte un jeton à usage unique, vérifié seulement quand la personne valide
  // son mot de passe sur /activate (un aperçu de lien ne le consomme pas).
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)

  if (existingUser) {
    // Ne pas détourner un compte déjà rattaché à une AUTRE company.
    const existingCompany = existingUser.app_metadata?.company_id ?? null
    if (existingCompany && existingCompany !== targetCompanyId) {
      return Response.json({ error: 'This email already belongs to another company' }, { status: 409 })
    }
  }

  // invite : crée le compte ; recovery : compte existant, nouveau mot de passe
  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: existingUser ? 'recovery' : 'invite',
    email,
  })
  if (linkErr || !link?.user) {
    console.error('generateLink error:', linkErr)
    return Response.json({ error: linkErr?.message ?? 'Link generation failed' }, { status: 500 })
  }
  const userId = link.user.id

  // 3. Rôle et tenant dans app_metadata, seul endroit que lisent la RLS et
  // l'application (user_metadata est modifiable par l'utilisateur). Compte
  // existant : son rôle est gardé sauf demande explicite (bornée plus haut).
  const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...link.user.app_metadata,
      user_role: requestedRole ?? existingUser?.app_metadata?.user_role ?? 'consultant',
      company_id: targetCompanyId,
    }
  })
  if (metaErr) return Response.json({ error: metaErr.message }, { status: 500 })

  // 4. Lier le user_id au consultant (appartenance déjà validée ci-dessus)
  const { error: updateError } = await supabaseAdmin
    .from('consultants')
    .update({ user_id: userId })
    .eq('id', consultantId)

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

  const origin = new URL(req.url).origin
  const activationUrl = `${origin}/fr/activate?token_hash=${encodeURIComponent(link.properties.hashed_token)}`
    + `&type=${link.properties.verification_type}`

  return Response.json({ ok: true, userId, alreadyExisted: !!existingUser, activationUrl })
}