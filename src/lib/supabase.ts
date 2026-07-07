import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser Supabase client (anon key).
 *
 * Auth sessions persist in localStorage and refresh automatically, so a signed-in
 * user stays signed in across reloads and browsers. The anon key is public by
 * design — every write to the Pro flag is blocked by Row Level Security (see
 * supabase/schema.sql); only the server-side webhook (service_role) can flip it.
 *
 * Returns null when the env vars are unset — e.g. the Tauri desktop build, which
 * has no web backend and unlocks every tool locally instead.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null
