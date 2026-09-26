# Leave status and balances are owned by the database

- **Problem**: `leave_requests_insert` let a consultant POST their own leave with `status: 'approved'`. Balances were bumped by the app after approval (two non-atomic calls): AI approvals never counted, a refusal or deletion after approval never gave days back, `leave_auto_approve` was read nowhere.
- **Decision**: migration 0012. `leave_requests_guard` (BEFORE INSERT) forces `pending` outside admin/manager/backend, or `approved` when the tenant has `leave_auto_approve` and the CP/RTT balance covers it. `leave_requests_balance` (AFTER) moves the balance on every transition into or out of `approved`. `increment_*_taken` dropped; plus indexes on every unindexed foreign key.
- **Why**: a status rule enforced in the UI is a convention; any path (UI, AI agent in service_role, SQL) must hit the same rule. Dropping the RPCs makes the rollout order safe: migration first, old app's calls fail silently, no double count.
- **Where**: `supabase/migrations/0012_leave_guard.sql` (mirrored in the baseline), `lib/data/leaves.ts`, `tests/rls/isolation.test.ts` (5 tests, red without the trigger).
