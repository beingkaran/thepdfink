import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * User accounts + Pro entitlement, backed by Supabase.
 *
 * Auth (email/password) is handled directly by Supabase Auth from the browser.
 * The Pro flag lives in the `profiles` table as `is_pro` and is READ-ONLY to the
 * client (RLS) — it is flipped server-side by the Lemon Squeezy webhook after a
 * paid order, or manually by an admin in the Supabase Table Editor. This module
 * never grants Pro locally.
 *
 * The public interface is unchanged from the previous KV-backed implementation
 * ({ email, pro }, signup/login/logout/fetchUser/startProCheckout/useUser), so the
 * rest of the app did not need to change.
 */

export interface AccountUser {
  email: string
  pro: boolean
}

const CHANGE_EVENT = 'thepdf-user-change'

let cachedUser: AccountUser | null = null
let fetched = false
let initialized = false

function setUser(user: AccountUser | null): void {
  cachedUser = user
  fetched = true
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Read a user's Pro flag from their profile row (defaults to free). */
async function readProfile(id: string, email: string): Promise<AccountUser> {
  if (!supabase) return { email, pro: false }
  const { data } = await supabase.from('profiles').select('is_pro').eq('id', id).maybeSingle()
  return { email, pro: !!data?.is_pro }
}

/** Wire up a single listener that keeps cachedUser in sync with the session. */
function init(): void {
  if (initialized || !supabase) return
  initialized = true
  // Fires immediately with the restored session on load, then on every
  // sign-in / sign-out / token refresh (including changes in other tabs).
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user
    if (!user) {
      setUser(null)
      return
    }
    void readProfile(user.id, user.email ?? '').then(setUser)
  })
}

/** Refresh the session user (and their Pro flag) from Supabase. */
export async function fetchUser(): Promise<AccountUser | null> {
  if (!supabase) {
    setUser(null)
    return null
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    setUser(null)
    return null
  }
  const account = await readProfile(user.id, user.email ?? '')
  setUser(account)
  return account
}

export async function signupUser(email: string, password: string): Promise<AccountUser> {
  if (!supabase) throw new Error('Accounts are unavailable here.')
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  const user = data.user
  // With email confirmation off, the session is active immediately. With it on,
  // there is no session yet — the account still exists, just not Pro.
  const account = user ? await readProfile(user.id, user.email ?? email) : { email, pro: false }
  setUser(account)
  return account
}

export async function loginUser(email: string, password: string): Promise<AccountUser> {
  if (!supabase) throw new Error('Accounts are unavailable here.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  const account = await readProfile(data.user.id, data.user.email ?? email)
  setUser(account)
  return account
}

export async function logoutUser(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
  setUser(null)
}

/**
 * Kick off a Pro checkout for the signed-in user and redirect to the payment
 * page. The server verifies the caller via the Supabase access token.
 * Throws Error('auth-required') when there is no session.
 */
export async function startProCheckout(): Promise<void> {
  if (!supabase) throw new Error('auth-required')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('auth-required')

  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) throw new Error('auth-required')
  if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout. Please try again.')
  window.location.assign(data.url)
}

/** React hook: the signed-in account user (null when signed out). */
export function useUser(): { user: AccountUser | null } {
  const [user, setLocal] = useState(cachedUser)

  useEffect(() => {
    const update = () => setLocal(cachedUser)
    window.addEventListener(CHANGE_EVENT, update)
    init()
    // Native / no-backend builds never fire an auth event — resolve once.
    if (!fetched && !supabase) void fetchUser()
    return () => window.removeEventListener(CHANGE_EVENT, update)
  }, [])

  return { user }
}
