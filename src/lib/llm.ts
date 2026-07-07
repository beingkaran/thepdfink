/**
 * Unified language-model client for the AI tools (Summarise, Ask).
 *
 * Two backends, chosen automatically:
 *
 *  1. **local**  — a real instruction-tuned LLM (Llama 3.2 3B) running fully
 *     in the browser on WebGPU via @mlc-ai/web-llm. The model weights are
 *     downloaded once (~1.9 GB) and cached by the browser; after that it runs
 *     offline and the document text never leaves the device.
 *
 *  2. **cloud**  — when the browser has no WebGPU (older browsers), the web
 *     build falls back to Cloudflare Workers AI through our own /api/llm proxy.
 *     This *does* send the text to our edge model, so the UI discloses it.
 *
 * On the Tauri desktop build there is no /api proxy, so when WebGPU is absent we
 * report `unavailable` and callers fall back to their on-device heuristic — the
 * desktop app never silently ships your document to the cloud.
 */
import { isTauri } from './platform'

export type ChatRole = 'system' | 'user' | 'assistant'
export interface ChatMsg {
  role: ChatRole
  content: string
}

export type LlmBackend = 'local' | 'cloud' | 'unavailable'

/** Model-weight download progress (local backend only). */
export interface LoadProgress {
  /** 0..1 overall progress of the weight download / GPU upload. */
  progress: number
  /** Human-readable status from the engine (e.g. "Fetching param 12/34"). */
  text: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  /** Streamed as tokens arrive: (delta, fullTextSoFar). */
  onToken?: (delta: string, full: string) => void
  /** Weight-download progress, local backend only. */
  onLoad?: (p: LoadProgress) => void
  /** Feature tag sent to the cloud endpoint; drives per-feature rate limits. */
  feature?: 'ask' | 'summarize'
  signal?: AbortSignal
}

/** Thrown when the cloud endpoint rejects a call for exceeding a daily quota. */
export class RateLimitError extends Error {
  /** Seconds until the quota resets. */
  resetSeconds: number
  constructor(message: string, resetSeconds: number) {
    super(message)
    this.name = 'RateLimitError'
    this.resetSeconds = resetSeconds
  }
}

// ── Model catalogue + selection ──────────────────────────────────────────────

export interface ModelOption {
  id: string
  /** Short name for buttons. */
  label: string
  /** Approx one-time download. */
  size: string
  /** One-line tradeoff shown under the picker. */
  blurb: string
}

/**
 * Selectable in-browser models. The first entry is the default. Both are
 * instruction-tuned and quantised (q4f16) to run in the browser on WebGPU.
 */
export const MODELS: ModelOption[] = [
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Balanced · 3B',
    size: '~1.9 GB',
    blurb: 'Best answers. Needs a reasonably capable GPU and ~2 GB free.',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Fast · 1B',
    size: '~0.9 GB',
    blurb: 'Smaller download, quicker on weaker machines. Slightly simpler answers.',
  },
]

const MODEL_PREF_KEY = 'thepdf_llm_model'

/** The model the user has chosen (persisted), or the default. */
export function getSelectedModel(): ModelOption {
  try {
    const id = localStorage.getItem(MODEL_PREF_KEY)
    const found = MODELS.find((m) => m.id === id)
    if (found) return found
  } catch {
    /* localStorage unavailable */
  }
  return MODELS[0]
}

export function setSelectedModel(id: string): void {
  try {
    if (MODELS.some((m) => m.id === id)) localStorage.setItem(MODEL_PREF_KEY, id)
  } catch {
    /* ignore */
  }
}

/** True when this browser exposes the WebGPU API. */
export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

let adapterOk: boolean | null = null

/**
 * Confirm WebGPU actually yields a usable adapter — the API can be present but
 * fail to return a GPU (blocklisted drivers, software renderers, older webviews).
 * Cached after the first probe.
 */
