import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function readPdfFile(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  return new Uint8Array(buffer)
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()

  for (const file of files) {
    const bytes = await readPdfFile(file)
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
  }

  return merged.save({ useObjectStreams: true })
}

export function parsePageRanges(input: string, totalPages: number): number[] {
  const trimmed = input.trim()
  if (!trimmed) return Array.from({ length: totalPages }, (_, i) => i)

  const indices = new Set<number>()
  const parts = trimmed.split(',')

  for (const part of parts) {
    const range = part.trim()
    if (!range) continue

    if (range.includes('-')) {
      const [startRaw, endRaw] = range.split('-').map((s) => s.trim())
      const start = Math.max(1, parseInt(startRaw, 10) || 1)
      const end = Math.min(totalPages, parseInt(endRaw, 10) || totalPages)
      for (let i = start; i <= end; i++) indices.add(i - 1)
    } else {
      const page = parseInt(range, 10)
      if (page >= 1 && page <= totalPages) indices.add(page - 1)
    }
  }

  return [...indices].sort((a, b) => a - b)
}

export async function splitPdf(
  file: File,
  ranges: string,
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const bytes = await readPdfFile(file)
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = source.getPageCount()
  const indices = parsePageRanges(ranges, total)
  const base = file.name.replace(/\.pdf$/i, '')

  const output = await PDFDocument.create()
  const pages = await output.copyPages(source, indices)
  pages.forEach((page) => output.addPage(page))

  return [
    {
      name: `${base}_pages_${ranges.replace(/\s/g, '') || 'all'}.pdf`,
      bytes: await output.save({ useObjectStreams: true }),
    },
  ]
}

export async function splitPdfEveryPage(
  file: File,
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const bytes = await readPdfFile(file)
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = source.getPageCount()
  const base = file.name.replace(/\.pdf$/i, '')
  const results: { name: string; bytes: Uint8Array }[] = []

  for (let i = 0; i < total; i++) {
    const doc = await PDFDocument.create()
    const [page] = await doc.copyPages(source, [i])
    doc.addPage(page)
    results.push({
      name: `${base}_page_${i + 1}.pdf`,
      bytes: await doc.save({ useObjectStreams: true }),
    })
  }

  return results
}

export async function rotatePdf(
  file: File,
  angle: 90 | 180 | 270,
  pageIndices?: number[],
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const indices = pageIndices ?? doc.getPageIndices()

  for (const index of indices) {
    const page = doc.getPage(index)
    const current = page.getRotation().angle
    page.setRotation(degrees(current + angle))
  }

  return doc.save({ useObjectStreams: true })
}

export async function organizePdf(
  file: File,
  order: number[],
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const output = await PDFDocument.create()
  const pages = await output.copyPages(source, order)
  pages.forEach((page) => output.addPage(page))
  return output.save({ useObjectStreams: true })
}

export async function addWatermark(
  file: File,
  text: string,
  opacity = 0.3,
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.HelveticaBold)

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    const fontSize = Math.min(width, height) * 0.08

    page.drawText(text, {
      x: width / 2 - (text.length * fontSize) / 4,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.75, 0.1, 0.15),
      opacity,
      rotate: degrees(-35),
    })
  }

  return doc.save({ useObjectStreams: true })
}

export async function redactText(
  file: File,
  searchText: string,
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  const pdf = await loadingTask.promise

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })
    const pdfPage = doc.getPage(i - 1)
    const { width, height } = pdfPage.getSize()

    for (const item of textContent.items) {
      if (!('str' in item)) continue
      const textItem = item as { str: string; transform: number[]; width?: number; height?: number }
      if (!textItem.str.includes(searchText)) continue
      const transform = textItem.transform
      const x = transform[4]
      const y = transform[5]
      const itemWidth = textItem.width ?? textItem.str.length * 6
      const itemHeight = textItem.height ?? 12

      const scaleX = width / viewport.width
      const scaleY = height / viewport.height
      const rectX = x * scaleX
      const rectY = height - y * scaleY - itemHeight * scaleY
      const rectW = Math.max(itemWidth * scaleX, searchText.length * 8 * scaleX)
      const rectH = itemHeight * scaleY + 4

      pdfPage.drawRectangle({
        x: rectX,
        y: rectY,
        width: rectW,
        height: rectH,
        color: rgb(0, 0, 0),
      })
    }
  }

  return doc.save({ useObjectStreams: true })
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png')
  })
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Secure redaction: rasterises every page, burns opaque black boxes over matched
 * text, and rebuilds the PDF from those images. Unlike drawing rectangles over a
 * live text layer, this removes the underlying text entirely — nothing matched
 * can be selected, searched or extracted afterwards.
 */
