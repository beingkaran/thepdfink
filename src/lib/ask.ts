import * as pdfjs from 'pdfjs-dist'
import { readPdfFile } from './pdf'
import { llmChat, resolveBackend, RateLimitError, type ChatMsg, type LoadProgress } from './llm'

/**
 * "Ask your PDF" — retrieval-augmented generation, on-device.
 *
 * A TF-IDF index over the PDF's sentences (each tagged with its page) retrieves
 * the passages most relevant to the question. Those passages are then handed to a
 * real instruction-tuned LLM — running in the browser on WebGPU, so the document
 * still never leaves the device — which writes a grounded answer that cites the
 * pages it drew from. When no model is available (offline desktop, no GPU) it
 * falls back to returning the retrieved passages verbatim.
 */

const STOPWORDS = new Set(
  ('a an the and or but if then else for to of in on at by with from as is are was were be been ' +
    'being this that these those it its they them their our your you we i he she his her what which ' +
    'who whom when where why how not no do does did done have has had will would can could should may ' +
    'might must shall about into over under again further once here there all any both each few more ' +
    'most other some such than too very just don now').split(' '),
)

/** Lowercase, strip stopwords, and lightly stem (drop a trailing plural "s"). */
function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z0-9']+/g) || []
  const out: string[] = []
  for (let w of words) {
    w = w.replace(/'s$/, '')
    if (w.length <= 2 || STOPWORDS.has(w)) continue
    if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1)
    out.push(w)
  }
  return out
}

/**
 * Split into sentences by breaking only at end punctuation that is followed by
 * whitespace and a capital/quote — so periods inside emails, URLs, decimals and
 * dates (support@example.com, 4.2, "2026.") don't shatter a sentence. Uses a
 * lookahead only (no lookbehind) for older-Safari compatibility.
 */
