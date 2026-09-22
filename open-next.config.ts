import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// No ISR / revalidation in the app: prerendered pages are served from the
// Worker's static assets, so no KV namespace per environment is needed.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
})
