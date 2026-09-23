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
  noRoleA:     'rls-norole-a@test.local',
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

describe('Modèle de mission', () => {
  it('une affaire au forfait gagnée donne un projet au forfait, au montant de l\'affaire', async () => {
    const { data: opp } = await admin.from('opportunities').insert({
      company_id: COMPANY_A, client_id: clientAId, name: 'Audit au forfait', stage: 'negociation',
      deal_type: 'forfait', amount: 45000,
    }).select('id').single().throwOnError()

    const a = await authClient(EMAILS.adminA, PWD)
    const { data: projectId, error } = await a.rpc('win_opportunity', { p_opportunity_id: opp!.id })
    expect(error).toBeNull()

    const { data: proj } = await admin.from('projects').select('billing_mode, budget_total').eq('id', projectId!).single()
    expect(proj).toMatchObject({ billing_mode: 'forfait', budget_total: 45000 })
  })

  it('la base refuse un mode de facturation inconnu', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { error } = await a.from('projects').insert({
      company_id: COMPANY_A, client_id: clientAId, name: 'x', client_name: 'Client A', billing_mode: 'abonnement',
    })
    expect(error).not.toBeNull()
  })
})


describe('Grille par grade', () => {
  it('un admin gère la grille de son tenant ; un consultant ne la lit pas ; B ne la voit pas', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { data: g, error } = await a.from('grades').insert({
      company_id: COMPANY_A, label: 'Senior', tjm_cible: 1100, occupation_cible: 70, cout_annuel_charge: 135000,
    }).select('id').single()
    expect(error).toBeNull()

    const c = await authClient(EMAILS.consultantA, PWD)
    const { data: seen } = await c.from('grades').select('id')
    expect(seen ?? []).toHaveLength(0)
    const { error: cErr } = await c.from('grades').insert({ company_id: COMPANY_A, label: 'Junior' })
    expect(cErr).not.toBeNull()

    const b = await authClient(EMAILS.adminB, PWD)
    const { data: seenB } = await b.from('grades').select('id').eq('id', g!.id)
    expect(seenB ?? []).toHaveLength(0)
  })

  it("le coût du grade alimente la vue quand la fiche n'a pas de salaire ; un grade d'un autre tenant est refusé", async () => {
    const { data: g } = await admin.from('grades').select('id').eq('company_id', COMPANY_A).eq('label', 'Senior').single().throwOnError()
    await admin.from('consultants').update({ grade_id: g!.id, jours_travailles: 218 }).eq('id', consultantRowId).throwOnError()

    const a = await authClient(EMAILS.adminA, PWD)
    const { data: row } = await a.from('consultant_occupancy').select('tjm_cout_reel, grade_label').eq('id', consultantRowId).single()
    expect(Number(row!.tjm_cout_reel)).toBeCloseTo(135000 / 218, 2)
    expect(row!.grade_label).toBe('Senior')

    const { data: gB } = await admin.from('grades').insert({ company_id: COMPANY_B, label: 'Senior' }).select('id').single().throwOnError()
    const { error } = await admin.from('consultants').update({ grade_id: gB!.id }).eq('id', consultantRowId)
    expect(error).not.toBeNull()
  })
})

