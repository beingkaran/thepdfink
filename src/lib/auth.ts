import { useEffect, useState } from 'react'

/**
 * User accounts + Pro entitlement, backed by the Pages Functions API (/api/*).
 *
 * The session lives in an HttpOnly cookie set by the server; the client only
 * caches the public user object ({ email, pro }). The pro flag is flipped
 * server-side after a successful Lemon Squeezy checkout — this module never grants
 * anything locally.
 */

export interface AccountUser {
  email: string
  pro: boolean
}

const CHANGE_EVENT = 'thepdf-user-change'

let cachedUser: AccountUser | null = null
let fetched = false

function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api/${path}`, { credentials: 'same-origin', ...init })
}

function setUser(user: AccountUser | null): void {
  cachedUser = user
  fetched = true
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Refresh the session user from the server. */
export async function fetchUser(): Promise<AccountUser | null> {
  try {
    const res = await api('me')
    const data = res.ok ? await res.json() : { user: null }
    setUser(data.user ?? null)
  } catch {
    // API unreachable (e.g. native app without the web backend) — treat as signed out.
    setUser(null)
  }
  return cachedUser
}

async function credentials(path: 'signup' | 'login', email: string, password: string): Promise<AccountUser> {
  const res = await api(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  setUser(data.user)
  return data.user
}

export function signupUser(email: string, password: string): Promise<AccountUser> {
  return credentials('signup', email, password)
}

export function loginUser(email: string, password: string): Promise<AccountUser> {
  return credentials('login', email, password)
}

export async function logoutUser(): Promise<void> {
  try {
    await api('logout', { method: 'POST' })
  } catch {
    // best-effort — clear the local cache regardless
  }
  setUser(null)
}

/**
 * Kick off a Pro checkout for the signed-in user and redirect to the payment
 * page. Throws Error('auth-required') when there is no session.
 */
export async function startProCheckout(): Promise<void> {
  const res = await api('checkout', { method: 'POST' })
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
    if (!fetched) void fetchUser()
    return () => window.removeEventListener(CHANGE_EVENT, update)
  }, [])

  return { user }
}