export async function probeWebGPU(): Promise<boolean> {
  if (adapterOk !== null) return adapterOk
  if (!hasWebGPU()) {
    adapterOk = false
    return adapterOk
  }
  try {
    const gpu = (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu
    adapterOk = !!(await gpu.requestAdapter())
  } catch {
    adapterOk = false
  }
  return adapterOk
}

/**
 * Which backend will be used, cheaply (does not verify the GPU adapter). Use for
 * the initial render; confirm with {@link verifyBackend} before relying on it.
 *  - WebGPU present            → 'local'
 *  - no WebGPU, running on web  → 'cloud'
 *  - no WebGPU, Tauri desktop   → 'unavailable' (caller uses offline heuristic)
 */
export function resolveBackend(): LlmBackend {
  if (hasWebGPU()) return 'local'
  if (!isTauri()) return 'cloud'
  return 'unavailable'
}

/** Like {@link resolveBackend} but actually verifies a working GPU adapter. */
export async function verifyBackend(): Promise<LlmBackend> {
  if (await probeWebGPU()) return 'local'
  if (!isTauri()) return 'cloud'
  return 'unavailable'
}

// ── Local engine (lazy, singleton) ───────────────────────────────────────────

// Typed loosely to avoid pulling the heavy web-llm types into the main bundle.
type Engine = {
  chat: {
    completions: {
      create: (req: unknown) => Promise<AsyncIterable<{ choices: { delta: { content?: string } }[] }>>
    }
  }
  setInitProgressCallback: (cb: (r: { progress: number; text: string }) => void) => void
  reload: (modelId: string) => Promise<void>
  interruptGenerate: () => void
}

let engine: Engine | null = null
let loadingPromise: Promise<Engine> | null = null
let loadedModelId: string | null = null
/** Whichever caller is currently loading receives progress via this delegate. */
let activeOnLoad: ((p: LoadProgress) => void) | undefined

/** True once the given model (or any, if omitted) is downloaded and resident. */
export function isLocalModelReady(modelId?: string): boolean {
  if (!engine || loadingPromise) return false
  return modelId ? loadedModelId === modelId : loadedModelId !== null
}

async function getEngine(modelId: string, onLoad?: (p: LoadProgress) => void): Promise<Engine> {
  activeOnLoad = onLoad

  // Already resident with the requested model.
  if (engine && loadedModelId === modelId && !loadingPromise) {
    onLoad?.({ progress: 1, text: 'Model ready' })
    return engine
  }
  // A load for the same model is already in flight — join it.
  if (loadingPromise && loadedModelId === modelId) return loadingPromise

  const previousModelId = engine ? loadedModelId : null
  loadedModelId = modelId
  loadingPromise = (async () => {
    // Dynamic import keeps the ~6 MB engine out of the initial bundle.
    const webllm = await import('@mlc-ai/web-llm')
    const cb = (r: { progress: number; text: string }) =>
      activeOnLoad?.({ progress: r.progress, text: r.text })
    if (engine) {
      // Switch the existing engine to a different model.
      engine.setInitProgressCallback(cb)
      await engine.reload(modelId)
    } else {
      engine = (await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: cb,
      })) as unknown as Engine
    }
    return engine
  })()

  try {
    return await loadingPromise
  } catch (err) {
    // Roll back to whatever model the engine actually holds so a retry is clean.
    loadedModelId = previousModelId
    throw err
  } finally {
    loadingPromise = null
  }
}

async function chatLocal(messages: ChatMsg[], opts: ChatOptions): Promise<string> {
  const eng = await getEngine(getSelectedModel().id, opts.onLoad)
  const stream = await eng.chat.completions.create({
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
  })

  let full = ''
  for await (const chunk of stream) {
    if (opts.signal?.aborted) {
      try {
        eng.interruptGenerate()
      } catch {
        /* ignore */
      }
      break
    }
    const delta = chunk.choices[0]?.delta?.content || ''
    if (delta) {
      full += delta
      opts.onToken?.(delta, full)
    }
  }
  return full.trim()
}

// ── Cloud fallback (Cloudflare Workers AI via /api/llm) ───────────────────────

async function chatCloud(messages: ChatMsg[], opts: ChatOptions): Promise<string> {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1024,
      feature: opts.feature,
    }),
    signal: opts.signal,
  })
  if (res.status === 429) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; resetSeconds?: number }
    throw new RateLimitError(
      data.error || "You've reached today's AI question limit.",
      data.resetSeconds ?? 0,
    )
  }
  if (!res.ok) {
    throw new Error(`Cloud model unavailable (${res.status}).`)
  }
  const data = (await res.json()) as { text?: string; error?: string }
  if (data.error) throw new Error(data.error)
  const text = (data.text || '').trim()
  // No token streaming from the proxy — emit the whole answer once.
  opts.onToken?.(text, text)
  return text
}

/** Raised when no model backend is available (offline desktop without WebGPU). */
export class NoLlmError extends Error {
  constructor() {
    super('No language model is available in this environment.')
    this.name = 'NoLlmError'
  }
}

/**
 * Run a chat completion on whichever backend is available.
 * Throws {@link NoLlmError} when neither local nor cloud can serve the request.
 */
export async function llmChat(messages: ChatMsg[], opts: ChatOptions = {}): Promise<string> {
  const backend = resolveBackend()
  if (backend === 'local') return chatLocal(messages, opts)
  if (backend === 'cloud') return chatCloud(messages, opts)
  throw new NoLlmError()
}