function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+(?=["'“([]?[A-Z0-9])/g, '$1\x01')
    .split('\x01')
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
}

interface Passage {
  id: number
  page: number
  text: string
  vec: Map<string, number>
  norm: number
}

export interface DocIndex {
  passages: Passage[]
  /** Inverse document frequency for a term, shared by index + query. */
  idf: (term: string) => number
  pages: number
  words: number
}

export interface Citation {
  page: number
  text: string
}

export interface Answer {
  answer: string
  citations: Citation[]
  confident: boolean
}

/** Extract each page's text separately so passages can carry a page number. */
async function extractPages(file: File): Promise<string[]> {
  const bytes = await readPdfFile(file)
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((it) => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ')
    pages.push(line.replace(/[ \t]+/g, ' ').trim())
  }
  return pages
}

/** Build the on-device search index from a PDF. */
export async function buildDocIndex(file: File): Promise<DocIndex> {
  const pages = await extractPages(file)
  const raw: { page: number; text: string; tokens: string[] }[] = []
  let words = 0

  pages.forEach((pageText, p) => {
    words += (pageText.match(/\S+/g) || []).length
    for (const sentence of splitSentences(pageText)) {
      const tokens = tokenize(sentence)
      if (tokens.length) raw.push({ page: p + 1, text: sentence, tokens })
    }
  })

  if (!raw.length) {
    throw new Error(
      'No selectable text found. This looks like a scanned PDF — run OCR first, then ask questions.',
    )
  }

  // Document frequency for IDF.
  const df = new Map<string, number>()
  for (const r of raw) {
    for (const term of new Set(r.tokens)) df.set(term, (df.get(term) || 0) + 1)
  }
  const N = raw.length
  const idf = (term: string) => Math.log((1 + N) / (1 + (df.get(term) || 0))) + 1

  const passages: Passage[] = raw.map((r, id) => {
    const tf = new Map<string, number>()
    for (const t of r.tokens) tf.set(t, (tf.get(t) || 0) + 1)
    const vec = new Map<string, number>()
    let sumSq = 0
    for (const [term, count] of tf) {
      const w = count * idf(term)
      vec.set(term, w)
      sumSq += w * w
    }
    return { id, page: r.page, text: r.text, vec, norm: Math.sqrt(sumSq) || 1 }
  })

  return { passages, idf, pages: pages.length, words }
}

function cosine(qVec: Map<string, number>, qNorm: number, p: Passage): number {
  let dot = 0
  // Iterate the smaller map.
  const [small, big] = qVec.size < p.vec.size ? [qVec, p.vec] : [p.vec, qVec]
  for (const [term, w] of small) {
    const other = big.get(term)
    if (other) dot += w * other
  }
  return dot / (qNorm * p.norm)
}

const MIN_CONFIDENT = 0.14
/** How many passages to feed the LLM as grounding context. */
const RETRIEVE_K = 6

/**
 * Retrieve the passages most relevant to a question, in reading order.
 * Shared by both the LLM path (as grounding) and the extractive fallback.
 */
function retrieve(
  index: DocIndex,
  question: string,
  k: number,
): { passages: { p: Passage; score: number }[]; confident: boolean } {
  const { idf } = index
  const qTokens = tokenize(question)
  if (!qTokens.length) return { passages: [], confident: false }

  const qTf = new Map<string, number>()
  for (const t of qTokens) qTf.set(t, (qTf.get(t) || 0) + 1)
  const qVec = new Map<string, number>()
  let sumSq = 0
  for (const [term, count] of qTf) {
    const w = count * idf(term)
    qVec.set(term, w)
    sumSq += w * w
  }
  const qNorm = Math.sqrt(sumSq) || 1
  const needle = question.toLowerCase().trim()

  const scored = index.passages.map((p) => {
    let score = cosine(qVec, qNorm, p)
    if (needle.length > 8 && p.text.toLowerCase().includes(needle)) score += 0.3
    return { p, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const confident = (scored[0]?.score ?? 0) >= MIN_CONFIDENT

  const top: { p: Passage; score: number }[] = []
  const seen = new Set<number>()
  for (const s of scored) {
    if (s.score <= 0) break
    if (top.length >= k) break
    if (seen.has(s.p.id)) continue
    if (top.some((t) => t.p.text.includes(s.p.text) || s.p.text.includes(t.p.text))) continue
    seen.add(s.p.id)
    top.push(s)
  }
  top.sort((a, b) => a.p.id - b.p.id)
  return { passages: top, confident }
}

/**
 * Extractive answer — returns the retrieved passages verbatim. Used offline when
 * no LLM backend is available.
 */
export function answerQuestion(index: DocIndex, question: string): Answer {
  const qTokens = tokenize(question)
  if (!qTokens.length) {
    return { answer: 'Please ask a question with a few keywords.', citations: [], confident: false }
  }
  const { passages, confident } = retrieve(index, question, 3)
  if (!passages.length) {
    return {
      answer: "I couldn't find anything about that in this document.",
      citations: [],
      confident: false,
    }
  }
  const body = passages.map((t) => t.p.text.replace(/\s+/g, ' ').trim()).join(' ')
  const answer = confident ? body : `I'm not certain, but this looks most relevant:\n\n${body}`
  const citations: Citation[] = passages.map((t) => ({ page: t.p.page, text: t.p.text }))
  return { answer, citations, confident }
}

const SYSTEM_ASK =
  'You answer questions strictly from the provided document excerpts. Each excerpt is labelled with ' +
  'its page number like [p3]. Use only information in the excerpts — never invent facts. When you ' +
  'state something, cite its source inline as (p<number>). If the excerpts do not contain the ' +
  "answer, say so plainly. Be concise and direct."

export interface AskOptions {
  onToken?: (delta: string, full: string) => void
  onLoad?: (p: LoadProgress) => void
  signal?: AbortSignal
}

/**
 * Answer a question with retrieval-augmented generation. Retrieves grounding
 * passages, then has the LLM compose a cited answer. Falls back to the extractive
 * {@link answerQuestion} when no model backend is available.
 */
export async function askQuestion(
  index: DocIndex,
  question: string,
  opts: AskOptions = {},
): Promise<Answer> {
  if (resolveBackend() === 'unavailable') {
    return answerQuestion(index, question)
  }

  const { passages, confident } = retrieve(index, question, RETRIEVE_K)
  const citations: Citation[] = passages.map((t) => ({ page: t.p.page, text: t.p.text }))

  if (!passages.length) {
    return {
      answer: "I couldn't find anything about that in this document.",
      citations: [],
      confident: false,
    }
  }

  const context = passages
    .map((t) => `[p${t.p.page}] ${t.p.text.replace(/\s+/g, ' ').trim()}`)
    .join('\n\n')

  const messages: ChatMsg[] = [
    { role: 'system', content: SYSTEM_ASK },
    {
      role: 'user',
      content: `Document excerpts:\n"""\n${context}\n"""\n\nQuestion: ${question}`,
    },
  ]

  try {
    const answer = await llmChat(messages, {
      temperature: 0.2,
      maxTokens: 700,
      feature: 'ask',
      onToken: opts.onToken,
      onLoad: opts.onLoad,
      signal: opts.signal,
    })
    if (!answer) throw new Error('empty')
    return { answer, citations, confident }
  } catch (err) {
    if (opts.signal?.aborted) throw err
    // Daily quota hit — still give a basic retrieved answer, but say why.
    if (err instanceof RateLimitError) {
      const base = answerQuestion(index, question)
      const hrs = Math.max(1, Math.round((err.resetSeconds || 0) / 3600))
      const reset = err.resetSeconds ? ` (resets in ~${hrs}h)` : ''
      return {
        ...base,
        confident: false,
        answer: `⚠️ ${err.message}${reset} Here's a basic keyword-based answer instead:\n\n${base.answer}`,
      }
    }
    return answerQuestion(index, question)
  }
}
