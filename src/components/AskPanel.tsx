import { useEffect, useRef, useState } from 'react'
import { X, Bot, Loader2, SendHorizontal, FileText } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { buildDocIndex, answerQuestion, type DocIndex, type Citation } from '../lib/ask'

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

  const chatRef = useRef<HTMLDivElement>(null)
  const file = files[0] ?? null

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

  const ask = (text: string) => {
    const q = text.trim()
    if (!q || !index || thinking) return
    setQuestion('')
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setThinking(true)
    // Defer so the "thinking" state paints before the (synchronous) retrieval.
    setTimeout(() => {
      const { answer, citations } = answerQuestion(index, q)
      setMessages((prev) => [...prev, { role: 'assistant', text: answer, citations }])
      setThinking(false)
    }, 120)
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
                Your document is indexed and searched entirely on your device — nothing is uploaded,
                and there's no model to download. Answers are drawn from the text with page citations.
                Works best on PDFs with selectable text.
              </p>
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

                {thinking && (
                  <div className="ask-msg ask-assistant">
                    <div className="ask-bubble ask-typing">
                      <Loader2 size={16} className="spin" aria-hidden /> Searching the document…
                    </div>
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
