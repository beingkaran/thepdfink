import { saveAs } from 'file-saver'
import { isTauri } from './platform'

export async function downloadBlob(blob: Blob, filename: string) {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    const path = await save({
      defaultPath: filename,
      filters: [{ name: 'File', extensions: [filename.split('.').pop() || '*'] }],
    })
    if (path) {
      await writeFile(path, new Uint8Array(await blob.arrayBuffer()))
    }
    return
  }
  saveAs(blob, filename)
}

export async function downloadUint8Array(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes)
  const type = filename.endsWith('.pdf')
    ? 'application/pdf'
    : filename.endsWith('.png')
      ? 'image/png'
      : filename.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream'
  await downloadBlob(new Blob([copy], { type }), filename)
}

export function baseName(filename: string) {
  return filename.replace(/\.[^/.]+$/, '')
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}