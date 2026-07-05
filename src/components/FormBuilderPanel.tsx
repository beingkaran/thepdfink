import { useEffect, useRef, useState } from 'react'
import { X, Download, Loader2, FormInput, Type, CheckSquare, ChevronDown, Trash2 } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { getPageCount, getPageSize, renderPdfPage } from '../lib/pdf'
import { screenRectToPdf } from '../lib/coordinates'
import { buildForm, type BuilderField, type BuilderFieldType } from '../lib/pdf-form-builder'
import { baseName, downloadUint8Array } from '../lib/download'

interface Props {
  tool: Tool
  onClose: () => void
}

const FIELD_TYPES: { id: BuilderFieldType; label: string; icon: typeof Type }[] = [
  { id: 'text', label: 'Text field', icon: Type },
  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { id: 'dropdown', label: 'Dropdown', icon: ChevronDown },
]

export function FormBuilderPanel({ tool, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 })
  const [fieldType, setFieldType] = useState<BuilderFieldType>('text')
  const [fields, setFields] = useState<BuilderField[]>([])
  const [drawing, setDrawing] = useState(false)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const overlayRef = useRef<HTMLDivElement>(null)
  const file = files[0] ?? null
  const pageIndex = page - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!file) return
    getPageCount(file).then(setTotal)
    setFields([])
    setPage(1)
  }, [file])

  useEffect(() => {
    if (!file) return
    renderPdfPage(file, page, 1.4).then(setImageUrl)
    getPageSize(file, pageIndex).then(setPageSize)
  }, [file, page, pageIndex])

  const pointerDown = (e: React.MouseEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    setDrawing(true)
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setPreview({ x: e.clientX - rect.left, y: e.clientY - rect.top, width: 0, height: 0 })
  }

  const pointerMove = (e: React.MouseEvent) => {
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

  const pointerUp = () => {
    if (!drawing || !preview) return reset()
    const overlay = overlayRef.current!
    const minH = fieldType === 'checkbox' ? 12 : 16
    if (preview.width < 12 || preview.height < 8) return reset()
    const pdfRect = screenRectToPdf(
      preview,
      overlay.clientWidth,
      overlay.clientHeight,
      pageSize.width,
      pageSize.height,
    )
    const count = fields.filter((f) => f.type === fieldType).length + 1
    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        pageIndex,
        type: fieldType,
        name: `${fieldType}${count}`,
        x: pdfRect.x,
        y: pdfRect.y,
        width: pdfRect.width,
        height: Math.max(pdfRect.height, minH),
        options: fieldType === 'dropdown' ? ['Option 1', 'Option 2'] : undefined,
      },
    ])
    reset()
  }

  const reset = () => {
    setDrawing(false)
    setStart(null)
    setPreview(null)
  }

  const updateField = (id: string, patch: Partial<BuilderField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id))

  const apply = async () => {
    if (!file) return
    setError(null)
    setSuccess(null)
    if (!fields.length) return setError('Draw at least one field on the page.')
    setProcessing(true)
    try {
      const bytes = await buildForm(file, fields)
      await downloadUint8Array(bytes, `${baseName(file.name)}_form.pdf`)
      setSuccess(`Added ${fields.length} fillable field(s). PDF downloaded.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the form.')
    } finally {
      setProcessing(false)
    }
  }

  const overlay = overlayRef.current
  const sx = overlay ? overlay.clientWidth / pageSize.width : 1
  const sy = overlay ? overlay.clientHeight / pageSize.height : 1
  const overlayH = overlay?.clientHeight ?? 0
  const pageFields = fields.filter((f) => f.pageIndex === pageIndex)

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-title">
            <FormInput size={22} strokeWidth={1.75} aria-hidden />
            <div>
              <h2>{tool.name}</h2>
              <p>{tool.description}</p>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <FileDropzone
            accept="application/pdf"
            multiple={false}
            files={files}
            onFilesChange={setFiles}
          />

          {file && (
            <>
              <div className="ann-toolbar">
                <div className="ann-tools">
                  {FIELD_TYPES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`ann-tool ${fieldType === id ? 'active' : ''}`}
                      onClick={() => setFieldType(id)}
                    >
                      <Icon size={15} aria-hidden /> {label}
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

              <p className="ann-hint">
                Drag on the page to draw a {fieldType} field where it should appear.
              </p>

              <div className="ann-canvas">
                {imageUrl && (
                  <div
                    ref={overlayRef}
                    className="ann-overlay"
                    onMouseDown={pointerDown}
                    onMouseMove={pointerMove}
                    onMouseUp={pointerUp}
                    onMouseLeave={pointerUp}
                  >
                    <img src={imageUrl} alt={`Page ${page}`} draggable={false} />
                    {pageFields.map((f) => (
                      <div
                        key={f.id}
                        className={`form-field-box form-${f.type}`}
                        style={{
                          left: f.x * sx,
                          top: overlayH - (f.y + f.height) * sy,
                          width: f.width * sx,
                          height: f.height * sy,
                        }}
                      >
                        <span>{f.name}</span>
                      </div>
                    ))}
                    {preview && (
                      <div
                        className="ann-preview"
                        style={{
                          left: preview.x,
                          top: preview.y,
                          width: preview.width,
                          height: preview.height,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {pageFields.length > 0 && (
                <ul className="form-field-list">
                  {pageFields.map((f) => (
                    <li key={f.id}>
                      <span className="form-field-type">{f.type}</span>
                      <input
                        type="text"
                        className="form-field-name"
                        value={f.name}
                        onChange={(e) => updateField(f.id, { name: e.target.value })}
                        aria-label="Field name"
                      />
                      {f.type === 'dropdown' && (
                        <input
                          type="text"
                          className="form-field-options"
                          value={(f.options ?? []).join(', ')}
                          onChange={(e) =>
                            updateField(f.id, {
                              options: e.target.value.split(',').map((o) => o.trim()),
                            })
                          }
                          placeholder="Option 1, Option 2"
                          aria-label="Dropdown options"
                        />
                      )}
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label="Remove field"
                        onClick={() => removeField(f.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && <p className="feedback error">{error}</p>}
              {success && <p className="feedback success">{success}</p>}
            </>
          )}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="btn primary"
            disabled={!file || processing || !fields.length}
            onClick={apply}
          >
            {processing ? (
              <>
                <Loader2 size={18} className="spin" aria-hidden /> Building…
              </>
            ) : (
              <>
                <Download size={18} aria-hidden /> Build form &amp; download
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
