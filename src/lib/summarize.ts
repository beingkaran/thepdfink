import * as pdfjs from 'pdfjs-dist'
import { readPdfFile } from './pdf'

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

export interface SummaryResult {
  summary: string
  sentences: string[]
  originalWords: number
  keywords: string[]
}

/**
 * On-device extractive summariser. Scores sentences by the frequency of their
 * meaningful words, then returns the top-ranked ones in their original order.
 * No model download, no network — the document text never leaves the device.
 */
export function summarizeText(text: string, ratio = 0.2): SummaryResult {
  const sentences = splitSentences(text)
  const words = tokenize(text)
  const originalWords = (text.match(/\S+/g) || []).length

  if (sentences.length <= 3) {
    return { summary: text.trim(), sentences, originalWords, keywords: [] }
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
    sentences: top.map((t) => t.sentence),
    originalWords,
    keywords,
  }
}

export async function summarizePdf(file: File, ratio = 0.2): Promise<SummaryResult> {
  const text = await extractPdfText(file)
  if (!text || text.length < 40) {
    throw new Error(
      'No selectable text found. This looks like a scanned PDF — run OCR first, then summarise.',
    )
  }
  return summarizeText(text, ratio)
}
