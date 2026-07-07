import * as pdfjs from 'pdfjs-dist'
import { readPdfFile } from './pdf'
import { llmChat, resolveBackend, type ChatMsg, type LoadProgress } from './llm'

/** Pull the full text out of a PDF, page by page. */
export async function extractPdfText(file: File): Promise<string> {
  const bytes = await readPdfFile(file)
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const parts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((it) => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ')
    parts.push(line)
  }
  return parts.join('\n').replace(/[ \t]+/g, ' ').trim()
}

// ── Length presets ────────────────────────────────────────────────────────────

export type SummaryLength = 'short' | 'medium' | 'detailed'

interface LengthSpec {
  /** Instruction to the model. */
  instruction: string
  /** Extractive fallback ratio. */
  ratio: number
  /** Soft token budget for the model's answer. */
  maxTokens: number
}

const LENGTH_SPECS: Record<SummaryLength, LengthSpec> = {
  short: {
    instruction:
      'Write a tight summary of 2–3 sentences capturing only the single most important point.',
    ratio: 0.12,
    maxTokens: 300,
  },
  medium: {
    instruction:
      'Write a clear summary: one short overview paragraph, then 3–5 bullet points covering the key takeaways.',
    ratio: 0.22,
    maxTokens: 700,
  },
  detailed: {
    instruction:
      'Write a thorough summary: a 2–3 sentence overview, then 5–8 bullet points covering the main sections, findings, figures and any action items or dates.',
    ratio: 0.4,
    maxTokens: 1200,
  },
}

export interface SummaryResult {
  /** The finished summary (markdown-ish plain text). */
  summary: string
  /** How it was produced: a real LLM, or the offline extractive fallback. */
  mode: 'ai' | 'extractive'
  originalWords: number
  /** Present only in extractive mode. */
  keywords: string[]
}

// ── Offline extractive fallback (no model available) ─────────────────────────

const STOPWORDS = new Set(
  ('a an the and or but if then else for to of in on at by with from as is are was were be been ' +
    'being this that these those it its it\'s they them their our your you we i he she his her ' +
    'not no do does did done have has had will would can could should may might must shall about ' +
    'into over under again further once here there all any both each few more most other some such ' +
    'than too very s t just don now').split(' '),
)

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)
    ?.map((s) => s.trim())
    .filter((s) => s.length > 20) ?? []
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) || []).filter(
    (w) => w.length > 2 && !STOPWORDS.has(w),
  )
}

/** Frequency-scored extractive summary — used only when no LLM is available. */
function extractiveSummary(text: string, ratio: number): SummaryResult {
  const sentences = splitSentences(text)
  const words = tokenize(text)
  const originalWords = (text.match(/\S+/g) || []).length

  if (sentences.length <= 3) {
    return { summary: text.trim(), mode: 'extractive', originalWords, keywords: [] }
  }

  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1)
  const max = Math.max(1, ...freq.values())

  const scored = sentences.map((sentence, index) => {
    const toks = tokenize(sentence)
    const score = toks.reduce((s, w) => s + (freq.get(w) || 0) / max, 0)
    return { sentence, index, score: toks.length ? score / Math.sqrt(toks.length) : 0 }
  })

  const keep = Math.max(3, Math.round(sentences.length * ratio))
  const top = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, keep)
    .sort((a, b) => a.index - b.index)

  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)

  return {
    summary: top.map((t) => t.sentence).join(' '),
    mode: 'extractive',
    originalWords,
    keywords,
  }
}

// ── LLM summarisation (map-reduce for long documents) ────────────────────────

/** Rough token estimate (~4 chars/token) used to decide when to chunk. */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Split text on paragraph/sentence boundaries into ~charLimit-sized chunks. */
function chunkText(text: string, charLimit: number): string[] {
  if (text.length <= charLimit) return [text]
  const chunks: string[] = []
  const paras = text.split(/\n+/)
  let buf = ''
  for (const para of paras) {
    if (buf && buf.length + para.length + 1 > charLimit) {
      chunks.push(buf)
      buf = ''
    }
    // A single paragraph larger than the limit is hard-split.
    if (para.length > charLimit) {
      if (buf) {
        chunks.push(buf)
        buf = ''
      }
      for (let i = 0; i < para.length; i += charLimit) {
        chunks.push(para.slice(i, i + charLimit))
      }
      continue
    }
    buf = buf ? `${buf}\n${para}` : para
  }
  if (buf) chunks.push(buf)
  return chunks
}

