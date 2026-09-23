# Deployment is a git push

- **Problem**: a workstation `opennextjs-cloudflare build` reads `.env.local` (staging), so a manual cabinet deploy pointed the cabinet at the staging database until the next build replaced it.
- **Decision**: deploy by pushing `main` (staffd-staging) or `release/cabinet` (staffd-cabinet); Cloudflare Workers Builds builds with each Worker's build variables. No workstation deploys.
- **Why**: one pipeline, the right `NEXT_PUBLIC_*` per Worker; the manual path duplicated it and was the only way to ship a wrong bundle.
- **Where**: `wrangler.jsonc` header; `scripts/cf-deploy.sh` (exception only: builds with the target env file, refuses a bundle carrying the other database).
