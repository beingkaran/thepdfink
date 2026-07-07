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

// ── Daily rate limiting (KV-backed) ──────────────────────────────────────────

/** Minimal subset of the Cloudflare KV binding we rely on. */
export interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}

/** Seconds from `now` until the next UTC midnight (when a daily quota resets). */
export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  )
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000))
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  /** Seconds until the quota resets (next UTC midnight). */
  resetSeconds: number
}

/**
 * Soft per-key daily rate limit backed by KV.
 *
 * KV is eventually consistent and has no atomic increment, so under heavy
 * concurrency a few extra requests may slip through — acceptable for a cost-
 * control cap, not a security boundary. Counts the current request (pre-flight).
 * If `kv` is missing (binding not configured) it fails **open** so a misconfig
 * never takes the feature down.
 */
export async function rateLimitDaily(
  kv: KVNamespace | undefined,
  bucket: string,
  id: string,
  limit: number,
): Promise<RateLimitResult> {
  const resetSeconds = secondsUntilUtcMidnight()
  if (!kv) return { allowed: true, limit, remaining: limit, resetSeconds }

  const day = new Date().toISOString().slice(0, 10)
  const key = `rl:${bucket}:${id}:${day}`
  const used = Number((await kv.get(key)) || '0') || 0

  if (used >= limit) {
    return { allowed: false, limit, remaining: 0, resetSeconds }
  }
  // Expire a minute after reset so stale counters clean themselves up.
  await kv.put(key, String(used + 1), { expirationTtl: resetSeconds + 60 })
  return { allowed: true, limit, remaining: Math.max(0, limit - (used + 1)), resetSeconds }
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
