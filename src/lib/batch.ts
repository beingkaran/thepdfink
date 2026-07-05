import JSZip from 'jszip'
import {
  compressPdf,
  rotatePdf,
  addWatermark,
  mergePdfs,
  pdfToImages,
  redactTextSecure,
} from './pdf'
import { baseName } from './download'

export type BatchOp =
  | 'compress'
  | 'rotate'
  | 'watermark'
  | 'redact'
  | 'to-images'
  | 'merge'

export interface BatchOptions {
  angle?: 90 | 180 | 270
  watermarkText?: string
  redactQuery?: string
}

export interface BatchResult {
  /** Suggested download filename. */
  name: string
  /** Zip (multi-file ops) or a single PDF blob (merge). */
  blob: Blob
  /** Number of input files processed. */
  processed: number
}

export interface BatchProgress {
  done: number
  total: number
  current: string
}

/**
 * Runs one operation across many files, reusing the single-file tools. Multi-file
 * results are bundled into a single .zip so the browser only prompts once.
 */
export async function runBatch(
  files: File[],
  op: BatchOp,
  opts: BatchOptions = {},
  onProgress?: (p: BatchProgress) => void,
): Promise<BatchResult> {
  if (op === 'merge') {
    onProgress?.({ done: 0, total: files.length, current: 'Merging…' })
    const bytes = await mergePdfs(files)
    onProgress?.({ done: files.length, total: files.length, current: 'Done' })
    return { name: 'merged.pdf', blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), processed: files.length }
  }

  const zip = new JSZip()

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const base = baseName(file.name)
    onProgress?.({ done: i, total: files.length, current: file.name })

    switch (op) {
      case 'compress': {
        const bytes = await compressPdf(file)
        zip.file(`${base}_compressed.pdf`, bytes as Uint8Array)
        break
      }
      case 'rotate': {
        const bytes = await rotatePdf(file, opts.angle ?? 90)
        zip.file(`${base}_rotated.pdf`, bytes as Uint8Array)
        break
      }
      case 'watermark': {
        const bytes = await addWatermark(file, opts.watermarkText || 'CONFIDENTIAL')
        zip.file(`${base}_watermarked.pdf`, bytes as Uint8Array)
        break
      }
      case 'redact': {
        const { bytes } = await redactTextSecure(file, (opts.redactQuery || '').trim())
        zip.file(`${base}_redacted.pdf`, bytes as Uint8Array)
        break
      }
      case 'to-images': {
        const images = await pdfToImages(file)
        for (let p = 0; p < images.length; p++) {
          zip.file(`${base}/page_${p + 1}.png`, images[p])
        }
        break
      }
    }
  }

  onProgress?.({ done: files.length, total: files.length, current: 'Zipping…' })
  const blob = await zip.generateAsync({ type: 'blob' })
  return { name: `thepdf-batch-${op}.zip`, blob, processed: files.length }
}
