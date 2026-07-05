import {
  PDFDocument,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFTextField,
} from 'pdf-lib'
import { readPdfFile } from './pdf'

export type FormFieldType =
  | 'text'
  | 'checkbox'
  | 'dropdown'
  | 'radio'
  | 'button'
  | 'unknown'

export interface FormFieldInfo {
  name: string
  type: FormFieldType
  value: string
  checked?: boolean
  options?: string[]
}

export async function readFormFields(file: File): Promise<FormFieldInfo[]> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = doc.getForm()
  const fields = form.getFields()

  return fields.map((field) => {
    const name = field.getName()

    if (field instanceof PDFTextField) {
      return { name, type: 'text' as const, value: field.getText() ?? '' }
    }
    if (field instanceof PDFCheckBox) {
      return {
        name,
        type: 'checkbox' as const,
        value: '',
        checked: field.isChecked(),
      }
    }
    if (field instanceof PDFDropdown) {
      const selected = field.getSelected()
      return {
        name,
        type: 'dropdown' as const,
        value: selected[0] ?? '',
        options: field.getOptions(),
      }
    }
    if (field instanceof PDFRadioGroup) {
      return {
        name,
        type: 'radio' as const,
        value: field.getSelected() ?? '',
        options: field.getOptions(),
      }
    }

    return { name, type: 'unknown' as const, value: '' }
  })
}

export async function fillFormFields(
  file: File,
  values: Record<string, string | boolean>,
): Promise<Uint8Array> {
  const bytes = await readPdfFile(file)
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = doc.getForm()

  for (const field of form.getFields()) {
    const name = field.getName()
    if (!(name in values)) continue
    const value = values[name]

    if (field instanceof PDFTextField && typeof value === 'string') {
      field.setText(value)
    } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
      if (value) field.check()
      else field.uncheck()
    } else if (field instanceof PDFDropdown && typeof value === 'string') {
      field.select(value)
    } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
      field.select(value)
    }
  }

  form.updateFieldAppearances()
  return doc.save({ useObjectStreams: true })
}