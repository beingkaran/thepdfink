import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { readPdfFile } from './pdf'

export interface SignaturePlacement {
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

export async function addImageSignature(
  file: File,
  signaturePng: Uint8Array,
  placement: SignaturePlacement,
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const image = await doc.embedPng(signaturePng)
  const page = doc.getPage(placement.pageIndex)

  page.drawImage(image, {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
  })

  return doc.save({ useObjectStreams: true })
}

export async function addTypedSignature(
  file: File,
  text: string,
  placement: SignaturePlacement,
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.TimesRomanItalic)
  const page = doc.getPage(placement.pageIndex)
  const fontSize = Math.min(placement.height * 0.7, 36)

  page.drawText(text, {
    x: placement.x,
    y: placement.y + (placement.height - fontSize) / 2,
    size: fontSize,
    font,
    color: rgb(0.05, 0.1, 0.25),
  })

  return doc.save({ useObjectStreams: true })
}