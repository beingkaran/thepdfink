import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readPdfFile } from './pdf'

export type AnnotationType = 'highlight' | 'underline' | 'comment'

export interface Annotation {
  id: string
  pageIndex: number
  type: AnnotationType
  x: number
  y: number
  width: number
  height: number
  text?: string
}

export async function applyAnnotations(
  file: File,
  annotations: Annotation[],
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)

  for (const ann of annotations) {
    const page = doc.getPage(ann.pageIndex)

    if (ann.type === 'highlight') {
      page.drawRectangle({
        x: ann.x,
        y: ann.y,
        width: ann.width,
        height: ann.height,
        color: rgb(1, 0.92, 0.23),
        opacity: 0.4,
      })
    } else if (ann.type === 'underline') {
      page.drawLine({
        start: { x: ann.x, y: ann.y },
        end: { x: ann.x + ann.width, y: ann.y },
        thickness: 2,
        color: rgb(0.75, 0.1, 0.15),
      })
    } else if (ann.type === 'comment' && ann.text) {
      const padding = 6
      const fontSize = 10
      const boxHeight = fontSize + padding * 2
      const boxWidth = Math.min(ann.width, 220)

      page.drawRectangle({
        x: ann.x,
        y: ann.y,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 0.98, 0.85),
        borderColor: rgb(0.75, 0.1, 0.15),
        borderWidth: 1,
      })
      page.drawText(ann.text, {
        x: ann.x + padding,
        y: ann.y + padding,
        size: fontSize,
        font,
        color: rgb(0.1, 0.12, 0.18),
        maxWidth: boxWidth - padding * 2,
      })
    }
  }

  return doc.save({ useObjectStreams: true })
}