-- ============================================================
-- 0010 — Factures justes : numérotation à l'émission, verrou, identités
-- ============================================================
-- Numérotation (obligation : suite chronologique continue, sans trou) :
--   · un brouillon n'a PAS de numéro ; le numéro est attribué à l'émission
--     par issue_invoice(), sous verrou de la ligne companies (deux émissions
--     simultanées ne peuvent pas prendre le même numéro) ;
--   · séquence annuelle : billing_settings.invoice_counter repart à 1 quand
--     l'année change (invoice_counter_year) ; « {YYYY} » dans le préfixe est
--     remplacé par l'année d'émission. Les préfixes existants qui portaient
--     une année en dur (« OFR-2026- ») passent à « OFR-{YYYY}- ».
--   · next_invoice_number() est supprimée : elle consommait un numéro à
--     chaque enregistrement, brouillons compris.
-- Émission : date = jour d'émission, échéance = date + délai, totaux
-- recalculés depuis les lignes, instantanés émetteur (billing_settings) et
-- client (fiche client) figés sur la facture.
-- Verrou : une facture émise ne change plus (montants, dates, client,
-- lignes) ; seules transitions : envoyée → payée, payée → envoyée,
-- envoyée → annulée. Un brouillon se supprime, une facture émise non.
-- Clients : adresse de facturation, SIREN, TVA intracommunautaire.
-- Écritures backend (service_role, psql) non bridées, comme 0006.
-- ============================================================

alter table clients add column if not exists billing_address text;
alter table clients add column if not exists siren           text;
alter table clients add column if not exists tva_number      text;

alter table invoices alter column invoice_number drop not null;
alter table invoices add column if not exists issued_at timestamptz;
alter table invoices drop constraint if exists invoices_number_when_issued;
alter table invoices add  constraint invoices_number_when_issued
  check (status = 'draft' or invoice_number is not null);
create unique index if not exists invoices_company_number_uniq
  on invoices(company_id, invoice_number) where invoice_number is not null;

drop function if exists next_invoice_number(uuid);

-- invoice_lines.company_id n'avait pas de ON DELETE CASCADE : une société
-- ayant des lignes de facture ne pouvait pas être supprimée.
alter table invoice_lines drop constraint if exists invoice_lines_company_id_fkey;
alter table invoice_lines add  constraint invoice_lines_company_id_fkey
  foreign key (company_id) references companies(id) on delete cascade;

-- Préfixes à année en dur → {YYYY}
update companies
   set billing_settings = jsonb_set(billing_settings, '{invoice_prefix}',
         to_jsonb(regexp_replace(billing_settings->>'invoice_prefix', '20[0-9]{2}', '{YYYY}')))
 where billing_settings->>'invoice_prefix' ~ '20[0-9]{2}';

