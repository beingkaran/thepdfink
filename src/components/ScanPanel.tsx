import { useEffect, useRef, useState } from 'react'
import { X, Download, Loader2, Camera, Trash2, ImagePlus } from 'lucide-react'
import type { Tool } from '../data/tools'
import {
  enhanceToCanvas,
  scannedCanvasesToPdf,
  fileToImage,
  SCAN_MODES,
  type ScanMode,
} from '../lib/scan'
import { downloadUint8Array } from '../lib/download'

interface Props {
  tool: Tool
  onClose: () => void
}

interface Page {
  id: string
  /** Full-resolution captured frame, re-enhanced on demand. */
  source: HTMLCanvasElement
  width: number
  height: number
  preview: string
}

export function ScanPanel({ tool, onClose }: Props) {
  const [mode, setMode] = useState<ScanMode>('auto')
  const [pages, setPages] = useState<Page[]>([])
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch {
      setCameraError('Camera unavailable — add photos from your device instead.')
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose])

  // Re-render previews whenever the enhancement mode changes.
  useEffect(() => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        preview: enhanceToCanvas(p.source, p.width, p.height, mode).toDataURL('image/jpeg', 0.7),
      })),
    )
  }, [mode])

  const addSource = (source: CanvasImageSource, width: number, height: number) => {
    const raw = document.createElement('canvas')
    raw.width = width
    raw.height = height
    raw.getContext('2d')!.drawImage(source, 0, 0, width, height)
    const preview = enhanceToCanvas(raw, width, height, mode).toDataURL('image/jpeg', 0.7)
    setPages((prev) => [...prev, { id: crypto.randomUUID(), source: raw, width, height, preview }])
  }

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    addSource(video, video.videoWidth, video.videoHeight)
  }

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const file of files) {
      try {
        const img = await fileToImage(file)
        addSource(img, img.naturalWidth, img.naturalHeight)
      } catch {
        setError('One of the images could not be read.')
      }
    }
    e.target.value = ''
  }

  const removePage = (id: string) => setPages((prev) => prev.filter((p) => p.id !== id))

  const exportPdf = async () => {
    setError(null)
    setSuccess(null)
    if (!pages.length) return setError('Capture or add at least one page.')
    setProcessing(true)
    try {
      const canvases = pages.map((p) => enhanceToCanvas(p.source, p.width, p.height, mode))
      const bytes = await scannedCanvasesToPdf(canvases)
      await downloadUint8Array(bytes, 'scan.pdf')
      setSuccess(`Scanned ${pages.length} page(s) to PDF.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the PDF.')
    } finally {
      setProcessing(false)
    }
  }

  const close = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={close} role="presentation">
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-title">
            <Camera size={22} strokeWidth={1.75} aria-hidden />
            <div>
              <h2>{tool.name}</h2>
              <p>{tool.description}</p>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="scan-stage">
            {cameraOn ? (
              <video ref={videoRef} className="scan-video" playsInline muted />
            ) : (
              <div className="scan-placeholder">
                <Camera size={40} strokeWidth={1.25} aria-hidden />
                <p>Use your camera or add photos to scan.</p>
                {cameraError && <p className="feedback error">{cameraError}</p>}
              </div>
            )}
          </div>

          <div className="scan-controls">
            {cameraOn ? (
              <>
                <button type="button" className="btn primary" onClick={capture}>
                  <Camera size={18} aria-hidden /> Capture page
                </button>
                <button type="button" className="btn btn-ghost" onClick={stopCamera}>
                  Stop camera
                </button>
              </>
            ) : (
              <button type="button" className="btn primary" onClick={startCamera}>
                <Camera size={18} aria-hidden /> Start camera
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={18} aria-hidden /> Add photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={onPickFiles}
            />
          </div>

          <div className="tool-options">
            <fieldset>
              <legend>Enhancement</legend>
              <div className="scan-modes">
                {SCAN_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`ann-tool ${mode === m.id ? 'active' : ''}`}
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {pages.length > 0 && (
            <div className="scan-pages">
              {pages.map((p, i) => (
                <div key={p.id} className="scan-thumb">
                  <img src={p.preview} alt={`Page ${i + 1}`} />
                  <span className="scan-thumb-num">{i + 1}</span>
                  <button
                    type="button"
                    className="icon-btn danger scan-thumb-del"
                    aria-label={`Remove page ${i + 1}`}
                    onClick={() => removePage(p.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="feedback error">{error}</p>}
          {success && <p className="feedback success">{success}</p>}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="btn primary"
            disabled={!pages.length || processing}
            onClick={exportPdf}
          >
            {processing ? (
              <>
                <Loader2 size={18} className="spin" aria-hidden /> Building PDF…
              </>
            ) : (
              <>
                <Download size={18} aria-hidden /> Save {pages.length || ''} page
                {pages.length === 1 ? '' : 's'} as PDF
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
