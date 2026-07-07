import { useEffect, useRef, useState } from 'react'
import { X, Loader2, Sparkles, Copy, Check } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { summarizePdf, type SummaryResult, type SummaryLength } from '../lib/summarize'
import { resolveBackend, isLocalModelReady, getSelectedModel, type LoadProgress } from '../lib/llm'
import { ModelPicker } from './ModelPicker'

interface Props {
  tool: Tool
  onClose: () => void
}

const LENGTHS: { label: string; value: SummaryLength }[] = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Detailed', value: 'detailed' },
]

export function SummarizePanel({ tool, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [length, setLength] = useState<SummaryLength>('medium')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [streamed, setStreamed] = useState('')
  const [load, setLoad] = useState<LoadProgress | null>(null)
  const [copied, setCopied] = useState(false)
  const [modelId, setModelId] = useState(() => getSelectedModel().id)
  const abortRef = useRef<AbortController | null>(null)

  const backend = resolveBackend()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => () => abortRef.current?.abort(), [])

  const run = async () => {
    setError(null)
    setResult(null)
    setStreamed('')
    setLoad(null)
    if (!files[0]) return setError('Add a PDF.')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setProcessing(true)
    try {
      const res = await summarizePdf(files[0], {
        length,
        signal: ctrl.signal,
        onToken: (_d, full) => setStreamed(full),
        onLoad: (p) => setLoad(p),
      })
      setResult(res)
      setStreamed(res.summary)
    } catch (err) {
      if (!ctrl.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Could not summarise.')
      }
    } finally {
      setLoad(null)
      setProcessing(false)
    }
  }

  const copy = async () => {
    const text = result?.summary ?? streamed
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const model = getSelectedModel()
  const privacyNote =
    backend === 'local'
      ? isLocalModelReady(modelId)
        ? `Summarised on your device by ${model.label}, running in your browser — the text never leaves your device.`
        : `Runs a real AI model (${model.label}) in your browser. First use downloads it (${model.size}, one-time); after that it works offline and the text never leaves your device.`
      : backend === 'cloud'
        ? 'Your browser can’t run the on-device model, so this uses our private cloud AI. The document text is sent to our model to generate the summary.'
        : 'Summarised entirely on your device (offline mode) — best on PDFs with selectable text.'

  const showOutput = streamed || result

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
                    key={l.value}
                    type="button"
                    className={`seg${length === l.value ? ' seg-active' : ''}`}
                    onClick={() => setLength(l.value)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {backend === 'local' && (
              <ModelPicker disabled={processing} onChange={setModelId} />
            )}
          </div>

          <p className="ocr-note">{privacyNote}</p>

          {processing && load && load.progress < 1 && (
            <div className="model-load">
              <div className="model-load-bar">
                <span style={{ width: `${Math.round(load.progress * 100)}%` }} />
              </div>
              <small>{load.text || 'Loading model…'}</small>
            </div>
          )}

          {showOutput && (
            <div className="ocr-output">
              <div className="summary-meta">
                <span>
                  {result
                    ? `${result.originalWords.toLocaleString()} words → summary${result.mode === 'extractive' ? ' (offline)' : ''}`
                    : 'Generating…'}
                </span>
                <button type="button" className="copy-btn" onClick={copy}>
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
              <div className="summary-text">
                {streamed.split(/\n+/).map((line, i) =>
                  line.trim() ? <p key={i}>{line}</p> : null,
                )}
                {processing && !result && <span className="stream-caret" aria-hidden />}
              </div>
              {result?.keywords?.length ? (
                <div className="summary-keywords">
                  {result.keywords.map((k) => <span key={k}>{k}</span>)}
                </div>
              ) : null}
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
