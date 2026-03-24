import { createClient } from '@supabase/supabase-js'

// Client-side supabase instance (lazy)
let _client = null

export function getSupabase() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return _client
}

// Named export for client components - safe for browser only
export const supabase = typeof window !== 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
  : {
      // SSR stub - never actually called during build
      auth: {
        signInWithPassword: async () => ({ error: null }),
        signUp: async () => ({ data: {}, error: null }),
        getUser: async () => ({ data: { user: null } }),
      }
    }

// Server-side service client
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
