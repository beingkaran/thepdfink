import { useEffect, useState } from 'react'
import { X, Loader2, Sparkles, Copy, Check } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { summarizePdf, type SummaryResult } from '../lib/summarize'

interface Props {
  tool: Tool
  onClose: () => void
}

const LENGTHS: { label: string; ratio: number }[] = [
  { label: 'Short', ratio: 0.12 },
  { label: 'Medium', ratio: 0.22 },
  { label: 'Detailed', ratio: 0.35 },
]

export function SummarizePanel({ tool, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [ratio, setRatio] = useState(0.22)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async () => {
    setError(null)
    setResult(null)
    if (!files[0]) return setError('Add a PDF.')
    setProcessing(true)
    try {
      setResult(await summarizePdf(files[0], ratio))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not summarise.')
    } finally {
      setProcessing(false)
    }
  }

  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-title">
            <Sparkles size={22} strokeWidth={1.75} aria-hidden />
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
          <FileDropzone accept="application/pdf" multiple={false} files={files} onFilesChange={setFiles} />

          <div className="tool-options">
            <fieldset>
              <legend>Summary length</legend>
              <div className="seg-group">
                {LENGTHS.map((l) => (
                  <button
                    key={l.label}
                    type="button"
                    className={`seg${ratio === l.ratio ? ' seg-active' : ''}`}
                    onClick={() => setRatio(l.ratio)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <p className="ocr-note">
            Summarised entirely on your device — the text is analysed locally and never sent anywhere.
            Best on PDFs with selectable text.
          </p>

          {result && (
            <div className="ocr-output">
              <div className="summary-meta">
                <span>{result.originalWords.toLocaleString()} words → {result.sentences.length} key sentences</span>
                <button type="button" className="copy-btn" onClick={copy}>
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
              <div className="summary-text">
                {result.sentences.map((s, i) => <p key={i}>{s}</p>)}
              </div>
              {result.keywords.length > 0 && (
                <div className="summary-keywords">
                  {result.keywords.map((k) => <span key={k}>{k}</span>)}
                </div>
              )}
            </div>
          )}

          {error && <p className="feedback error">{error}</p>}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn primary" disabled={!files.length || processing} onClick={run}>
            {processing ? (
              <><Loader2 size={18} className="spin" aria-hidden /> Summarising…</>
            ) : (
              <><Sparkles size={18} aria-hidden /> Summarise</>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