describe('CRA fiables', () => {
  let projAId = ''
  let projBId = ''
  const code = (e: { message?: string } | null) => e?.message ?? ''

  beforeAll(async () => {
    const { data: pa } = await admin.from('projects').insert({ company_id: COMPANY_A, name: 'CRA projet 1', client_name: 'Client A', status: 'active' }).select('id').single().throwOnError()
    const { data: pb } = await admin.from('projects').insert({ company_id: COMPANY_A, name: 'CRA projet 2', is_internal: true, status: 'active' }).select('id').single().throwOnError()
    projAId = pa!.id; projBId = pb!.id
  })

  it('plafonne la journée à 1 jour, tous projets confondus', async () => {
    const c = await authClient(EMAILS.consultantA, PWD)
    const base = { company_id: COMPANY_A, consultant_id: consultantRowId, date: '2026-10-05' }
    expect((await c.from('timesheets').insert({ ...base, project_id: projAId, value: 0.5 })).error).toBeNull()
    expect((await c.from('timesheets').insert({ ...base, project_id: projBId, value: 0.5 })).error).toBeNull()
    const over = await c.from('timesheets').update({ value: 1 }).eq('project_id', projBId).eq('date', base.date)
    expect(code(over.error)).toContain('CRA_DAY_CAP')
  })

  it('refuse un CRA sur un jour de congé approuvé', async () => {
    await admin.from('leave_requests').insert({
      company_id: COMPANY_A, consultant_id: consultantRowId, type: 'CP',
      start_date: '2026-10-12', end_date: '2026-10-13', days: 2, status: 'approved',
    }).throwOnError()
    const c = await authClient(EMAILS.consultantA, PWD)
    const r = await c.from('timesheets').insert({ company_id: COMPANY_A, consultant_id: consultantRowId, project_id: projAId, date: '2026-10-12', value: 1 })
    expect(code(r.error)).toContain('CRA_ON_LEAVE')
  })

  it('un consultant soumet mais ne valide pas son CRA, ni à la création ni en modification', async () => {
    const c = await authClient(EMAILS.consultantA, PWD)
    const ins = await c.from('timesheets').insert({ company_id: COMPANY_A, consultant_id: consultantRowId, project_id: projAId, date: '2026-10-06', value: 1, status: 'approved' })
    expect(code(ins.error)).toContain('CRA_STATUS_FORBIDDEN')

    await c.from('timesheets').insert({ company_id: COMPANY_A, consultant_id: consultantRowId, project_id: projAId, date: '2026-10-06', value: 1 }).throwOnError()
    const self = await c.from('timesheets').update({ status: 'approved' }).eq('date', '2026-10-06').eq('consultant_id', consultantRowId)
    expect(code(self.error)).toContain('CRA_STATUS_FORBIDDEN')
    const sub = await c.from('timesheets').update({ status: 'submitted' }).eq('date', '2026-10-06').eq('consultant_id', consultantRowId)
    expect(sub.error).toBeNull()
  })

  it('une ligne validée est verrouillée, même pour un admin ; la réouverture la libère', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    await a.from('timesheets').update({ status: 'approved' }).eq('date', '2026-10-06').eq('consultant_id', consultantRowId).throwOnError()

    const edit = await a.from('timesheets').update({ value: 0.5 }).eq('date', '2026-10-06').eq('consultant_id', consultantRowId)
    expect(code(edit.error)).toContain('CRA_LOCKED')
    const del = await a.from('timesheets').delete().eq('date', '2026-10-06').eq('consultant_id', consultantRowId)
    expect(code(del.error)).toContain('CRA_LOCKED')

    const c = await authClient(EMAILS.consultantA, PWD)
    const denied = await c.rpc('reopen_timesheets', { p_consultant_id: consultantRowId, p_start: '2026-10-01', p_end: '2026-10-31' })
    expect(code(denied.error)).toContain('CRA_FORBIDDEN')

    const ok = await a.rpc('reopen_timesheets', { p_consultant_id: consultantRowId, p_start: '2026-10-01', p_end: '2026-10-31' })
    expect(ok.error).toBeNull()
    expect(ok.data).toBe(1)
    expect((await a.from('timesheets').update({ value: 0.5 }).eq('date', '2026-10-06').eq('consultant_id', consultantRowId)).error).toBeNull()
  })

  it('un compte sans rôle ne valide ni ne rouvre (is_super_admin() jamais NULL)', async () => {
    const u = await createUser(EMAILS.noRoleA, PWD, { company_id: COMPANY_A })
    const { data: row } = await admin.from('consultants').insert({
      company_id: COMPANY_A, user_id: u.id, name: 'Sans rôle A', contract_type: 'employee',
    }).select('id').single().throwOnError()
    const n = await authClient(EMAILS.noRoleA, PWD)
    const ins = await n.from('timesheets').insert({ company_id: COMPANY_A, consultant_id: row!.id, project_id: projAId, date: '2026-10-07', value: 1, status: 'approved' })
    expect(code(ins.error)).toContain('CRA_STATUS_FORBIDDEN')
    const r = await n.rpc('reopen_timesheets', { p_consultant_id: row!.id, p_start: '2026-10-01', p_end: '2026-10-31' })
    expect(code(r.error)).toContain('CRA_FORBIDDEN')
  })

  it('la réouverture est refusée si une facture issue des CRA couvre la période', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    await a.from('timesheets').update({ status: 'approved' }).eq('date', '2026-10-06').eq('consultant_id', consultantRowId).throwOnError()
    await admin.from('invoices').insert({
      company_id: COMPANY_A, project_id: projAId, invoice_number: 'RLS-CRA-001', status: 'sent',
      source_type: 'timesheet', source_period_start: '2026-10-01', source_period_end: '2026-10-31',
      subtotal: 1000, tva_rate: 20, tva_amount: 200, total_ttc: 1200,
    }).throwOnError()
    const r = await a.rpc('reopen_timesheets', { p_consultant_id: consultantRowId, p_start: '2026-10-01', p_end: '2026-10-31' })
    expect(code(r.error)).toContain('CRA_INVOICED')
  })
})

