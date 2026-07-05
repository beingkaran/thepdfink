import { useEffect, useState } from 'react'
import { X, Download, Loader2, ScanLine, FileText } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { ocrPdf, ocrImage, type OcrProgress } from '../lib/ocr'
import { downloadBlob, downloadUint8Array, baseName } from '../lib/download'

interface Props {
  tool: Tool
  onClose: () => void
}

export function OcrPanel({ tool, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<OcrProgress | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async () => {
    setError(null)
    setText(null)
    setPdfBytes(null)
    if (!files[0]) return setError('Add a PDF or image.')
    setProcessing(true)
    try {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        const t = await ocrImage(file, setProgress)
        setText(t)
      } else {
        const result = await ocrPdf(file, setProgress)
        setText(result.text)
        setPdfBytes(result.pdfBytes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed.')
    } finally {
      setProcessing(false)
      setProgress(null)
    }
  }

  const saveText = () => {
    if (!text) return
    const name = files[0] ? `${baseName(files[0].name)}.txt` : 'ocr.txt'
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), name)
  }

  const savePdf = () => {
    if (!pdfBytes || !files[0]) return
    downloadUint8Array(pdfBytes, `${baseName(files[0].name)}_searchable.pdf`)
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-title">
            <ScanLine size={22} strokeWidth={1.75} aria-hidden />
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
          <FileDropzone accept="application/pdf,image/*" multiple={false} files={files} onFilesChange={setFiles} />
          <p className="ocr-note">
            Recognition runs on your device. The engine and English language model download once
            (~15&nbsp;MB) and are cached — your file is never uploaded.
          </p>

          {progress && (
            <div className="batch-progress">
              <div className="batch-bar"><span style={{ width: `${Math.round(progress.progress * 100)}%` }} /></div>
              <p>{progress.status} — page {progress.page}/{progress.totalPages}</p>
            </div>
          )}

          {text !== null && (
            <div className="ocr-output">
              <label className="field">
                <span>Recognised text</span>
                <textarea value={text} readOnly rows={8} />
              </label>
            </div>
          )}

          {error && <p className="feedback error">{error}</p>}
        </div>

        <footer className="modal-footer ocr-footer">
          {text === null ? (
            <button type="button" className="btn primary" disabled={!files.length || processing} onClick={run}>
              {processing ? (
                <><Loader2 size={18} className="spin" aria-hidden /> Recognising…</>
              ) : (
                <><ScanLine size={18} aria-hidden /> Run OCR</>
              )}
            </button>
          ) : (
            <>
              {pdfBytes && (
                <button type="button" className="btn primary" onClick={savePdf}>
                  <Download size={18} aria-hidden /> Searchable PDF
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={saveText}>
                <FileText size={18} aria-hidden /> Download .txt
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
