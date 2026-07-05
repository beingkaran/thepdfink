import * as pdfjs from 'pdfjs-dist'
import { readPdfFile } from './pdf'

/**
 * On-device "Ask your PDF".
 *
 * Rather than shipping your document to a cloud LLM, this builds a small TF-IDF
 * search index over the PDF's sentences (each tagged with its page) and answers a
 * question by retrieving the most relevant passages. Answers are extractive — they
 * come straight from the document — and every answer cites the page(s) it came
 * from. No model download, no network: the text never leaves the device.
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

/** Answer a question from the indexed document, with page citations. */
export function answerQuestion(index: DocIndex, question: string): Answer {
  const { idf } = index
  const qTokens = tokenize(question)
  if (!qTokens.length) {
    return { answer: 'Please ask a question with a few keywords.', citations: [], confident: false }
  }

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
    // Exact-phrase boost: reward passages that literally contain the question text.
    if (needle.length > 8 && p.text.toLowerCase().includes(needle)) score += 0.3
    return { p, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  const confident = best && best.score >= MIN_CONFIDENT

  // Take the top passages, drop near-duplicates, keep up to 3.
  const top: { p: Passage; score: number }[] = []
  const seen = new Set<number>()
  for (const s of scored) {
    if (s.score <= 0) break
    if (top.length >= 3) break
    const key = s.p.id
    if (seen.has(key)) continue
    // Skip a passage that's textually contained in one already chosen.
    if (top.some((t) => t.p.text.includes(s.p.text) || s.p.text.includes(t.p.text))) continue
    seen.add(key)
    top.push(s)
  }

  if (!top.length) {
    return {
      answer: "I couldn't find anything about that in this document.",
      citations: [],
      confident: false,
    }
  }

  // Compose the answer in reading order for coherence.
  const ordered = [...top].sort((a, b) => a.p.id - b.p.id)
  const body = ordered.map((t) => t.p.text.replace(/\s+/g, ' ').trim()).join(' ')
  const answer = confident
    ? body
    : `I'm not certain, but this looks most relevant:\n\n${body}`

  const citations: Citation[] = ordered.map((t) => ({ page: t.p.page, text: t.p.text }))
  return { answer, citations, confident }
}
