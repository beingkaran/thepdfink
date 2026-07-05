import { PDFDocument, rgb } from 'pdf-lib'
import { readPdfFile } from './pdf'

/**
 * Form builder: add real, fillable AcroForm fields (text, checkbox, dropdown) to
 * an existing PDF. Fields are placed in PDF-space coordinates (origin bottom-left)
 * so they land exactly where the user drew them on the page preview.
 */

export type BuilderFieldType = 'text' | 'checkbox' | 'dropdown'

export interface BuilderField {
  id: string
  pageIndex: number
  type: BuilderFieldType
  name: string
  x: number
  y: number
  width: number
  height: number
  /** Dropdown choices (one per line in the UI). */
  options?: string[]
}

const BORDER = rgb(0.45, 0.47, 0.5)

export async function buildForm(file: File, fields: BuilderField[]): Promise<Uint8Array> {
  if (!fields.length) throw new Error('Add at least one field.')

  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = doc.getForm()
  const used = new Set<string>()

  fields.forEach((field, index) => {
    const page = doc.getPage(field.pageIndex)
    // AcroForm field names must be unique and non-empty.
    let name = field.name.trim() || `${field.type}_${index + 1}`
    let candidate = name
    let n = 1
    while (used.has(candidate)) candidate = `${name}_${n++}`
    name = candidate
    used.add(name)

    const rect = { x: field.x, y: field.y, width: field.width, height: field.height }

    if (field.type === 'text') {
      const tf = form.createTextField(name)
      tf.setText('')
      tf.addToPage(page, { ...rect, borderColor: BORDER, borderWidth: 1 })
    } else if (field.type === 'checkbox') {
      const cb = form.createCheckBox(name)
      const side = Math.min(rect.width, rect.height)
      cb.addToPage(page, {
        x: rect.x,
        y: rect.y,
        width: side,
        height: side,
        borderColor: BORDER,
        borderWidth: 1,
      })
    } else {
      const options = (field.options ?? []).filter(Boolean)
      const dd = form.createDropdown(name)
      dd.addOptions(options.length ? options : ['Option 1', 'Option 2'])
      dd.addToPage(page, { ...rect, borderColor: BORDER, borderWidth: 1 })
    }
  })

  return doc.save({ useObjectStreams: true })
}