-- ── Émission ────────────────────────────────────────────────────────────────
create or replace function issue_invoice(p_invoice_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  inv        invoices%rowtype;
  v_billing  jsonb;
  v_company  text;
  v_year     int := extract(year from current_date)::int;
  v_seq      int;
  v_prefix   text;
  v_number   text;
  v_subtotal numeric;
  v_client   jsonb;
begin
  if not (is_super_admin() or coalesce(my_role(), '') in ('admin', 'manager')) then
    raise exception 'INVOICE_FORBIDDEN' using errcode = 'P0001';
  end if;

  select * into inv from invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'INVOICE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if inv.status <> 'draft' then
    raise exception 'INVOICE_NOT_DRAFT' using errcode = 'P0001';
  end if;

  select coalesce(sum(quantity * unit_price), 0) into v_subtotal
    from invoice_lines where invoice_id = inv.id;
  if not exists (select 1 from invoice_lines where invoice_id = inv.id) then
    raise exception 'INVOICE_EMPTY' using errcode = 'P0001';
  end if;

  -- Verrou du compteur : une émission à la fois par société
  select coalesce(billing_settings, '{}'::jsonb), name into v_billing, v_company
    from companies where id = inv.company_id for update;

  v_seq := case when (v_billing->>'invoice_counter_year')::int = v_year
                then coalesce((v_billing->>'invoice_counter')::int, 0) + 1
                else 1 end;
  v_prefix := replace(coalesce(nullif(v_billing->>'invoice_prefix', ''), 'INV-{YYYY}-'), '{YYYY}', v_year::text);
  v_number := v_prefix || lpad(v_seq::text, 4, '0');

  update companies
     set billing_settings = v_billing
           || jsonb_build_object('invoice_counter', v_seq, 'invoice_counter_year', v_year)
   where id = inv.company_id;

  select jsonb_build_object('name', c.name, 'address', c.billing_address,
                            'siren', c.siren, 'tva_number', c.tva_number)
    into v_client
    from clients c where c.id = inv.client_id;

  perform set_config('staffd.invoice_issue', 'on', true);
  update invoices set
    invoice_number   = v_number,
    status           = 'sent',
    invoice_date     = current_date,
    due_date         = current_date + coalesce(inv.payment_terms, (v_billing->>'payment_terms')::int, 30),
    issued_at        = now(),
    subtotal         = round(v_subtotal, 2),
    tva_amount       = round(v_subtotal * inv.tva_rate / 100, 2),
    total_ttc        = round(v_subtotal, 2) + round(v_subtotal * inv.tva_rate / 100, 2),
    emitter_snapshot = v_billing || jsonb_build_object('company_name', v_company),
    client_snapshot  = coalesce(v_client, inv.client_snapshot)
  where id = inv.id;
  perform set_config('staffd.invoice_issue', 'off', true);

  return v_number;
end;
$$;

grant execute on function issue_invoice(uuid) to authenticated, service_role;

-- ── Verrou des factures émises ──────────────────────────────────────────────
create or replace function invoices_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_backend boolean := coalesce(auth.jwt() ->> 'role', '') not in ('authenticated', 'anon');
  v_issue   boolean := coalesce(current_setting('staffd.invoice_issue', true), '') = 'on';
begin
  if v_backend or v_issue then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'INVOICE_LOCKED' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.invoice_number is not null then
      raise exception 'INVOICE_ISSUE_REQUIRED' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- UPDATE
  if old.status = 'draft' then
    if new.status <> 'draft' or new.invoice_number is distinct from old.invoice_number then
      raise exception 'INVOICE_ISSUE_REQUIRED' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- Facture émise : seuls statut (transitions permises) et paid_at bougent
  if not ((old.status = 'sent' and new.status in ('sent', 'paid', 'cancelled'))
       or (old.status = 'paid' and new.status in ('paid', 'sent'))
       or (old.status = 'cancelled' and new.status = 'cancelled')) then
    raise exception 'INVOICE_LOCKED' using errcode = 'P0001';
  end if;
  if (to_jsonb(new) - 'status' - 'paid_at' - 'updated_at')
     is distinct from (to_jsonb(old) - 'status' - 'paid_at' - 'updated_at') then
    raise exception 'INVOICE_LOCKED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_guard on invoices;
create trigger invoices_guard
  before insert or update or delete on invoices
  for each row execute function invoices_guard();

create or replace function invoice_lines_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_backend boolean := coalesce(auth.jwt() ->> 'role', '') not in ('authenticated', 'anon');
  v_status  text;
begin
  if v_backend then
    return coalesce(new, old);
  end if;
  select status into v_status from invoices where id = coalesce(new.invoice_id, old.invoice_id);
  -- Facture introuvable = suppression en cascade d'un brouillon : laisser passer
  if v_status is not null and v_status <> 'draft' then
    raise exception 'INVOICE_LOCKED' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_lines_guard on invoice_lines;
create trigger invoice_lines_guard
  before insert or update or delete on invoice_lines
  for each row execute function invoice_lines_guard();

insert into schema_migrations (version) values ('0010_invoicing') on conflict do nothing;
