import { useEffect, useState } from 'react'
import { isTauri } from './platform'

/**
 * Local entitlement / admin unlock.
 *
 * thepdf.ink has no accounts or license server — purchases are honour-based and
 * the web tools are free. This module adds a **local-only admin login** so a
 * tester can unlock everything (no pricing, no upsell, all Pro/gated tools) while
 * developing.
 *
 * ⚠️ This is NOT a security boundary. The credentials are checked in the browser
 * and the flag lives in localStorage, so it only affects this device's UI. There
 * is nothing server-side to protect — it exists purely to bypass the upsell UX
 * during local testing. The admin entry point is hidden in production unless the
 * page is opened with `?admin`.
 */

const ADMIN_KEY = 'thepdf_admin'
const CHANGE_EVENT = 'thepdf-entitlement-change'

/** Configurable local admin credentials (defaults are fine for local testing). */
const ADMIN_USER = (import.meta.env.VITE_ADMIN_USER as string | undefined) || 'admin'
const ADMIN_PASS = (import.meta.env.VITE_ADMIN_PASS as string | undefined) || 'admin'

/** Force full access at build time (e.g. VITE_ADMIN_MODE=true for a test build). */
const ADMIN_MODE = import.meta.env.VITE_ADMIN_MODE === 'true'

function readAdminFlag(): boolean {
  try {
    return localStorage.getItem(ADMIN_KEY) === '1'
  } catch {
    return false
  }
}

/** Is an admin session active on this device? */
export function isAdmin(): boolean {
  return ADMIN_MODE || readAdminFlag()
}

/**
 * Does the current user get everything unlocked?
 * True for the paid native apps, an active admin session, or an admin-mode build.
 */
export function hasFullAccess(): boolean {
  return ADMIN_MODE || isTauri() || readAdminFlag()
}

/** Attempt an admin login. Returns true on success. */
export function loginAdmin(user: string, pass: string): boolean {
  if (user.trim() === ADMIN_USER && pass === ADMIN_PASS) {
    try {
      localStorage.setItem(ADMIN_KEY, '1')
    } catch {
      // localStorage unavailable (private mode) — fall back to session-only via event.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return true
  }
  return false
}

export function logoutAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_KEY)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** React hook: re-renders when the admin/entitlement state changes. */
export function useEntitlement(): { fullAccess: boolean; admin: boolean } {
  const [state, setState] = useState(() => ({
    fullAccess: hasFullAccess(),
    admin: isAdmin(),
  }))

  useEffect(() => {
    const update = () => setState({ fullAccess: hasFullAccess(), admin: isAdmin() })
    window.addEventListener(CHANGE_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(CHANGE_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return state
}
