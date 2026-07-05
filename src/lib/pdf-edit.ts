import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'
import { readPdfFile } from './pdf'

/**
 * Inline PDF editing: extract the existing text runs with their positions and
 * an approximation of their font, let the caller rewrite them, then white out
 * the originals and redraw with a matched Standard font. Images can be dropped
 * onto any page in the same pass. Everything runs on-device.
 */

export type FontFamily = 'sans' | 'serif' | 'mono'

export interface EditableTextItem {
  id: string
  /** PDF-space coordinates, origin bottom-left. */
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  text: string
  family: FontFamily
  bold: boolean
  italic: boolean
}

export interface TextEdit extends EditableTextItem {
  pageIndex: number
  /** The replacement text; when identical to `text` the run is left untouched. */
  newText: string
}

export interface ImageInsert {
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  bytes: Uint8Array
  isPng: boolean
}

function classifyFont(fontFamily: string | undefined, fontName: string): {
  family: FontFamily
  bold: boolean
  italic: boolean
} {
  const hint = `${fontFamily ?? ''} ${fontName}`.toLowerCase()
  const bold = /bold|black|heavy|semibold|-bd/.test(hint)
  const italic = /italic|oblique|-it/.test(hint)
  let family: FontFamily = 'sans'
  if (/times|serif|georgia|garamond|minion|roman/.test(hint)) family = 'serif'
  else if (/courier|mono|consol/.test(hint)) family = 'mono'
  return { family, bold, italic }
}

/** Read every text run on a page with position + font approximation. */
export async function extractEditableText(
  file: File,
  pageIndex: number,
): Promise<EditableTextItem[]> {
  const bytes = await readPdfFile(file)
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const page = await pdf.getPage(pageIndex + 1)
  const content = await page.getTextContent()
  const styles = content.styles as Record<string, { fontFamily?: string }>
  const items: EditableTextItem[] = []

  for (const raw of content.items) {
    if (!('str' in raw)) continue
    const it = raw as {
      str: string
      transform: number[]
      width?: number
      height?: number
      fontName: string
    }
    if (!it.str.trim()) continue
    const fontSize = Math.hypot(it.transform[0], it.transform[1]) || Math.abs(it.transform[3]) || 12
    const { family, bold, italic } = classifyFont(styles?.[it.fontName]?.fontFamily, it.fontName)
    items.push({
      id: crypto.randomUUID(),
      x: it.transform[4],
      y: it.transform[5],
      width: it.width ?? it.str.length * fontSize * 0.5,
      height: it.height ?? fontSize,
      fontSize,
      text: it.str,
      family,
      bold,
      italic,
    })
  }

  return items
}

function standardFontFor(family: FontFamily, bold: boolean, italic: boolean): StandardFonts {
  if (family === 'serif') {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic
    if (bold) return StandardFonts.TimesRomanBold
    if (italic) return StandardFonts.TimesRomanItalic
    return StandardFonts.TimesRoman
  }
  if (family === 'mono') {
    if (bold && italic) return StandardFonts.CourierBoldOblique
    if (bold) return StandardFonts.CourierBold
    if (italic) return StandardFonts.CourierOblique
    return StandardFonts.Courier
  }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique
  if (bold) return StandardFonts.HelveticaBold
  if (italic) return StandardFonts.HelveticaOblique
  return StandardFonts.Helvetica
}

/** WinAnsi-safe: Standard fonts can't encode arbitrary Unicode. */
function sanitize(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}

export async function applyPdfEdits(
  file: File,
  textEdits: TextEdit[],
  imageInserts: ImageInsert[],
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const fontCache = new Map<StandardFonts, PDFFont>()

  const getFont = async (f: StandardFonts): Promise<PDFFont> => {
    let font = fontCache.get(f)
    if (!font) {
      font = await doc.embedFont(f)
      fontCache.set(f, font)
    }
    return font
  }

  for (const edit of textEdits) {
    if (edit.newText === edit.text) continue
    const page = doc.getPage(edit.pageIndex)
    const pad = Math.max(edit.height * 0.15, 1)
    // Cover the original run.
    page.drawRectangle({
      x: edit.x - pad,
      y: edit.y - pad,
      width: edit.width + pad * 2,
      height: edit.height + pad * 2,
      color: rgb(1, 1, 1),
    })
    const clean = sanitize(edit.newText)
    if (!clean) continue
    const font = await getFont(standardFontFor(edit.family, edit.bold, edit.italic))
    try {
      page.drawText(clean, {
        x: edit.x,
        y: edit.y,
        size: edit.fontSize,
        font,
        color: rgb(0, 0, 0),
      })
    } catch {
      // Skip runs with glyphs the Standard font can't encode.
    }
  }

  for (const img of imageInserts) {
    const page = doc.getPage(img.pageIndex)
    const embedded = img.isPng ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes)
    page.drawImage(embedded, {
      x: img.x,
      y: img.y,
      width: img.width,
      height: img.height,
    })
  }

  return doc.save({ useObjectStreams: true })
}
