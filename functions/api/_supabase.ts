/**
 * Server-side Supabase helpers for the Pages Functions.
 *
 * We talk to Supabase over its REST/Auth HTTP API (no SDK) to keep the Worker
 * bundle tiny. Two capabilities:
 *   • verify a caller's access token → their { id, email }  (anon key)
 *   • flip a profile's Pro flag                              (service_role key)
 *
 * Env (set with `wrangler pages secret put …` or in the dashboard):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

export interface AuthedUser {
  id: string
  email: string
}

/** Verify a Supabase access token and return the user it belongs to. */
export async function getUserFromToken(env: any, token: string): Promise<AuthedUser | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !token) return null
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) return null
  const user: any = await res.json().catch(() => null)
  if (!user?.id || !user?.email) return null
  return { id: user.id, email: String(user.email).toLowerCase() }
}

/** Is this account already Pro? (service_role bypasses RLS.) */
export async function isProByEmail(env: any, email: string): Promise<boolean> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return false
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=is_pro`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  )
  if (!res.ok) return false
  const rows: any[] = await res.json().catch(() => [])
  return !!rows?.[0]?.is_pro
}

/** Flip a profile's Pro flag on (idempotent). Returns true when a row was updated. */
export async function grantProByEmail(env: any, email: string): Promise<boolean> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return false
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ is_pro: true, pro_since: new Date().toISOString() }),
    },
  )
  if (!res.ok) return false
  const rows: any[] = await res.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0
}
