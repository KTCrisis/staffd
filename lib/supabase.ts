import { createClient } from '@supabase/supabase-js'

let _client: ReturnType<typeof createClient> | null = null

export function createSupabaseClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
    )
  }
  return _client
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return (createSupabaseClient() as any)[prop]
  }
})