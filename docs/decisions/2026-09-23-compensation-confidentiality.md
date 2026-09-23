# Compensation and margins are admin/manager data

- **Problem**: any signed-in consultant could read, through the API, every colleague's salary, rates, fees and day cost (`consultants` select open to the tenant) and every margin (`consultant_profitability`, `project_financials` unfiltered by role). Nothing on screen showed it.
- **Decision**: a consultant or freelancer reads only their own `consultants` row; colleagues come from `consultant_directory` (no amount); margin views are admin/manager only.
- **Why**: RLS is row-level, so hiding columns from one role means narrowing the rows and exposing a separate, amount-free directory.
- **Where**: `supabase/migrations/0011_confidentiality.sql`, `app/[locale]/(app)/consultants/page.tsx`, RLS tests « Confidentialité ».
