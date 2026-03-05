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

Core modules: `consultants` · `projects` · `clients` · `timesheets` · `leaves` · `availability` · `timeline` · `financials`

**AI-ready by default.** An agentic console powered by Ollama gives you natural language access to live data — staffing, margins, timesheets, leave requests — without leaving the app. Runs locally or in the cloud; your data stays in your infrastructure.

This is a working product in active development.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 · Tailwind CSS · next-intl (EN/FR) |
| Backend / DB | Supabase (PostgreSQL + RLS + RPC) |
| Auth | Supabase Auth — roles in `app_metadata` |
| AI | Ollama (local/cloud) via SSE streaming |
| Deployment | Cloudflare Pages via OpenNext |

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

# 3. Database
# Run staffd-bootstrap.sql against your Supabase project

# 4. Run
npm run dev
```

---

## Project structure

```
app/
  [locale]/
    (app)/        # Authenticated routes
    (public)/     # /login, /docs
  api/ai/         # SSE streaming route — Ollama proxy
components/
  layout/         # Sidebar, Topbar, AuthProvider
  ui/             # Design system primitives
lib/
  auth.ts         # Role helpers (isAdmin, canEdit, canViewFinancials…)
  data.ts         # Supabase hooks and mutations
  navigation.ts   # Typed router wrapper
```

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