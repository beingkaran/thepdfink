import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { getPageCount, renderPdfPage } from '../lib/pdf'

interface PdfViewerProps {
  file: File
}

export function PdfViewer({ file }: PdfViewerProps) {
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPageCount(file).then((count) => {
      setTotal(count)
      setPage(1)
    })
  }, [file])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    renderPdfPage(file, page, scale).then((url) => {
      if (!cancelled) {
        setImageUrl(url)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [file, page, scale])

  return (
    <div className="pdf-viewer">
      <div className="viewer-toolbar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="viewer-page-info">
          Page {page} of {total}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Next page"
          disabled={page >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight size={18} />
        </button>
        <div className="viewer-zoom">
          <button
            type="button"
            className="icon-btn"
            aria-label="Zoom out"
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
          >
            <ZoomOut size={18} />
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Zoom in"
            onClick={() => setScale((s) => Math.min(2.4, s + 0.2))}
          >
            <ZoomIn size={18} />
          </button>
        </div>
      </div>
      <div className="viewer-canvas">
        {loading ? (
          <div className="viewer-loading">Loading page…</div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={`Page ${page}`} />
        ) : null}
      </div>
    </div>
  )
}