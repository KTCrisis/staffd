# Audit d'architecture staffd — carte + plan de refacto

Cartographie réalisée le 2026-06-23 (4 passes : routing/pages, composants, couche
data, typage/build). Objectif : code plus propre, debuggable, hiérarchie Next claire,
sans réécriture massive. Sert de fil au refacto incrémental.

## Diagnostic en une phrase

Le **page layer est déjà majoritairement server-first** (16/24 pages fetchent côté
serveur via `getPageAuth` + supabase, puis passent en props). La dette n'est donc
**pas** une archi de pages à refondre, mais se concentre sur le **typage** et les
**guards**. Le refacto est chirurgical, pas un rewrite.

## Carte (constats factuels)

### Routing / pages
- ~24 pages. 16 fetchent côté serveur, 4 délèguent le fetch à un composant client
  (`/bids`, `/ai`, `/invoices`, `/invoices/new`), le reste ne fetch pas.
- **9 routes sans aucun guard de rôle** (seules la session + la RLS protègent) :
  `/clients`, `/clients/[id]`, `/consultants`, `/consultants/[id]`, `/leaves`,
  `/projects`, `/timesheets`, `/availability`, `/dashboard/consultant`.
- Incohérence `/profitability` : guard middleware = admin, guard page = manager+
  (le middleware bloque un manager avant que la page ne l'autorise).
- Auth dispersée : `middleware.ts` (session + `ROUTE_GUARDS` partiel) + `redirect()`
  recopié dans ~7 pages. Les layouts (`root`, `[locale]`, `(app)`) ne font **aucune**
  auth. Le layout `(app)` est le point de centralisation naturel, aujourd'hui vide.
- Pas de route group `(public)` ; le périmètre public tient à `PUBLIC_SEGMENTS`
  (liste de strings dans `roles.ts`), pas à la structure de dossiers.

### Composants
- 63 composants, **84% Client** (`'use client'`), 16% Server.
- Le moteur dominant du `'use client'` est `useTranslations` (next-intl), pas
  l'interactivité : plusieurs composants de présentation pure sont client pour cette
  seule raison (`ActivityFeed`, `FinancialsClient`, `InvoicePreview`, `LeaveSolde`,
  `SuperAdminTab`, `ui/Badge`).
- **11 composants re-fetchent côté client** via hooks `lib/data` (vraie dette
  d'accès données) ; `TimesheetsClient` en cumule 6. `useCompanySettings` revient 7×.
- God-components : `settings/TeamTab` (674 l), `invoices/InvoiceForm` (567 l),
  `timesheets/TimesheetsClient` (545 l), `settings/HRTab` (487 l).

### Couche data (`lib/`)
- Un seul client browser (`lib/supabase.ts`, anon). Clients serveur (anon /
  service_role) uniquement dans `page-auth.ts` ; service_role seulement si super_admin.
- `window.supabase` était exposé en console → **retiré en Phase 0**.
- `lib/data/*` tout en `'use client'`, 100% query builder supabase-js (pas de fetch
  brut ; les URLs PostgREST string ne vivaient que dans les actions IA, déjà traitées).
- Scoping tenant : motif `if (activeTenantId)` ×15. `activeTenantId` est un state
  React client-controlled, `null` pour un utilisateur normal → la RLS est alors la
  seule barrière. Le filtre applicatif n'est qu'un sur-filtre côté super_admin.
- 6 mappers `(row: Record<string, unknown>)` + ~107 casts `as`, `(row: any)` après
  chaque embed. lib/auth bien structuré (`roles.ts` = source de vérité des guards).

### Typage / build
- `tsc --noEmit` : **0 erreur** (le code compile).
- **Aucun type Supabase généré** — racine n°1 : client non typé → **188 erreurs
  `no-explicit-any`**, 54 `as any`, 107 `: any`.
- Types métier **dupliqués et divergents** hors `types/index.ts` : `Consultant` ×3,
  `Project` ×4, `Client` ×3, `KpiData` ×2, `ContractType`/`LeaveType`/`BillingSettings`
  ×2. Divergence réelle constatée : `countryCode` vs `country_code`.
- eslint source = 237 problèmes (188 = any). Warnings react-hooks réels :
  `set-state-in-effect` (4), `exhaustive-deps` (4), `preserve-manual-memoization` (5)
  = bugs latents. Config eslint n'ignorait pas `.open-next` (~20k faux positifs) →
  **corrigé en Phase 0**.
- `tsconfig` : `strict: true`, mais pas de flags de rigueur additionnels.
- **Aucun test** (pas de framework, pas de fichier de test).

## Plan de refacto incrémental

### Phase 0 — Hygiène (FAIT)
- eslint ignore `.open-next/**` + `.wrangler/**` (le lint redevient un signal utile).
- `window.supabase` retiré.

### Phase 1 — Fondation
- **Types Supabase générés** (`supabase gen types typescript`) + clients typés
  `<Database>`. Effet cascade : supprime ~188 `any`, ancre le snake_case sur le schéma,
  type les mappers, fait remonter les divergences à la compilation.
- **Harnais de tests** : Vitest (fonctions de calcul) + tests RLS (seed deux tenants,
  JWT par rôle) pour verrouiller l'isolation multi-tenant.

### Phase 2 — Consolidation types + correctness
- Dédupliquer les types divergents dans `types/index.ts`.
- Corriger les warnings react-hooks, puis passe correctness (calculs marge/occupation/
  TVA, transitions de statut, agrégats dashboard).

### Phase 3 — Centraliser les guards
- Map déclarative adossée à `ROUTE_GUARDS`, appliquée au layout `(app)` ou par segment,
  fermant les 9 routes RLS-only + l'incohérence profitability.

### Phase 4 — Confidentialité #4/#5
- Split mono-axe : `consultant_financials` (admin/manager) + `company_settings`
  (admin), vues en LEFT JOIN (NULL pour les non-privilégiés). Sous protection des
  tests RLS de la Phase 1. (RLS row-level, pas column-level → déplacer les colonnes.)

### Phase 5 — Hygiène composants (incrémental)
- Réduire le refetch client (passer en props depuis les pages serveur), convertir les
  composants `useTranslations`-only en Server Components, découper les god-components.

### Phase 6 — Optimisation (mesurée)
- D'abord profiler (slow query log Supabase, `EXPLAIN` sur les vues lourdes, N+1 du
  data layer), ensuite seulement : index sur les colonnes filtrées par la RLS, RSC
  pour les lectures chaudes. Probablement faible priorité au trafic actuel.

## Sécurité — déjà corrigé (audit 2026-06-23)
- #1/#2 isolation tenant des endpoints service_role (`/api/invite`, `/api/ai`).
- #6 facture freelance non auto-validable. #7 guards `/dashboard/admin|manager`.
- #8 `search_path` figé sur les fonctions SECURITY DEFINER.
- Reste ouvert : #4/#5 (Phase 4), + mineurs (rate-limit `/api/ai`, confirmation PUT
  non signée, `manager` peut inviter, system prompt + data → ollama.com).
