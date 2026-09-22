/**
 * Tests RLS d'intégration — verrouillent les garanties de sécurité de l'audit
 * 2026-06-23 contre le Supabase local. Prouvent ce que l'audit n'avait que
 * constaté à la lecture : isolation tenant, guards de rôle, fix #6.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { admin, createUser, authClient, deleteUsersByEmail } from './helpers'

const COMPANY_A = '00000000-aaaa-4000-8000-000000000001'
const COMPANY_B = '00000000-bbbb-4000-8000-000000000002'
const PWD = 'rls-test-password-123!'

const EMAILS = {
  adminA:      'rls-admin-a@test.local',
  consultantA: 'rls-consultant-a@test.local',
  freelanceA:  'rls-freelance-a@test.local',
  adminB:      'rls-admin-b@test.local',
}

let clientAId = ''
let clientBId = ''
let consultantRowId = ''      // fiche consultant liée au consultant A
let freelanceConsultantId = '' // fiche consultant liée au freelance A
let invoiceId = ''

async function cleanup() {
  await admin.from('companies').delete().in('id', [COMPANY_A, COMPANY_B])
  await deleteUsersByEmail(Object.values(EMAILS))
}

beforeAll(async () => {
  await cleanup()

  // Companies (service_role, bypass RLS)
  await admin.from('companies').insert([
    { id: COMPANY_A, name: 'RLS Test A', slug: 'rls-test-a' },
    { id: COMPANY_B, name: 'RLS Test B', slug: 'rls-test-b' },
  ]).throwOnError()

  // Users avec app_metadata (= ce que lisent my_company_id()/my_role())
  const adminA      = await createUser(EMAILS.adminA, PWD,      { user_role: 'admin',      company_id: COMPANY_A })
  const consultantA = await createUser(EMAILS.consultantA, PWD, { user_role: 'consultant', company_id: COMPANY_A })
  const freelanceA  = await createUser(EMAILS.freelanceA, PWD,  { user_role: 'freelance',  company_id: COMPANY_A })
  await createUser(EMAILS.adminB, PWD, { user_role: 'admin', company_id: COMPANY_B })

  // Clients : un par tenant
  const { data: cA } = await admin.from('clients').insert({ company_id: COMPANY_A, name: 'Client A' }).select('id').single().throwOnError()
  const { data: cB } = await admin.from('clients').insert({ company_id: COMPANY_B, name: 'Client B' }).select('id').single().throwOnError()
  clientAId = cA!.id
  clientBId = cB!.id

  // Fiches consultants liées aux users (pour les policies consultant-scoped)
  const { data: rowC } = await admin.from('consultants').insert({
    company_id: COMPANY_A, user_id: consultantA.id, name: 'Consultant A', contract_type: 'employee',
  }).select('id').single().throwOnError()
  consultantRowId = rowC!.id

  const { data: rowF } = await admin.from('consultants').insert({
    company_id: COMPANY_A, user_id: freelanceA.id, name: 'Freelance A', contract_type: 'freelance',
  }).select('id').single().throwOnError()
  freelanceConsultantId = rowF!.id

  // Facture draft du freelance (pour tester le fix #6)
  const { data: inv } = await admin.from('invoices').insert({
    company_id: COMPANY_A, consultant_id: freelanceConsultantId,
    invoice_number: 'RLS-TEST-001', status: 'draft',
    subtotal: 1000, tva_rate: 20, tva_amount: 200, total_ttc: 1200,
  }).select('id').single().throwOnError()
  invoiceId = inv!.id
})

afterAll(cleanup)

describe('Isolation tenant', () => {
  it('un admin du tenant A ne voit que les clients du tenant A', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { data, error } = await a.from('clients').select('id, company_id')
    expect(error).toBeNull()
    const ids = (data ?? []).map(r => r.id)
    expect(ids).toContain(clientAId)
    expect(ids).not.toContain(clientBId)
  })

  it('un admin du tenant A ne peut pas lire un client du tenant B par id', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { data } = await a.from('clients').select('id').eq('id', clientBId)
    expect(data ?? []).toHaveLength(0)
  })

  it("un admin du tenant A ne peut pas modifier un client du tenant B (cross-tenant write)", async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    await a.from('clients').update({ name: 'HACKED' }).eq('id', clientBId)
    const { data } = await admin.from('clients').select('name').eq('id', clientBId).single()
    expect(data!.name).toBe('Client B') // inchangé
  })
})

describe('Guards de rôle', () => {
  it('un consultant ne peut pas modifier une fiche consultant', async () => {
    const c = await authClient(EMAILS.consultantA, PWD)
    await c.from('consultants').update({ role: 'HACKED' }).eq('id', freelanceConsultantId)
    const { data } = await admin.from('consultants').select('role').eq('id', freelanceConsultantId).single()
    expect(data!.role).not.toBe('HACKED')
  })
})

describe('Fix #6 — un freelance ne peut pas auto-valider sa facture', () => {
  it('passage draft -> paid refusé (la facture reste draft)', async () => {
    const f = await authClient(EMAILS.freelanceA, PWD)
    await f.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)
    const { data } = await admin.from('invoices').select('status').eq('id', invoiceId).single()
    expect(data!.status).toBe('draft')
  })

  it('le freelance peut toujours modifier sa facture draft (sans changer le statut)', async () => {
    const f = await authClient(EMAILS.freelanceA, PWD)
    const { error } = await f.from('invoices').update({ notes: 'note du freelance' }).eq('id', invoiceId).select()
    expect(error).toBeNull()
    const { data } = await admin.from('invoices').select('notes, status').eq('id', invoiceId).single()
    expect(data!.notes).toBe('note du freelance')
    expect(data!.status).toBe('draft')
  })
})

describe('CRM — affaires réservées admin/manager', () => {
  it("un consultant ne lit aucune affaire, un admin lit celles de son tenant", async () => {
    const { data: opp } = await admin.from('opportunities').insert({
      company_id: COMPANY_A, client_id: clientAId, name: 'RLS opp', stage: 'qualification',
    }).select('id').single().throwOnError()

    const c = await authClient(EMAILS.consultantA, PWD)
    const asConsultant = await c.from('opportunities').select('id')
    expect(asConsultant.error).toBeNull()
    expect(asConsultant.data ?? []).toHaveLength(0)

    const a = await authClient(EMAILS.adminA, PWD)
    const asAdmin = await a.from('opportunities').select('id')
    expect((asAdmin.data ?? []).map(r => r.id)).toContain(opp!.id)

    const b = await authClient(EMAILS.adminB, PWD)
    const otherTenant = await b.from('opportunities').select('id')
    expect((otherTenant.data ?? []).map(r => r.id)).not.toContain(opp!.id)
  })

  it('une affaire perdue sans motif est refusée par la base', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { error } = await a.from('opportunities').insert({
      company_id: COMPANY_A, client_id: clientAId, name: 'lost no reason', stage: 'qualification', status: 'lost',
    })
    expect(error).not.toBeNull()
  })
})

describe('CRM — contacts lisibles, échanges réservés', () => {
  it('un consultant lit les contacts mais ne peut ni en créer ni lire les échanges', async () => {
    const { data: ct } = await admin.from('contacts').insert({
      company_id: COMPANY_A, client_id: clientAId, name: 'RLS contact',
    }).select('id').single().throwOnError()
    await admin.from('interactions').insert({
      company_id: COMPANY_A, client_id: clientAId, type: 'note', summary: 'RLS note',
    }).throwOnError()

    const c = await authClient(EMAILS.consultantA, PWD)
    const contacts = await c.from('contacts').select('id')
    expect((contacts.data ?? []).map(r => r.id)).toContain(ct!.id)

    const insert = await c.from('contacts').insert({ company_id: COMPANY_A, client_id: clientAId, name: 'intrus' })
    expect(insert.error).not.toBeNull()

    const journal = await c.from('interactions').select('id')
    expect(journal.data ?? []).toHaveLength(0)
  })

  it("un échange sans client ni affaire est refusé par la base", async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { error } = await a.from('interactions').insert({ company_id: COMPANY_A, type: 'note', summary: 'orphelin' })
    expect(error).not.toBeNull()
  })
})

describe('CRM — affaire gagnée → projet', () => {
  it('crée et lie le projet une seule fois ; refusé à un consultant', async () => {
    const { data: opp } = await admin.from('opportunities').insert({
      company_id: COMPANY_A, client_id: clientAId, name: 'Mission gagnée', stage: 'negociation',
      deal_type: 'regie', tjm_vendu: 1100, jours_estimes: 210, amount: 231000,
    }).select('id').single().throwOnError()

    const c = await authClient(EMAILS.consultantA, PWD)
    const denied = await c.rpc('win_opportunity', { p_opportunity_id: opp!.id })
    expect(denied.error).not.toBeNull()

    const a = await authClient(EMAILS.adminA, PWD)
    const first = await a.rpc('win_opportunity', { p_opportunity_id: opp!.id })
    expect(first.error).toBeNull()
    const again = await a.rpc('win_opportunity', { p_opportunity_id: opp!.id })
    expect(again.data).toBe(first.data)

    const { data: proj } = await admin.from('projects')
      .select('id, client_id, tjm_vendu, jours_vendus, opportunity_id, client_name, status')
      .eq('opportunity_id', opp!.id)
    expect(proj).toHaveLength(1)
    expect(proj![0]).toMatchObject({ client_id: clientAId, tjm_vendu: 1100, jours_vendus: 210, client_name: 'Client A', status: 'active' })

    const { data: won } = await admin.from('opportunities').select('status, probability, project_id').eq('id', opp!.id).single()
    expect(won).toMatchObject({ status: 'won', probability: 100, project_id: first.data })
  })
})

