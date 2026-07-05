import { useEffect, useState } from 'react'
import { X, Download, Loader2, Layers } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { runBatch, type BatchOp, type BatchProgress } from '../lib/batch'
import { downloadBlob } from '../lib/download'

interface Props {
  tool: Tool
  onClose: () => void
}

const OPS: { id: BatchOp; label: string }[] = [
  { id: 'compress', label: 'Compress each file' },
  { id: 'rotate', label: 'Rotate every page' },
  { id: 'watermark', label: 'Add a watermark' },
  { id: 'redact', label: 'Secure redact text' },
  { id: 'to-images', label: 'Export pages as images' },
  { id: 'merge', label: 'Merge all into one PDF' },
]

export function BatchPanel({ tool, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [op, setOp] = useState<BatchOp>('compress')
  const [angle, setAngle] = useState<90 | 180 | 270>(90)
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [redactQuery, setRedactQuery] = useState('')
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async () => {
    setError(null)
    setSuccess(null)
    if (files.length < 1) return setError('Add at least one PDF.')
    if (op === 'redact' && !redactQuery.trim()) return setError('Enter text to redact.')
    setProcessing(true)
    try {
      const result = await runBatch(
        files,
        op,
        { angle, watermarkText, redactQuery },
        setProgress,
      )
      await downloadBlob(result.blob, result.name)
      setSuccess(`Processed ${result.processed} file(s). Download ready.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch failed.')
    } finally {
      setProcessing(false)
      setProgress(null)
    }
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-title">
            <Layers size={22} strokeWidth={1.75} aria-hidden />
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
          <FileDropzone accept="application/pdf" multiple files={files} onFilesChange={setFiles} />

          <div className="tool-options">
            <label className="field">
              <span>Operation</span>
              <select value={op} onChange={(e) => setOp(e.target.value as BatchOp)}>
                {OPS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>

            {op === 'rotate' && (
              <label className="field">
                <span>Rotation angle</span>
                <select value={angle} onChange={(e) => setAngle(Number(e.target.value) as 90 | 180 | 270)}>
                  <option value={90}>90° clockwise</option>
                  <option value={180}>180°</option>
                  <option value={270}>90° counter-clockwise</option>
                </select>
              </label>
            )}
            {op === 'watermark' && (
              <label className="field">
                <span>Watermark text</span>
                <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} />
              </label>
            )}
            {op === 'redact' && (
              <label className="field">
                <span>Text to redact (removed from every file)</span>
                <input type="text" value={redactQuery} onChange={(e) => setRedactQuery(e.target.value)} placeholder="e.g. account number" />
                <small>Matching text is permanently rasterised out — not just covered.</small>
              </label>
            )}
          </div>

          {progress && (
            <div className="batch-progress">
              <div className="batch-bar"><span style={{ width: `${pct}%` }} /></div>
              <p>{progress.current} — {progress.done}/{progress.total}</p>
            </div>
          )}

          {error && <p className="feedback error">{error}</p>}
          {success && <p className="feedback success">{success}</p>}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn primary" disabled={!files.length || processing} onClick={run}>
            {processing ? (
              <><Loader2 size={18} className="spin" aria-hidden /> Processing {files.length} file(s)…</>
            ) : (
              <><Download size={18} aria-hidden /> Run on {files.length || 0} file(s)</>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
