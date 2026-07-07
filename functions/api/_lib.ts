/**
 * Shared helpers for the account / entitlement API (Cloudflare Pages Functions).
 *
 * Storage: USERS_KV, one record per account under `user:<email>`.
 * Sessions: signed HttpOnly cookie (HMAC-SHA256 with SESSION_SECRET).
 * Passwords: PBKDF2-SHA256, 100k iterations, per-user salt.
 */

export interface UserRecord {
  email: string
  passHash: string
  salt: string
  pro: boolean
  createdAt: string
  proSince?: string
}

export interface PublicUser {
  email: string
  pro: boolean
}

const SESSION_COOKIE = 'pdfink_session'
const SESSION_TTL_S = 60 * 60 * 24 * 30 // 30 days

const enc = new TextEncoder()

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

export function publicUser(user: UserRecord): PublicUser {
  return { email: user.email, pro: user.pro }
}

export function normalizeEmail(raw: string): string {
  return String(raw).trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── encoding ──────────────────────────────────────────────

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(s: string): Uint8Array {
  const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
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

// ── passwords ─────────────────────────────────────────────

async function pbkdf2(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    key,
    256,
  )
  return b64url(bits)
}

export async function hashPassword(password: string): Promise<{ salt: string; passHash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: b64url(salt), passHash: await pbkdf2(password, salt) }
}

export async function verifyPassword(
  password: string,
  salt: string,
  expected: string,
): Promise<boolean> {
  return timingSafeEqual(await pbkdf2(password, b64urlToBytes(salt)), expected)
}

// ── sessions ──────────────────────────────────────────────

function sessionSecret(env: any): string {
  // Fallback keeps local dev working; set SESSION_SECRET in production.
  return env.SESSION_SECRET || 'dev-only-secret'
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(message)))
}

export async function createSessionCookie(env: any, email: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_S
  const payload = `${b64url(enc.encode(email))}.${expires}`
  const sig = await hmac(sessionSecret(env), payload)
  return `${SESSION_COOKIE}=${payload}.${sig}; Path=/; Max-Age=${SESSION_TTL_S}; HttpOnly; Secure; SameSite=Lax`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}

/** Returns the signed-in email, or null when the session is missing/invalid/expired. */
export async function getSessionEmail(request: Request, env: any): Promise<string | null> {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  if (!match) return null
  const [emailB64, expires, sig] = match[1].split('.')
  if (!emailB64 || !expires || !sig) return null
  if (Number(expires) < Math.floor(Date.now() / 1000)) return null
  const expected = await hmac(sessionSecret(env), `${emailB64}.${expires}`)
  if (!timingSafeEqual(sig, expected)) return null
  try {
    return new TextDecoder().decode(b64urlToBytes(emailB64))
  } catch {
    return null
  }
}

// ── user storage ──────────────────────────────────────────

export async function getUser(env: any, email: string): Promise<UserRecord | null> {
  const raw = await env.USERS_KV.get(`user:${email}`)
  return raw ? (JSON.parse(raw) as UserRecord) : null
}

export async function putUser(env: any, user: UserRecord): Promise<void> {
  await env.USERS_KV.put(`user:${user.email}`, JSON.stringify(user))
}

/** Flip the pro entitlement on an account (idempotent). */
export async function grantPro(env: any, email: string): Promise<boolean> {
  const user = await getUser(env, email)
  if (!user) return false
  if (!user.pro) {
    user.pro = true
    user.proSince = new Date().toISOString()
    await putUser(env, user)
  }
  return true
}

// ── Lemon Squeezy webhook signature ───────────────────────

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