describe('EBITDA courant', () => {
  // Scénario chiffré à la main, février 2026 (1er = dimanche ; 20 jours ouvrés).
  //   E salarié 60 k × 1,5 = 90 k/an → 7 500/mois, entré le 01/01
  //   F freelance 600/j ; H honoraires 10 000/mois, entré le 15/01
  //   Régie 1 000/j : E 3 j + F 2 j validés, F 1 j soumis ; forfait 20 000 / 20 j : E 5 j validés
  //   Charges : 2 000/mois depuis janvier + 500 ponctuels en février
  beforeAll(async () => {
    const ins = async (row: Record<string, unknown>) =>
      (await admin.from('consultants').insert({ company_id: COMPANY_A, ...row }).select('id').single().throwOnError()).data!.id as string
    const e = await ins({ name: 'EBITDA E', contract_type: 'employee', salaire_annuel_brut: 60000, charges_pct: 50, date_entree: '2026-01-01' })
    const f = await ins({ name: 'EBITDA F', contract_type: 'freelance', tjm_facture: 600, date_entree: '2026-01-01' })
    await ins({ name: 'EBITDA H', contract_type: 'freelance', is_founder: true, honoraires_mensuels: 10000, date_entree: '2026-01-15' })
    const proj = async (row: Record<string, unknown>) =>
      (await admin.from('projects').insert({ company_id: COMPANY_A, client_name: 'Client A', status: 'active', ...row }).select('id').single().throwOnError()).data!.id as string
    const regie   = await proj({ name: 'EBITDA régie', billing_mode: 'regie', tjm_vendu: 1000 })
    const forfait = await proj({ name: 'EBITDA forfait', billing_mode: 'forfait', budget_total: 20000, jours_vendus: 20 })
    const ts = (consultant_id: string, project_id: string, date: string, status = 'approved') =>
      ({ company_id: COMPANY_A, consultant_id, project_id, date, value: 1, status })
    await admin.from('timesheets').insert([
      ts(e, regie, '2026-02-02'), ts(e, regie, '2026-02-03'), ts(e, regie, '2026-02-04'),
      ts(f, regie, '2026-02-05'), ts(f, regie, '2026-02-06'), ts(f, regie, '2026-02-09', 'submitted'),
      ...['16', '17', '18', '19', '20'].map(d => ts(e, forfait, `2026-02-${d}`)),
    ]).throwOnError()
    await admin.from('operating_expenses').insert([
      { company_id: COMPANY_A, category: 'locaux', label: 'Bureau', amount: 2000, recurrence: 'monthly', start_month: '2026-01-01' },
      { company_id: COMPANY_A, category: 'rc_compta', label: 'Bilan', amount: 500, recurrence: 'once', start_month: '2026-02-01' },
    ]).throwOnError()
  })

  it('mois clos : CA régie + forfait à l\'avancement, coûts complets', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { data, error } = await a.rpc('ebitda_monthly', { p_company_id: COMPANY_A, p_from: '2026-01-01', p_to: '2026-02-28', p_today: '2026-09-23' })
    expect(error).toBeNull()
    const [jan, feb] = data!.map((r: Record<string, number>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, k === 'month' ? v : Number(v)])))
    expect(feb).toMatchObject({
      ca_regie: 5000, ca_forfait: 5000, ca_total: 10000, ca_en_attente: 1000,
      cout_salaries: 7500, cout_freelances: 1200, cout_honoraires: 10000, charges_exploitation: 2500,
      ebitda: -11200,
    })
    // Janvier : H présent du 15 au 31 (17/31)
    expect(jan.cout_honoraires).toBeCloseTo(10000 * 17 / 31, 2)
    expect(jan.ebitda).toBeCloseTo(-(7500 + 10000 * 17 / 31 + 2000), 2)
  })

  it('mois en cours : coûts fixes au prorata des jours ouvrés, CA à date', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { data } = await a.rpc('ebitda_monthly', { p_company_id: COMPANY_A, p_from: '2026-02-01', p_to: '2026-02-28', p_today: '2026-02-11' })
    const feb = data![0] as Record<string, number>
    expect(Number(feb.prorata)).toBeCloseTo(8 / 20, 4)
    expect(Number(feb.ca_total)).toBe(5000)            // forfait (16-20/02) pas encore réalisé
    expect(Number(feb.cout_salaries)).toBeCloseTo(3000, 2)
    expect(Number(feb.charges_exploitation)).toBeCloseTo(2000 * 0.4 + 500, 2)
  })

  it('réservé à l\'admin du tenant', async () => {
    const c = await authClient(EMAILS.consultantA, PWD)
    const r1 = await c.rpc('ebitda_monthly', { p_company_id: COMPANY_A, p_from: '2026-01-01', p_to: '2026-02-28' })
    expect(r1.error?.message).toContain('EBITDA_FORBIDDEN')
    const b = await authClient(EMAILS.adminB, PWD)
    const r2 = await b.rpc('ebitda_monthly', { p_company_id: COMPANY_A, p_from: '2026-01-01', p_to: '2026-02-28' })
    expect(r2.error?.message).toContain('EBITDA_FORBIDDEN')
    const { data: exp } = await c.from('operating_expenses').select('id')
    expect(exp ?? []).toHaveLength(0)
  })
})

