/**
 * Shared helpers for the account / entitlement API (Cloudflare Pages Functions).
 *
 * Accounts + the Pro flag now live in Supabase (see functions/api/_supabase.ts).
 * This module only holds the framework-agnostic bits: a JSON responder, email
 * normalisation, and the Lemon Squeezy webhook signature check.
 */

const enc = new TextEncoder()

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

export function normalizeEmail(raw: string): string {
  return String(raw).trim().toLowerCase()
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

/**
 * Verify a Lemon Squeezy `X-Signature` header — a hex HMAC-SHA256 digest of the
 * raw request body signed with the webhook's signing secret.
 */
export async function verifyLemonSqueezySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = toHex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))
  return timingSafeEqual(signature.toLowerCase(), expected)
}
