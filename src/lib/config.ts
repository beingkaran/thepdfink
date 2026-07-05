/**
 * Central brand + commerce configuration.
 *
 * Everything the owner needs to wire up for production lives here. Values can be
 * overridden at build time with Vite env vars (see .env.example) so no code needs
 * to change to go live.
 */

export const BRAND = {
  name: 'thepdf.ink',
  domain: 'thepdf.ink',
  url: 'https://thepdf.ink',
  tagline: 'Professional PDF tools that never leave your device.',
  email: 'hello@thepdf.ink',
} as const

/** Entry (Personal) one-time price, in USD. Used for hero copy. */
export const PRICE_USD = 9

/**
 * Hosted checkout links for each one-time tier.
 *
 * Drop in a Gumroad / Lemon Squeezy / Ko-fi / Stripe Payment Link per tier. Until
 * a link is set, the buy buttons fall back to /pricing so nothing 404s.
 */
export const CHECKOUT_URLS = {
  personal:
    (import.meta.env.VITE_CHECKOUT_URL_PERSONAL as string | undefined) ||
    (import.meta.env.VITE_CHECKOUT_URL as string | undefined) ||
    '/pricing',
  pro: (import.meta.env.VITE_CHECKOUT_URL_PRO as string | undefined) || '/pricing',
  business:
    (import.meta.env.VITE_CHECKOUT_URL_BUSINESS as string | undefined) || '/pricing',
} as const

/** Back-compat: the Personal ($9) checkout link. */
export const CHECKOUT_URL = CHECKOUT_URLS.personal

/** Resolve the destination link for a given plan id. */
export function checkoutFor(planId: 'free' | 'personal' | 'pro' | 'business'): string {
  if (planId === 'free') return '#tools'
  return CHECKOUT_URLS[planId]
}

/** Google AdSense publisher id (e.g. "ca-pub-1234567890123456"). Empty = ads off. */
export const ADSENSE_CLIENT =
  (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) || ''

/** The platforms the native app ships on. */
export type PlatformId = 'macos' | 'windows' | 'linux' | 'ios' | 'android'

/**
 * Direct download / store links per platform.
 *
 * Point these at your hosted installers (GitHub Releases, R2, etc.) or the App
 * Store / Google Play listings via the VITE_DOWNLOAD_URL_* env vars. Until a link
 * is set it falls back to /pricing, so buttons route to purchase instead of 404ing.
 */
export const DOWNLOAD_URLS: Record<PlatformId, string> = {
  macos: (import.meta.env.VITE_DOWNLOAD_URL_MACOS as string | undefined) || '/pricing',
  windows: (import.meta.env.VITE_DOWNLOAD_URL_WINDOWS as string | undefined) || '/pricing',
  linux: (import.meta.env.VITE_DOWNLOAD_URL_LINUX as string | undefined) || '/pricing',
  ios: (import.meta.env.VITE_DOWNLOAD_URL_IOS as string | undefined) || '/pricing',
  android: (import.meta.env.VITE_DOWNLOAD_URL_ANDROID as string | undefined) || '/pricing',
}

/** True when a real download link has been configured for a platform. */
export function hasDownloadLink(id: PlatformId): boolean {
  return DOWNLOAD_URLS[id] !== '/pricing'
}
