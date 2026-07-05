import { useEffect, useRef, useState } from 'react'
import { Highlighter, Underline, MessageSquare, Trash2 } from 'lucide-react'
import { getPageCount, getPageSize, renderPdfPage } from '../lib/pdf'
import { screenRectToPdf } from '../lib/coordinates'
import type { Annotation, AnnotationType } from '../lib/pdf-annotations'

interface AnnotationEditorProps {
  file: File
  annotations: Annotation[]
  onAnnotationsChange: (annotations: Annotation[]) => void
}

export function AnnotationEditor({
  file,
  annotations,
  onAnnotationsChange,
}: AnnotationEditorProps) {
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [tool, setTool] = useState<AnnotationType>('highlight')
  const [drawing, setDrawing] = useState(false)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 })
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getPageCount(file).then(setTotal)
  }, [file])

  useEffect(() => {
    renderPdfPage(file, page, 1).then(setImageUrl)
    getPageSize(file, page - 1).then(setPageSize)
  }, [file, page])

  const pageAnnotations = annotations.filter((a) => a.pageIndex === page - 1)

  const addAnnotation = (
    rect: { x: number; y: number; width: number; height: number },
    text?: string,
  ) => {
    const overlay = overlayRef.current
    if (!overlay) return

    const pdfRect = screenRectToPdf(
      rect,
      overlay.clientWidth,
      overlay.clientHeight,
      pageSize.width,
      pageSize.height,
    )

    const ann: Annotation = {
      id: crypto.randomUUID(),
      pageIndex: page - 1,
      type: tool,
      ...pdfRect,
      text,
    }

    onAnnotationsChange([...annotations, ann])
  }

  const handlePointerDown = (e: React.MouseEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'comment') {
      const comment = window.prompt('Enter your comment:')
      if (comment?.trim()) {
        addAnnotation({ x, y, width: 200, height: 30 }, comment.trim())
      }
      return
    }

    setDrawing(true)
    setStart({ x, y })
    setPreview({ x, y, width: 0, height: 0 })
  }

  const handlePointerMove = (e: React.MouseEvent) => {
    if (!drawing || !start) return
    const rect = overlayRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPreview({
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
    })
  }

  const handlePointerUp = () => {
    if (!drawing || !preview || preview.width < 4 || preview.height < 4) {
      setDrawing(false)
      setStart(null)
      setPreview(null)
      return
    }

    if (tool === 'underline') {
      addAnnotation({
        x: preview.x,
        y: preview.y + preview.height - 4,
        width: preview.width,
        height: 4,
      })
    } else {
      addAnnotation(preview)
    }

    setDrawing(false)
    setStart(null)
    setPreview(null)
  }

  const removeAnnotation = (id: string) => {
    onAnnotationsChange(annotations.filter((a) => a.id !== id))
  }

  return (
    <div className="annotation-editor">
      <div className="ann-toolbar">
        <div className="ann-tools">
          {(
            [
              { id: 'highlight' as const, label: 'Highlight', icon: Highlighter },
              { id: 'underline' as const, label: 'Underline', icon: Underline },
              { id: 'comment' as const, label: 'Comment', icon: MessageSquare },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`ann-tool ${tool === id ? 'active' : ''}`}
              onClick={() => setTool(id)}
            >
              <Icon size={15} aria-hidden />
              {label}
            </button>
          ))}
        </div>
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
            className="ann-overlay"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
          >
            <img src={imageUrl} alt={`Page ${page}`} draggable={false} />
            {preview && (
              <div
                className={`ann-preview ann-preview-${tool}`}
                style={{
                  left: preview.x,
                  top: preview.y,
                  width: preview.width,
                  height: tool === 'underline' ? 3 : preview.height,
                }}
              />
            )}
          </div>
        )}
      </div>

      {pageAnnotations.length > 0 && (
        <ul className="ann-list">
          {pageAnnotations.map((ann) => (
            <li key={ann.id}>
              <span>
                {ann.type}
                {ann.text ? `: ${ann.text}` : ''}
              </span>
              <button
                type="button"
                className="icon-btn danger"
                aria-label="Remove annotation"
                onClick={() => removeAnnotation(ann.id)}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="ann-hint">
        {tool === 'comment'
          ? 'Click anywhere on the page to add a comment.'
          : 'Click and drag to mark text on this page.'}
      </p>
    </div>
  )
}