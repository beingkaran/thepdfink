import { createWorker } from 'tesseract.js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'
import { readPdfFile } from './pdf'

export interface OcrProgress {
  page: number
  totalPages: number
  status: string
  progress: number
}

export interface OcrResult {
  /** Full recognised text, pages separated by form feeds. */
  text: string
  /** A searchable copy of the document: page images with an invisible text layer. */
  pdfBytes: Uint8Array
  pages: number
}

interface OcrWord {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

// tesseract.js v7 returns words nested inside blocks; older builds expose data.words.
function collectWords(data: unknown): OcrWord[] {
  const d = data as { words?: OcrWord[]; blocks?: unknown[] }
  if (Array.isArray(d.words) && d.words.length) return d.words
  const words: OcrWord[] = []
  for (const block of (d.blocks as { paragraphs?: unknown[] }[]) || []) {
    for (const para of (block.paragraphs as { lines?: unknown[] }[]) || []) {
      for (const line of (para.lines as { words?: OcrWord[] }[]) || []) {
        for (const word of line.words || []) words.push(word)
      }
    }
  }
  return words
}

/** Only characters the StandardFonts (WinAnsi) can encode are safe to draw. */
function sanitize(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}

async function renderToCanvas(page: pdfjs.PDFPageProxy, scale: number) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport, canvas }).promise
  return canvas
}

async function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('export failed'))), 'image/png'),
  )
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Runs OCR entirely on-device via tesseract.js (WASM). The recognition engine and
 * language model are fetched once from a CDN and cached by the browser; your PDF
 * itself is never uploaded.
 */
export async function ocrPdf(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const scale = 2
  const bytes = await readPdfFile(file)
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const totalPages = pdf.numPages

  const out = await PDFDocument.create()
  const font = await out.embedFont(StandardFonts.Helvetica)
  const worker = await createWorker('eng')
  const texts: string[] = []

  try {
    for (let i = 1; i <= totalPages; i++) {
      onProgress?.({ page: i, totalPages, status: 'Rendering page', progress: 0 })
      const page = await pdf.getPage(i)
      const vp1 = page.getViewport({ scale: 1 })
      const canvas = await renderToCanvas(page, scale)

      onProgress?.({ page: i, totalPages, status: 'Recognising text', progress: 0.5 })
      const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true })
      texts.push(data.text || '')

      const png = await out.embedPng(await canvasPng(canvas))
      const outPage = out.addPage([vp1.width, vp1.height])
      outPage.drawImage(png, { x: 0, y: 0, width: vp1.width, height: vp1.height })

      for (const word of collectWords(data)) {
        const clean = sanitize(word.text).trim()
        if (!clean) continue
        const x = word.bbox.x0 / scale
        const wh = (word.bbox.y1 - word.bbox.y0) / scale
        const y = vp1.height - word.bbox.y1 / scale
        try {
          outPage.drawText(clean, {
            x,
            y,
            size: Math.max(wh, 1),
            font,
            color: rgb(1, 1, 1),
            opacity: 0,
          })
        } catch {
          // Skip words with glyphs the font can't encode.
        }
      }
    }
  } finally {
    await worker.terminate()
  }

  return {
    text: texts.join('\n\n\f\n\n'),
    pdfBytes: await out.save({ useObjectStreams: true }),
    pages: totalPages,
  }
}

/** OCR a single image file to plain text. */
export async function ocrImage(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  onProgress?.({ page: 1, totalPages: 1, status: 'Recognising text', progress: 0.5 })
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(file)
    return data.text || ''
  } finally {
    await worker.terminate()
  }
}