export async function redactTextSecure(
  file: File,
  searchText: string,
  caseSensitive = false,
): Promise<{ bytes: Uint8Array; matches: number }> {
  const bytes = await readPdfFile(file)
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  const pdf = await loadingTask.promise
  const out = await PDFDocument.create()
  const needle = caseSensitive ? searchText : searchText.toLowerCase()
  const scale = 2
  let matches = 0

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const vp1 = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    const textContent = await page.getTextContent()
    ctx.fillStyle = '#000000'
    for (const item of textContent.items) {
      if (!('str' in item)) continue
      const t = item as { str: string; transform: number[]; width?: number; height?: number }
      const hay = caseSensitive ? t.str : t.str.toLowerCase()
      if (!needle || !hay.includes(needle)) continue
      matches++
      const e = t.transform[4]
      const f = t.transform[5]
      const w = (t.width ?? t.str.length * 6) * scale
      const h = (t.height ?? 12) * scale
      const pad = 2 * scale
      const xPx = e * scale - pad
      const yTop = (vp1.height - f) * scale - h - pad
      ctx.fillRect(xPx, yTop, w + pad * 2, h + pad * 2)
    }

    const png = await out.embedPng(await canvasToPngBytes(canvas))
    const outPage = out.addPage([vp1.width, vp1.height])
    outPage.drawImage(png, { x: 0, y: 0, width: vp1.width, height: vp1.height })
  }

  return { bytes: await out.save({ useObjectStreams: true }), matches }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countAndReplace(
  text: string,
  search: string,
  replace: string,
  caseSensitive: boolean,
): { result: string; count: number } {
  if (!search) return { result: text, count: 0 }
  const flags = caseSensitive ? 'g' : 'gi'
  const regex = new RegExp(escapeRegex(search), flags)
  const matches = text.match(regex)
  const count = matches?.length ?? 0
  return { result: text.replace(regex, replace), count }
}

export async function findAndReplaceText(
  file: File,
  searchText: string,
  replaceText: string,
  caseSensitive = false,
): Promise<{ bytes: Uint8Array; replacements: number }> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  const pdf = await loadingTask.promise
  let replacements = 0

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })
    const pdfPage = doc.getPage(i - 1)
    const { width, height } = pdfPage.getSize()

    for (const item of textContent.items) {
      if (!('str' in item)) continue
      const textItem = item as {
        str: string
        transform: number[]
        width?: number
        height?: number
      }

      const { result, count } = countAndReplace(
        textItem.str,
        searchText,
        replaceText,
        caseSensitive,
      )
      if (count === 0) continue
      replacements += count

      const transform = textItem.transform
      const x = transform[4]
      const y = transform[5]
      const itemWidth = textItem.width ?? textItem.str.length * 6
      const itemHeight = textItem.height ?? 12
      const fontSize = Math.abs(transform[0]) || 12

      const scaleX = width / viewport.width
      const scaleY = height / viewport.height
      const rectX = x * scaleX
      const rectY = height - y * scaleY - itemHeight * scaleY
      const rectW = Math.max(itemWidth * scaleX, result.length * fontSize * 0.5)
      const rectH = itemHeight * scaleY + 4

      pdfPage.drawRectangle({
        x: rectX,
        y: rectY,
        width: rectW,
        height: rectH,
        color: rgb(1, 1, 1),
      })
      pdfPage.drawText(result, {
        x: rectX,
        y: rectY + 2,
        size: fontSize * scaleY,
        font,
        color: rgb(0, 0, 0),
      })
    }
  }

  return {
    bytes: await doc.save({ useObjectStreams: true }),
    replacements,
  }
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const isPng = file.type === 'image/png'
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    })
  }

  return doc.save({ useObjectStreams: true })
}

export async function pdfToImages(file: File): Promise<Blob[]> {
  const bytes = await readPdfFile(file)
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  const pdf = await loadingTask.promise
  const images: Blob[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to render page'))),
        'image/png',
      )
    })
    images.push(blob)
  }

  return images
}

export async function compressPdf(file: File): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.save({ useObjectStreams: true })
}

function formatKeywords(keywords: string | string[] | undefined): string {
  if (!keywords) return ''
  return Array.isArray(keywords) ? keywords.join(', ') : keywords
}

export interface PdfMetadata {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
  producer: string
  pageCount: number
}

export async function readMetadata(file: File): Promise<PdfMetadata> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: formatKeywords(doc.getKeywords()),
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    pageCount: doc.getPageCount(),
  }
}

export async function updateMetadata(
  file: File,
  meta: Pick<PdfMetadata, 'title' | 'author' | 'subject' | 'keywords'>,
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })

  doc.setTitle(meta.title)
  doc.setAuthor(meta.author)
  doc.setSubject(meta.subject)
  doc.setKeywords(
    meta.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  )

  return doc.save({ useObjectStreams: true })
}

export async function getPageCount(file: File): Promise<number> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.getPageCount()
}

export async function getPageSize(
  file: File,
  pageIndex: number,
): Promise<{ width: number; height: number }> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const page = doc.getPage(pageIndex)
  return page.getSize()
}

export async function renderPdfPage(
  file: File,
  pageNumber: number,
  scale = 1.2,
): Promise<string> {
  const bytes = await readPdfFile(file)
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!

  await page.render({ canvasContext: ctx, viewport, canvas }).promise
  return canvas.toDataURL('image/png')
}