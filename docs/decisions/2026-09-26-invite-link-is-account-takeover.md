# An activation link for an existing account is a takeover: bound it by rank

- **Problem**: `/api/invite` returned a password-reset link for any existing account of the tenant, or with no tenant, to the admin or manager who asked. A manager could take the super_admin account (no company) or an admin's; `listUsers()` without pagination and a case-sensitive match let accounts slip past the checks.
- **Decision**: `canIssueLinkFor` (lib/auth/roles.ts): an existing account must be in the caller's tenant (or pending, with neither tenant nor role), never super_admin, and strictly below the caller. Email lookup is case-insensitive over every page of users.
- **Why**: the link goes back to the caller, not to the account owner, so issuing it is taking the account. An admin who loses a password is reset by the super_admin, not by a peer.
- **Where**: `app/api/invite/route.ts`, `lib/auth/roles.ts` (+ tests). Replayed end to end on a local Supabase: before, 200 with a link for the super_admin and an admin; after, 403 for both, 200 for a consultant and a new account.
