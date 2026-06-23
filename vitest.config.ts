import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Tests unitaires (fonctions pures). Les tests RLS d'intégration tournent
// séparément contre le Supabase local (voir tests/rls/).
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
})
