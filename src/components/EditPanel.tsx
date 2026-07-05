import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Download, Loader2, TextCursorInput, ImagePlus, Check } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { getPageCount, getPageSize, renderPdfPage } from '../lib/pdf'
import {
  extractEditableText,
  applyPdfEdits,
  type EditableTextItem,
  type TextEdit,
  type ImageInsert,
} from '../lib/pdf-edit'
import { baseName, downloadUint8Array } from '../lib/download'

interface Props {
  tool: Tool
  onClose: () => void
}

/** Stable identity for a run across re-extraction, so edits survive page nav. */
function sig(pageIndex: number, item: { x: number; y: number; text: string }) {
  return `${pageIndex}:${Math.round(item.x)}:${Math.round(item.y)}:${item.text}`
}

interface PlacedImage extends ImageInsert {
  id: string
  url: string
}

export function EditPanel({ tool, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 })
  const [items, setItems] = useState<EditableTextItem[]>([])
  const [edits, setEdits] = useState<Map<string, TextEdit>>(new Map())
  const [images, setImages] = useState<PlacedImage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [pendingImage, setPendingImage] = useState<{
    bytes: Uint8Array
    isPng: boolean
    aspect: number
  } | null>(null)

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const overlayRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    setEdits(new Map())
    setImages([])
    setPage(1)
  }, [file])

  useEffect(() => {
    if (!file) return
    setSelectedId(null)
    renderPdfPage(file, page, 1.4).then(setImageUrl)
    getPageSize(file, pageIndex).then(setPageSize)
    extractEditableText(file, pageIndex).then(setItems)
  }, [file, page, pageIndex])

  const overlayScale = () => {
    const overlay = overlayRef.current
    if (!overlay) return { sx: 1, sy: 1, w: pageSize.width, h: pageSize.height }
    return {
      sx: overlay.clientWidth / pageSize.width,
      sy: overlay.clientHeight / pageSize.height,
      w: overlay.clientWidth,
      h: overlay.clientHeight,
    }
  }

  const textFor = (item: EditableTextItem) => {
    const edit = edits.get(sig(pageIndex, item))
    return edit ? edit.newText : item.text
  }

  const selectItem = (item: EditableTextItem) => {
    if (pendingImage) return
    setSelectedId(item.id)
    setDraftText(textFor(item))
  }

  const commitEdit = () => {
    const item = items.find((it) => it.id === selectedId)
    if (!item) return
    const key = sig(pageIndex, item)
    setEdits((prev) => {
      const next = new Map(prev)
      if (draftText === item.text) next.delete(key)
      else next.set(key, { ...item, pageIndex, newText: draftText })
      return next
    })
    setSelectedId(null)
  }

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    const bytes = new Uint8Array(await picked.arrayBuffer())
    const isPng = picked.type === 'image/png'
    if (!isPng && picked.type !== 'image/jpeg') {
      setError('Please choose a PNG or JPG image.')
      return
    }
    const url = URL.createObjectURL(picked)
    const img = new window.Image()
    img.onload = () => {
      setPendingImage({ bytes, isPng, aspect: img.naturalWidth / img.naturalHeight || 1 })
      URL.revokeObjectURL(url)
    }
    img.src = url
    setSelectedId(null)
  }

  const placeImage = (e: React.MouseEvent) => {
    if (!pendingImage || !overlayRef.current) return
    const rect = overlayRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const { sx, sy } = overlayScale()
    const width = pageSize.width * 0.3
    const height = width / pendingImage.aspect
    const pdfX = clickX / sx
    const pdfTop = pageSize.height - clickY / sy
    const pdfY = pdfTop - height
    const previewUrl = URL.createObjectURL(
      new Blob([new Uint8Array(pendingImage.bytes)], {
        type: pendingImage.isPng ? 'image/png' : 'image/jpeg',
      }),
    )
    setImages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        pageIndex,
        x: pdfX,
        y: pdfY,
        width,
        height,
        bytes: pendingImage.bytes,
        isPng: pendingImage.isPng,
        url: previewUrl,
      },
    ])
    setPendingImage(null)
  }

  const onOverlayClick = (e: React.MouseEvent) => {
    if (pendingImage) placeImage(e)
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((i) => i.id !== id)
    })
  }

  const apply = async () => {
    if (!file) return
    setError(null)
    setSuccess(null)
    if (!edits.size && !images.length) {
      return setError('Edit some text or add an image first.')
    }
    setProcessing(true)
    try {
      const bytes = await applyPdfEdits(
        file,
        [...edits.values()],
        images.map(({ pageIndex: pi, x, y, width, height, bytes: b, isPng }) => ({
          pageIndex: pi,
          x,
          y,
          width,
          height,
          bytes: b,
          isPng,
        })),
      )
      await downloadUint8Array(bytes, `${baseName(file.name)}_edited.pdf`)
      setSuccess('Edited PDF downloaded.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save edits.')
    } finally {
      setProcessing(false)
    }
  }

  const { sx, sy, h } = overlayScale()
  const editCount = edits.size + images.length

  const pageImages = useMemo(
    () => images.filter((i) => i.pageIndex === pageIndex),
    [images, pageIndex],
  )

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
            <TextCursorInput size={22} strokeWidth={1.75} aria-hidden />
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
                  <button
                    type="button"
                    className="ann-tool"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={15} aria-hidden /> Add image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    hidden
                    onChange={onPickImage}
                  />
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
                {pendingImage
                  ? 'Click on the page to drop the image.'
                  : 'Click any text to edit it in place. Font and size are matched automatically.'}
              </p>

              <div className="ann-canvas">
                {imageUrl && (
                  <div
                    ref={overlayRef}
                    className={`ann-overlay ${pendingImage ? 'edit-placing' : ''}`}
                    onClick={onOverlayClick}
                  >
                    <img src={imageUrl} alt={`Page ${page}`} draggable={false} />
                    {items.map((item) => {
                      const edited = edits.has(sig(pageIndex, item))
                      const left = item.x * sx
                      const top = h - (item.y + item.height) * sy
                      const width = Math.max(item.width * sx, 6)
                      const height = Math.max(item.height * sy, 10)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`edit-text-box ${edited ? 'edited' : ''} ${
                            selectedId === item.id ? 'active' : ''
                          }`}
                          style={{ left, top, width, height }}
                          onClick={(e) => {
                            e.stopPropagation()
                            selectItem(item)
                          }}
                          aria-label={`Edit text: ${item.text}`}
                        />
                      )
                    })}
                    {pageImages.map((img) => (
                      <img
                        key={img.id}
                        src={img.url}
                        alt="Inserted"
                        className="edit-placed-image"
                        style={{
                          left: img.x * sx,
                          top: h - (img.y + img.height) * sy,
                          width: img.width * sx,
                          height: img.height * sy,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {selectedId && (
                <div className="tool-options edit-inline">
                  <label className="field">
                    <span>Replace text</span>
                    <input
                      type="text"
                      value={draftText}
                      autoFocus
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                    />
                  </label>
                  <button type="button" className="btn primary" onClick={commitEdit}>
                    <Check size={16} aria-hidden /> Apply
                  </button>
                </div>
              )}

              {pageImages.length > 0 && (
                <ul className="ann-list">
                  {pageImages.map((img, i) => (
                    <li key={img.id}>
                      <span>Image {i + 1} on this page</span>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label="Remove image"
                        onClick={() => removeImage(img.id)}
                      >
                        <X size={14} />
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
            disabled={!file || processing || editCount === 0}
            onClick={apply}
          >
            {processing ? (
              <>
                <Loader2 size={18} className="spin" aria-hidden /> Saving…
              </>
            ) : (
              <>
                <Download size={18} aria-hidden /> Apply {editCount || ''} edit
                {editCount === 1 ? '' : 's'} &amp; download
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
