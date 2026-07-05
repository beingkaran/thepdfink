import JSZip from 'jszip'
import * as pdfjs from 'pdfjs-dist'
import { readPdfFile } from './pdf'

/**
 * PDF → Word (.docx), fully on-device.
 *
 * We extract the text layer with PDF.js, reconstruct lines and paragraphs from
 * the glyph positions, then hand-assemble a minimal Office Open XML package with
 * JSZip (already a dependency). No conversion server, no upload — the file never
 * leaves the device.
 */

interface Line {
  y: number
  x: number
  height: number
  text: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Group a page's text items into visual lines, top-to-bottom, left-to-right. */
function itemsToLines(
  items: { str: string; transform: number[]; width?: number; height?: number }[],
): Line[] {
  const lines: Line[] = []

  for (const item of items) {
    const str = item.str
    if (!str) continue
    const x = item.transform[4]
    const y = item.transform[5]
    const height = Math.abs(item.transform[3]) || item.height || 12

    // Merge into an existing line if the baselines are within ~half a line.
    const tolerance = Math.max(height * 0.6, 3)
    const line = lines.find((l) => Math.abs(l.y - y) <= tolerance)
    if (line) {
      // Insert a space when there is a visible horizontal gap between spans.
      const needsSpace = !line.text.endsWith(' ') && !str.startsWith(' ')
      line.text += needsSpace ? ` ${str}` : str
      line.x = Math.min(line.x, x)
    } else {
      lines.push({ y, x, height, text: str })
    }
  }

  return lines.sort((a, b) => b.y - a.y)
}

/** Word run + paragraph XML for one line of text. */
function paragraphXml(text: string): string {
  const runs = escapeXml(text)
  return (
    '<w:p><w:r><w:t xml:space="preserve">' + runs + '</w:t></w:r></w:p>'
  )
}

function emptyParagraph(): string {
  return '<w:p/>'
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

function documentXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`
}

export interface PdfToWordResult {
  bytes: Uint8Array
  /** True when the source had no extractable text (likely a scan — use OCR first). */
  empty: boolean
  pages: number
}

export async function pdfToWord(file: File): Promise<PdfToWordResult> {
  const bytes = await readPdfFile(file)
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const paragraphs: string[] = []
  let anyText = false

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const items = content.items.filter((it) => 'str' in it) as unknown as {
      str: string
      transform: number[]
      width?: number
      height?: number
    }[]
    const lines = itemsToLines(items)

    let prevY: number | null = null
    let prevHeight = 12
    for (const line of lines) {
      const trimmed = line.text.replace(/\s+/g, ' ').trim()
      if (!trimmed) continue
      anyText = true

      // A larger-than-normal vertical gap reads as a paragraph break.
      if (prevY !== null && prevY - line.y > prevHeight * 1.8) {
        paragraphs.push(emptyParagraph())
      }
      paragraphs.push(paragraphXml(trimmed))
      prevY = line.y
      prevHeight = line.height
    }

    // Page break between pages (except after the last).
    if (i < pdf.numPages) {
      paragraphs.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    }
  }

  const zip = new JSZip()
  zip.file('[Content_Types].xml', CONTENT_TYPES)
  zip.folder('_rels')!.file('.rels', ROOT_RELS)
  zip
    .folder('word')!
    .file('document.xml', documentXml(paragraphs.join('') || emptyParagraph()))

  const blob = await zip.generateAsync({ type: 'uint8array' })
  return { bytes: blob, empty: !anyText, pages: pdf.numPages }
}
