# One session check per request on the page side

- **Problem**: each page verified the session three times (middleware, AppShell, getPageAuth) and read `companies` twice; `/dashboard` did all of it again after redirecting; dashboards called date.nager.at on every render, with no timeout.
- **Decision**: `getRequestAuth` (React `cache`) reads user and company once per request for AppShell and getPageAuth; the middleware redirects `/dashboard` by role; dashboard queries run in one `Promise.all`; holidays go through `lib/holidays.ts` (1.5 s timeout, one-day cache, empty list on failure).
- **Why**: each `getUser()` is a network round trip from the Worker; a slow third party must not block a page.
- **Where**: `lib/auth/request-auth.ts`, `lib/auth/page-auth.ts`, `components/layout/AppShell.tsx`, `middleware.ts`, `lib/holidays.ts`, dashboards admin and manager.
