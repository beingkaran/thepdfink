import { useEffect, useRef, useState } from 'react'
import { X, Bot, Loader2, SendHorizontal, FileText } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { buildDocIndex, askQuestion, type DocIndex, type Citation } from '../lib/ask'
import { resolveBackend, isLocalModelReady, getSelectedModel, type LoadProgress } from '../lib/llm'
import { ModelPicker } from './ModelPicker'

interface Props {
  tool: Tool
  onClose: () => void
}

interface Message {
  role: 'user' | 'assistant'
  text: string
  citations?: Citation[]
}

const SUGGESTIONS = [
  'What is this document about?',
  'What are the key points?',
  'Are there any dates or deadlines?',
]

export function AskPanel({ tool, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [index, setIndex] = useState<DocIndex | null>(null)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [thinking, setThinking] = useState(false)
  const [load, setLoad] = useState<LoadProgress | null>(null)
  const [modelId, setModelId] = useState(() => getSelectedModel().id)

  const chatRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const file = files[0] ?? null
  const backend = resolveBackend()
  const model = getSelectedModel()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Build the on-device index whenever a new file is dropped.
  useEffect(() => {
    setIndex(null)
    setMessages([])
    setError(null)
    if (!file) return
    let cancelled = false
    setBuilding(true)
    buildDocIndex(file)
      .then((idx) => {
        if (!cancelled) setIndex(idx)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not read the PDF.')
      })
      .finally(() => {
        if (!cancelled) setBuilding(false)
      })
    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => () => abortRef.current?.abort(), [])

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || !index || thinking) return
    setQuestion('')
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setThinking(true)
    setLoad(null)

    const ctrl = new AbortController()
    abortRef.current = ctrl
    // Placeholder assistant message we stream into.
    let placed = false
    const placeOrUpdate = (patch: Partial<Message>) => {
      setMessages((prev) => {
        if (!placed) {
          placed = true
          return [...prev, { role: 'assistant', text: '', ...patch }]
        }
        const next = [...prev]
        next[next.length - 1] = { ...next[next.length - 1], ...patch }
        return next
      })
    }

    try {
      const { answer, citations } = await askQuestion(index, q, {
        signal: ctrl.signal,
        onLoad: (p) => setLoad(p),
        onToken: (_d, full) => {
          setLoad(null)
          placeOrUpdate({ text: full })
        },
      })
      placeOrUpdate({ text: answer, citations })
    } catch (err) {
      if (!ctrl.signal.aborted) {
        placeOrUpdate({
          text: err instanceof Error ? err.message : 'Something went wrong answering that.',
        })
      }
    } finally {
      setLoad(null)
      setThinking(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal modal-wide ask-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-title">
            <Bot size={22} strokeWidth={1.75} aria-hidden />
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
          {!index && (
            <>
              <FileDropzone
                accept="application/pdf"
                multiple={false}
                files={files}
                onFilesChange={setFiles}
              />
              <p className="ocr-note">
                {backend === 'local'
                  ? isLocalModelReady(modelId)
                    ? `Answered by ${model.label} running in your browser — your document never leaves your device. Every answer cites its pages.`
                    : `A real AI model (${model.label}) reads your document and answers with page citations. First question downloads the model (${model.size}, one-time); after that it works offline and nothing is uploaded.`
                  : backend === 'cloud'
                    ? 'Your browser can’t run the on-device model, so answers are generated by our private cloud AI (up to 10 questions/day) — relevant excerpts of your document are sent to the model. Answers cite their pages.'
                    : 'Your document is indexed and searched entirely on your device (offline mode). Answers are drawn from the text with page citations.'}{' '}
                Works best on PDFs with selectable text.
              </p>
              {backend === 'local' && (
                <ModelPicker disabled={thinking} onChange={setModelId} />
              )}
              {building && (
                <p className="feedback">
                  <Loader2 size={16} className="spin" aria-hidden /> Reading your document…
                </p>
              )}
              {error && <p className="feedback error">{error}</p>}
            </>
          )}

          {index && (
            <div className="ask-shell">
              <div className="ask-docbar">
                <FileText size={15} aria-hidden />
                <span>{file?.name}</span>
                <small>
                  {index.pages} page{index.pages === 1 ? '' : 's'} ·{' '}
                  {index.words.toLocaleString()} words indexed
                </small>
                <button
                  type="button"
                  className="ask-change"
                  onClick={() => setFiles([])}
                >
                  Change
                </button>
              </div>

              <div className="ask-chat" ref={chatRef}>
                {messages.length === 0 && (
                  <div className="ask-empty">
                    <Bot size={30} strokeWidth={1.25} aria-hidden />
                    <p>Ask anything about this document.</p>
                    <div className="ask-suggest">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => ask(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`ask-msg ask-${m.role}`}>
                    <div className="ask-bubble">
                      {m.text.split('\n\n').map((para, j) => (
                        <p key={j}>{para}</p>
                      ))}
                      {m.citations && m.citations.length > 0 && (
                        <div className="ask-citations">
                          <span className="ask-cite-label">Sources</span>
                          {m.citations.map((c, k) => (
                            <span key={k} className="ask-cite" title={c.text}>
                              Page {c.page}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {thinking && messages[messages.length - 1]?.role === 'user' && (
                  <div className="ask-msg ask-assistant">
                    <div className="ask-bubble ask-typing">
                      <Loader2 size={16} className="spin" aria-hidden />{' '}
                      {load && load.progress < 1
                        ? `Loading model… ${Math.round(load.progress * 100)}%`
                        : 'Reading the document…'}
                    </div>
                    {load && load.progress < 1 && (
                      <div className="model-load-bar" style={{ marginTop: 8 }}>
                        <span style={{ width: `${Math.round(load.progress * 100)}%` }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {index && (
          <footer className="modal-footer ask-footer">
            <form
              className="ask-input-row"
              onSubmit={(e) => {
                e.preventDefault()
                ask(question)
              }}
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about this PDF…"
                aria-label="Your question"
              />
              <button
                type="submit"
                className="btn primary"
                disabled={!question.trim() || thinking}
                aria-label="Send"
              >
                <SendHorizontal size={18} aria-hidden />
              </button>
            </form>
          </footer>
        )}
      </div>
    </div>
  )
}
