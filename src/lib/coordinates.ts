/** Convert screen-space rect (top-left origin) to PDF coords (bottom-left origin). */
export function screenRectToPdf(
  rect: { x: number; y: number; width: number; height: number },
  overlayWidth: number,
  overlayHeight: number,
  pageWidth: number,
  pageHeight: number,
) {
  const scaleX = pageWidth / overlayWidth
  const scaleY = pageHeight / overlayHeight

  const pdfWidth = rect.width * scaleX
  const pdfHeight = rect.height * scaleY
  const pdfX = rect.x * scaleX
  const pdfY = pageHeight - rect.y * scaleY - pdfHeight

  return { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight }
}

/** Convert a screen click point to PDF coordinates for placement. */
export function screenPointToPdf(
  x: number,
  y: number,
  overlayWidth: number,
  overlayHeight: number,
  pageWidth: number,
  pageHeight: number,
) {
  const scaleX = pageWidth / overlayWidth
  const scaleY = pageHeight / overlayHeight
  return {
    x: x * scaleX,
    y: pageHeight - y * scaleY,
  }
}