describe('Fonction dans l\'entreprise', () => {
  it('la base refuse une fonction inconnue ; la vue expose la fonction', async () => {
    const bad = await admin.from('consultants').insert({ company_id: COMPANY_A, name: 'X', contract_type: 'employee', fonction: 'stagiaire' })
    expect(bad.error).not.toBeNull()
    await admin.from('consultants').update({ fonction: 'dirigeant' }).eq('id', freelanceConsultantId).throwOnError()
    const a = await authClient(EMAILS.adminA, PWD)
    const { data } = await a.from('consultant_occupancy').select('fonction').eq('id', freelanceConsultantId).single()
    expect(data!.fonction).toBe('dirigeant')
    const { data: prof } = await a.from('consultant_profitability').select('consultant_id').eq('fonction', 'consultant')
    expect((prof ?? []).map(r => r.consultant_id)).not.toContain(freelanceConsultantId)
  })
})

describe('Factures justes', () => {
  let clientBillId = ''
  const code = (e: { message?: string } | null) => e?.message ?? ''

  beforeAll(async () => {
    await admin.from('companies').update({ billing_settings: { invoice_prefix: 'RLS-{YYYY}-', payment_terms: 45 } }).eq('id', COMPANY_A).throwOnError()
    const { data } = await admin.from('clients').update({ billing_address: '1 rue du Test, Paris', siren: '123456789', tva_number: 'FR00123456789' })
      .eq('id', clientAId).select('id').single().throwOnError()
    clientBillId = data!.id
  })

  const draft = async (a: Awaited<ReturnType<typeof authClient>>, amount = 1000) => {
    const { data: inv, error } = await a.from('invoices').insert({ company_id: COMPANY_A, client_id: clientBillId, status: 'draft', tva_rate: 20, payment_terms: 30 })
      .select('id').single()
    expect(error).toBeNull()
    await a.from('invoice_lines').insert({ invoice_id: inv!.id, company_id: COMPANY_A, description: 'Prestation', quantity: 2, unit: 'day', unit_price: amount / 2 }).throwOnError()
    return inv!.id as string
  }

  it('un brouillon n\'a pas de numéro ; l\'émission numérote en suite continue et fige tout', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const year = new Date().getFullYear()
    const d1 = await draft(a); const d2 = await draft(a, 500)
    const n1 = await a.rpc('issue_invoice', { p_invoice_id: d1 })
    const n2 = await a.rpc('issue_invoice', { p_invoice_id: d2 })
    expect(n1.error).toBeNull()
    expect(n1.data).toBe(`RLS-${year}-0001`)
    expect(n2.data).toBe(`RLS-${year}-0002`)
    const { data: inv } = await a.from('invoices').select('status, subtotal, tva_amount, total_ttc, invoice_date, due_date, client_snapshot').eq('id', d1).single()
    expect(inv).toMatchObject({ status: 'sent', subtotal: 1000, tva_amount: 200, total_ttc: 1200 })
    expect((inv!.client_snapshot as Record<string, string>).siren).toBe('123456789')
    expect(new Date(inv!.due_date!).getTime() - new Date(inv!.invoice_date).getTime()).toBe(30 * 86400000)
  })

  it('une facture émise est verrouillée : montants, lignes, suppression ; transitions de statut seules', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const id = await draft(a)
    await a.rpc('issue_invoice', { p_invoice_id: id }).throwOnError()
    expect(code((await a.from('invoices').update({ subtotal: 1 }).eq('id', id)).error)).toContain('INVOICE_LOCKED')
    expect(code((await a.from('invoice_lines').update({ unit_price: 1 }).eq('invoice_id', id)).error)).toContain('INVOICE_LOCKED')
    expect(code((await a.from('invoices').delete().eq('id', id)).error)).toContain('INVOICE_LOCKED')
    expect(code((await a.rpc('issue_invoice', { p_invoice_id: id })).error)).toContain('INVOICE_NOT_DRAFT')
    expect((await a.from('invoices').update({ status: 'paid', paid_at: '2026-10-01' }).eq('id', id)).error).toBeNull()
  })

  it('on ne crée ni ne passe une facture en « envoyée » sans émission ; un brouillon se supprime', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const direct = await a.from('invoices').insert({ company_id: COMPANY_A, status: 'sent', invoice_number: 'X-1', tva_rate: 20 })
    expect(code(direct.error)).toContain('INVOICE_ISSUE_REQUIRED')
    const id = await draft(a)
    expect(code((await a.from('invoices').update({ status: 'sent' }).eq('id', id)).error)).toContain('INVOICE_ISSUE_REQUIRED')
    expect((await a.from('invoices').delete().eq('id', id)).error).toBeNull()
  })

  it('émission réservée admin/manager, et refusée sans ligne', async () => {
    const a = await authClient(EMAILS.adminA, PWD)
    const { data: empty } = await a.from('invoices').insert({ company_id: COMPANY_A, status: 'draft', tva_rate: 20 }).select('id').single()
    expect(code((await a.rpc('issue_invoice', { p_invoice_id: empty!.id })).error)).toContain('INVOICE_EMPTY')
    const c = await authClient(EMAILS.consultantA, PWD)
    expect(code((await c.rpc('issue_invoice', { p_invoice_id: empty!.id })).error)).toContain('INVOICE_FORBIDDEN')
  })
})

