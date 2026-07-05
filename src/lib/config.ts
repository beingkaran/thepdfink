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
