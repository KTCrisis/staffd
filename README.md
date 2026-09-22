# staff7

> AI-native PSA for consulting firms and staffing agencies

[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](https://mariadb.com/bsl11/)
[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development-yellow.svg)]()
[![Stack: Next.js + Supabase](https://img.shields.io/badge/Stack-Next.js%20%2B%20Supabase-black.svg)]()

---

## What it's for

staff7 is built for:

- **Consulting firms and staffing agencies** managing a team of consultants across multiple clients and projects
- **IT Consulting Firms / ESNs** (Entreprises de Services du Numérique) that need timesheet tracking, leave management, and real-time profitability visibility
- **Independent freelancers** via a solo mode — same platform, simplified interface, no team overhead
- **Multi-tenant deployments** — each company gets a fully isolated workspace, making it suitable for resellers or white-label use

Core modules: `consultants` · `projects` · `clients` · `timesheets` · `leaves` · `availability` · `timeline` · `financials` · `profitability` · `invoices` · `simulator`

**AI-ready by default.** An agentic console powered by Ollama gives you natural language access to live data — staffing, margins, timesheets, leave requests — without leaving the app. Runs locally or in the cloud; your data stays in your infrastructure.

This is a working product in active development.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS · next-intl (EN/FR) |
| Backend / DB | Supabase (PostgreSQL + RLS + RPC) |
| Auth | Supabase Auth — roles in `app_metadata` |
| AI | Ollama (local/cloud) via SSE streaming |
| Deployment | Cloudflare Workers via OpenNext (`wrangler.jsonc`) |

---

## Architecture notes

**Multi-tenancy** is enforced at the database level via Supabase RLS. Every table has a `company_id` column. The `my_company_id()` helper reads from the JWT — no application-level filtering needed.

**Roles** live in `auth.users.app_metadata.user_role` — not in the user table — so they can't be self-modified. Five roles: `super_admin` · `admin` · `manager` · `consultant` · `freelance`.

**AI console** uses the authenticated user's JWT (not a service key) to query Supabase, so RLS tenant isolation applies to all agent queries automatically.

**Cloudflare note**: `@supabase/supabase-js` is incompatible with the edge runtime. The app runs in `cloudflare-node` mode — no `export const runtime = 'edge'` anywhere.

---

## Local setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/staff7
cd staff7
npm install

# 2. Environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Database — schema, then data
# Local: `npx supabase start && npx supabase db reset` applies
#   supabase/migrations/0000_baseline.sql, then supabase/seed.fixtures.sql
#   and any supabase/seed.*.local.sql (see supabase/config.toml)
# Remote: run 0000_baseline.sql in the SQL Editor, then the seed for that
#   environment. The baseline starts with a drop-all of business data
#   (auth.users is preserved).

# 4. Run
npm run dev
```

---

## Project structure

```
app/
  [locale]/
    (app)/        # Authenticated routes
    login/, docs/ # Public routes
  api/ai/         # SSE streaming route — Ollama proxy
  api/invite/     # Tenant-scoped consultant invitation (service_role)
components/
  layout/         # Sidebar, Topbar, AuthProvider
  ui/             # Design system primitives
lib/
  auth/           # Role helpers + server/page guards (isAdmin, canEdit…)
  data/           # Supabase hooks and mutations (per-domain modules)
  navigation.ts   # Typed router wrapper
supabase/
  migrations/     # 0000_baseline.sql — versioned schema (no data)
  seed.fixtures.sql        # test tenants: ESN team, agency, solo freelancer
  seed.tenant.example.sql  # template for a real tenant
  seed.*.local.sql         # real tenants — git-ignored (public repo)
```

---

## Environments

| Environment | Branch | Supabase project | Data |
|---|---|---|---|
| Staging | `main` | staging project | `seed.fixtures.sql` |
| Production | `release/*` | one project per deployment | its `seed.*.local.sql` only |

Each environment is a Worker (`wrangler.jsonc` → `env.staging`, `env.cabinet`)
connected to this repository with Workers Builds:

- build command `npx opennextjs-cloudflare build`, deploy command
  `npx opennextjs-cloudflare deploy --env <env>`, production branch per Worker;
- **build variables** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (inlined by `next build`, so they must be set at build time, per Worker);
- **secrets** `SUPABASE_SERVICE_ROLE_KEY`, `OLLAMA_API_KEY`
  (`npx wrangler secret put <NAME> --env <env>`).

A change lands on `main`, is checked on staging, then ships by fast-forwarding
the release branch. Fixtures never go to production. Put Cloudflare Access in
front of both. Local check on the Workers runtime: `npm run cf:preview`
(reads `.env.local` at build, `.dev.vars` at runtime).

---

## Roadmap

- [ ] FastAPI layer for complex business logic + MCP integration
- [ ] Automated tenant onboarding (currently manual SQL)
- [ ] Email notifications (leave approvals, assignment alerts)
- [ ] Invoice generation for freelance consultants
- [ ] Self-serve signup flow

---

## License

This project is licensed under the [Business Source License 1.1 (BUSL-1.1)](https://mariadb.com/bsl11/).

**In plain terms:**
- ✅ You can read, fork, and run it for personal or non-commercial use
- ✅ You can contribute and learn from it
- ❌ You cannot use it commercially without a separate agreement

The code will convert to Apache 2.0 on **January 1, 2028**.

To discuss commercial licensing or a partnership: `flux7art_at_gmail.com`