import { PDFDocument } from 'pdf-lib'

/**
 * Document-scanning helpers. Camera frames (or picked photos) are enhanced with
 * a canvas filter to look like a clean scan, then assembled into a PDF — all
 * on-device, nothing uploaded.
 */

export type ScanMode = 'auto' | 'grayscale' | 'bw' | 'color'

export const SCAN_MODES: { id: ScanMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'bw', label: 'B&W' },
  { id: 'color', label: 'Color' },
]

/** Enhance a source (video frame or image) into a cleaned-up canvas. */
export function enhanceToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  mode: ScanMode,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0, width, height)

  if (mode === 'color') {
    // Light contrast + saturation lift, keep colour.
    const img = ctx.getImageData(0, 0, width, height)
    applyContrast(img.data, 1.15, 8)
    ctx.putImageData(img, 0, 0)
    return canvas
  }

  const img = ctx.getImageData(0, 0, width, height)
  const data = img.data
  // Grayscale first.
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = data[i + 1] = data[i + 2] = g
  }

  if (mode === 'grayscale') {
    applyContrast(data, 1.2, 10)
  } else {
    // 'auto' and 'bw': push toward a paper-white background with dark ink.
    applyContrast(data, 1.6, 20)
    if (mode === 'bw') {
      const threshold = otsuThreshold(data)
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] > threshold ? 255 : 0
        data[i] = data[i + 1] = data[i + 2] = v
      }
    }
  }

  ctx.putImageData(img, 0, 0)
  return canvas
}

function applyContrast(data: Uint8ClampedArray, contrast: number, brightness: number) {
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = (data[i + c] - 128) * contrast + 128 + brightness
      data[i + c] = v < 0 ? 0 : v > 255 ? 255 : v
    }
  }
}

/** Otsu's method — pick the grayscale threshold that best separates ink from paper. */
function otsuThreshold(data: Uint8ClampedArray): number {
  const hist = new Array(256).fill(0)
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    hist[data[i]]++
    count++
  }
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]
  let sumB = 0
  let wB = 0
  let maxVar = 0
  let threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = count - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) {
      maxVar = between
      threshold = t
    }
  }
  return threshold
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      'image/jpeg',
      0.85,
    ),
  )
  return new Uint8Array(await blob.arrayBuffer())
}

/** Assemble enhanced page canvases into a single PDF (one page per canvas). */
export async function scannedCanvasesToPdf(canvases: HTMLCanvasElement[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const canvas of canvases) {
    const jpg = await doc.embedJpg(await canvasToJpegBytes(canvas))
    const page = doc.addPage([canvas.width, canvas.height])
    page.drawImage(jpg, { x: 0, y: 0, width: canvas.width, height: canvas.height })
  }
  return doc.save({ useObjectStreams: true })
}

/** Load a File (picked photo) into an HTMLImageElement. */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image.'))
    }
    img.src = url
  })
}