const SYSTEM_SUMMARY =
  'You are a precise document-summarisation assistant. You summarise faithfully using only the ' +
  'information in the provided text. You never invent facts, figures, or conclusions that are not ' +
  'present. You write in clear, plain English.'

/** ~11k chars ≈ ~2.8k tokens, comfortably inside the model context with the prompt. */
const CHUNK_CHARS = 11000

export interface AiSummaryOptions {
  length?: SummaryLength
  onToken?: (delta: string, full: string) => void
  onLoad?: (p: LoadProgress) => void
  signal?: AbortSignal
}

async function llmSummarize(text: string, opts: AiSummaryOptions): Promise<string> {
  const length = opts.length ?? 'medium'
  const spec = LENGTH_SPECS[length]
  const chunks = chunkText(text, CHUNK_CHARS)

  // Short enough for a single pass — stream straight to the UI.
  if (chunks.length === 1) {
    const messages: ChatMsg[] = [
      { role: 'system', content: SYSTEM_SUMMARY },
      {
        role: 'user',
        content: `${spec.instruction}\n\nDocument:\n"""\n${chunks[0]}\n"""`,
      },
    ]
    return llmChat(messages, {
      temperature: 0.3,
      maxTokens: spec.maxTokens,
      onToken: opts.onToken,
      onLoad: opts.onLoad,
      signal: opts.signal,
    })
  }

  // Map: condense each chunk into notes (no streaming to the visible output).
  const notes: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    if (opts.signal?.aborted) break
    const partial = await llmChat(
      [
        { role: 'system', content: SYSTEM_SUMMARY },
        {
          role: 'user',
          content:
            `This is part ${i + 1} of ${chunks.length} of a longer document. ` +
            `Extract the key facts, figures and points as concise notes (no preamble).\n\n"""\n${chunks[i]}\n"""`,
        },
      ],
      { temperature: 0.2, maxTokens: 400, onLoad: opts.onLoad, signal: opts.signal },
    )
    notes.push(partial)
  }

  // Reduce: turn the collected notes into the final summary — stream this one.
  const messages: ChatMsg[] = [
    { role: 'system', content: SYSTEM_SUMMARY },
    {
      role: 'user',
      content:
        `Below are notes extracted from the sections of one document. ${spec.instruction} ` +
        `Base it only on these notes.\n\nNotes:\n"""\n${notes.join('\n\n')}\n"""`,
    },
  ]
  return llmChat(messages, {
    temperature: 0.3,
    maxTokens: spec.maxTokens,
    onToken: opts.onToken,
    signal: opts.signal,
  })
}

/**
 * Summarise a PDF. Uses a real LLM (in-browser on WebGPU, or the cloud fallback)
 * when available; transparently falls back to the offline extractive summariser
 * on a desktop build with no GPU.
 */
export async function summarizePdf(file: File, opts: AiSummaryOptions = {}): Promise<SummaryResult> {
  const text = await extractPdfText(file)
  if (!text || text.length < 40) {
    throw new Error(
      'No selectable text found. This looks like a scanned PDF — run OCR first, then summarise.',
    )
  }
  const originalWords = (text.match(/\S+/g) || []).length

  if (resolveBackend() === 'unavailable') {
    return extractiveSummary(text, LENGTH_SPECS[opts.length ?? 'medium'].ratio)
  }

  try {
    const summary = await llmSummarize(text, opts)
    if (!summary) throw new Error('empty')
    return { summary, mode: 'ai', originalWords, keywords: [] }
  } catch (err) {
    // If the model failed mid-way, don't leave the user empty-handed.
    if (opts.signal?.aborted) throw err
    return extractiveSummary(text, LENGTH_SPECS[opts.length ?? 'medium'].ratio)
  }
}

// Retained for any callers/tests that used the pure extractive helper directly.
export { approxTokens }
