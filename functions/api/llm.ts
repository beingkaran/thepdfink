/**
 * Cloud fallback for the AI tools — Cloudflare Workers AI.
 *
 * Only reached when the visitor's browser has no WebGPU, so the in-browser model
 * (see src/lib/llm.ts) can't run. Runs a Llama-class model on Cloudflare's edge
 * and returns the completion. Requires the `AI` binding (wrangler.jsonc).
 */
import { json, rateLimitDaily, type KVNamespace } from './_lib'

interface Env {
  AI?: {
    run: (
      model: string,
      input: { messages: unknown; temperature?: number; max_tokens?: number },
    ) => Promise<{ response?: string }>
  }
  /** KV used for the daily Ask-AI quota (defined in wrangler.jsonc). */
  EVENTS_KV?: KVNamespace
}

/** Edge model — 8B instruct is a solid balance of quality and cost/latency. */
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct'

/** Cloud "Ask AI" answers allowed per IP per UTC day. Local (WebGPU) is unlimited. */
const ASK_DAILY_LIMIT = 10

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.AI) {
    return json({ error: 'The cloud AI model is not configured on this deployment.' }, 503)
  }

  let body: {
    messages?: unknown
    temperature?: number
    max_tokens?: number
    feature?: string
  }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const messages = body.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'No messages provided.' }, 400)
  }

  // Rate-limit the metered Ask-AI feature (Summarise is not capped here).
  if (body.feature === 'ask') {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const rl = await rateLimitDaily(env.EVENTS_KV, 'ask', ip, ASK_DAILY_LIMIT)
    if (!rl.allowed) {
      return json(
        {
          error: `You've reached today's limit of ${rl.limit} AI questions. It resets at midnight UTC.`,
          rateLimited: true,
          resetSeconds: rl.resetSeconds,
        },
        429,
        {
          'Retry-After': String(rl.resetSeconds),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': '0',
        },
      )
    }
  }

  try {
    const result = await env.AI.run(CF_MODEL, {
      messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
      max_tokens: Math.min(2048, Math.max(64, Number(body.max_tokens) || 1024)),
    })
    return json({ text: result.response ?? '' })
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Cloud model request failed.' },
      502,
    )
  }
}
