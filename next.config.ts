import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { execSync } from 'node:child_process'
import pkg from './package.json'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Version affichée en bas du menu : commit déployé et date du build.
// Workers Builds fournit WORKERS_CI_COMMIT_SHA ; sinon on lit le dépôt local.
function shortCommit(): string {
  const ci = process.env.WORKERS_CI_COMMIT_SHA
  if (ci) return ci.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_COMMIT:  shortCommit(),
    NEXT_PUBLIC_BUILD_DATE:  new Date().toISOString().slice(0, 10),
  },
}
export default withNextIntl(nextConfig)
