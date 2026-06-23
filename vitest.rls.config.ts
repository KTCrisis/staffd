import { defineConfig } from 'vitest/config'

// Tests RLS d'intégration : nécessitent le Supabase local (`npx supabase start`).
// Séparés des tests unitaires (npm test) pour ne pas exiger de DB en CI rapide.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
})