describe('Confidentialité des rémunérations et des marges', () => {
  beforeAll(async () => {
    await admin.from('consultants').update({ salaire_annuel_brut: 70000, honoraires_mensuels: null }).eq('id', consultantRowId).throwOnError()
    await admin.from('consultants').insert({ company_id: COMPANY_A, name: 'Collègue payé', contract_type: 'employee', salaire_annuel_brut: 99000 }).throwOnError()
  })

  it('un consultant ne lit que SA fiche, salaire compris', async () => {
    const c = await authClient(EMAILS.consultantA, PWD)
    const { data } = await c.from('consultants').select('id, salaire_annuel_brut')
    expect((data ?? []).map(r => r.id)).toEqual([consultantRowId])
    const { data: occ } = await c.from('consultant_occupancy').select('id, tjm_cout_reel')
    expect((occ ?? []).map(r => r.id)).toEqual([consultantRowId])
  })

  it('un consultant ne lit aucune marge', async () => {
    const c = await authClient(EMAILS.consultantA, PWD)
    expect((await c.from('consultant_profitability').select('consultant_id')).data ?? []).toHaveLength(0)
    expect((await c.from('project_financials').select('id')).data ?? []).toHaveLength(0)
  })

  it("l'annuaire montre les collègues sans montant ; B ne voit pas A ; l'admin garde tout", async () => {
    const c = await authClient(EMAILS.consultantA, PWD)
    const { data: dir } = await c.from('consultant_directory').select('*')
    expect((dir ?? []).some(r => r.name === 'Collègue payé')).toBe(true)
    expect(Object.keys(dir![0])).not.toContain('salaire_annuel_brut')
    const b = await authClient(EMAILS.adminB, PWD)
    const { data: dirB } = await b.from('consultant_directory').select('name')
    expect((dirB ?? []).some(r => r.name === 'Collègue payé')).toBe(false)
    const a = await authClient(EMAILS.adminA, PWD)
    const { data: all } = await a.from('consultants').select('name, salaire_annuel_brut').eq('name', 'Collègue payé')
    expect(Number(all![0].salaire_annuel_brut)).toBe(99000)
  })
})
