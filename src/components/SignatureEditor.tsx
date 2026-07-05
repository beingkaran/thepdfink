import { useEffect, useRef, useState } from 'react'
import { getPageCount, getPageSize, renderPdfPage } from '../lib/pdf'
import { screenPointToPdf } from '../lib/coordinates'
import type { SignaturePlacement } from '../lib/pdf-signature'
import { SignaturePad, type SignatureMode } from './SignaturePad'

interface SignatureEditorProps {
  file: File
  placement: SignaturePlacement | null
  onPlacementChange: (placement: SignaturePlacement | null) => void
  signatureDataUrl: string | null
  onSignatureDataUrlChange: (url: string | null) => void
}

export function SignatureEditor({
  file,
  placement,
  onPlacementChange,
  signatureDataUrl,
  onSignatureDataUrlChange,
}: SignatureEditorProps) {
  const [mode, setMode] = useState<SignatureMode>('draw')
  const [typedText, setTypedText] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 })
  const overlayRef = useRef<HTMLDivElement>(null)

  const sigWidth = 160
  const sigHeight = 50

  useEffect(() => {
    getPageCount(file).then(setTotal)
  }, [file])

  useEffect(() => {
    renderPdfPage(file, page, 1).then(setImageUrl)
    getPageSize(file, page - 1).then(setPageSize)
  }, [file, page])

  const handlePlace = (e: React.MouseEvent) => {
    if (!signatureDataUrl) return
    const overlay = overlayRef.current
    if (!overlay) return

    const rect = overlay.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const pdfPoint = screenPointToPdf(
      clickX,
      clickY,
      overlay.clientWidth,
      overlay.clientHeight,
      pageSize.width,
      pageSize.height,
    )

    const scaleX = pageSize.width / overlay.clientWidth
    const scaleY = pageSize.height / overlay.clientHeight

    onPlacementChange({
      pageIndex: page - 1,
      x: pdfPoint.x - (sigWidth * scaleX) / 2,
      y: pdfPoint.y - (sigHeight * scaleY) / 2,
      width: sigWidth * scaleX,
      height: sigHeight * scaleY,
    })
  }

  const screenPlacement = placement &&
    placement.pageIndex === page - 1 &&
    overlayRef.current
      ? (() => {
          const overlay = overlayRef.current!
          const scaleX = overlay.clientWidth / pageSize.width
          const scaleY = overlay.clientHeight / pageSize.height
          return {
            left: placement.x * scaleX,
            top:
              overlay.clientHeight -
              (placement.y + placement.height) * scaleY,
            width: placement.width * scaleX,
            height: placement.height * scaleY,
          }
        })()
      : null

  return (
    <div className="signature-editor">
      <SignaturePad
        mode={mode}
        onModeChange={setMode}
        typedText={typedText}
        onTypedTextChange={setTypedText}
        onSignatureReady={onSignatureDataUrlChange}
      />

      {signatureDataUrl && (
        <>
          <div className="sig-place-header">
            <p>Click on the page to place your signature</p>
            <div className="ann-page-nav">
              <button
                type="button"
                className="icon-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span>
                Page {page} / {total}
              </span>
              <button
                type="button"
                className="icon-btn"
                disabled={page >= total}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>

          <div className="ann-canvas">
            {imageUrl && (
              <div
                ref={overlayRef}
                className="ann-overlay sig-overlay"
                onClick={handlePlace}
              >
                <img src={imageUrl} alt={`Page ${page}`} draggable={false} />
                {screenPlacement && (
                  <img
                    src={signatureDataUrl}
                    alt="Signature placement"
                    className="sig-placement-preview"
                    style={{
                      left: screenPlacement.left,
                      top: screenPlacement.top,
                      width: screenPlacement.width,
                      height: screenPlacement.height,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}