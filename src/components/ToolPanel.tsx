import { useCallback, useEffect, useState } from 'react'
import { X, Download, Loader2 } from 'lucide-react'
import type { Tool } from '../data/tools'
import { FileDropzone } from './FileDropzone'
import { PageOrganizer } from './PageOrganizer'
import { TabbedPdfViewer } from './TabbedPdfViewer'
import { AnnotationEditor } from './AnnotationEditor'
import { FormFiller } from './FormFiller'
import { SignatureEditor } from './SignatureEditor'
import {
  mergePdfs,
  splitPdf,
  splitPdfEveryPage,
  rotatePdf,
  organizePdf,
  addWatermark,
  redactTextSecure,
  redactPatternsSecure,
  PII_PATTERNS,
  type PiiPatternId,
  findAndReplaceText,
  imagesToPdf,
  pdfToImages,
  compressPdf,
  readMetadata,
  updateMetadata,
  type PdfMetadata,
} from '../lib/pdf'
import { pdfToWord } from '../lib/pdf-to-word'
import { applyAnnotations, type Annotation } from '../lib/pdf-annotations'
import { fillFormFields } from '../lib/pdf-forms'
import { addImageSignature, type SignaturePlacement } from '../lib/pdf-signature'
import {
  baseName,
  dataUrlToBytes,
  downloadBlob,
  downloadUint8Array,
} from '../lib/download'

interface ToolPanelProps {
  tool: Tool
  onClose: () => void
}

const WIDE_TOOLS = new Set(['annotate', 'sign', 'organize', 'viewer'])

export function ToolPanel({ tool, onClose }: ToolPanelProps) {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [pageRange, setPageRange] = useState('1-')
  const [splitMode, setSplitMode] = useState<'range' | 'every'>('range')
  const [rotation, setRotation] = useState<90 | 180 | 270>(90)
  const [pageOrder, setPageOrder] = useState<number[]>([])
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3)
  const [redactQuery, setRedactQuery] = useState('')
  const [piiPatterns, setPiiPatterns] = useState<Set<PiiPatternId>>(
    () => new Set<PiiPatternId>(['email', 'phone', 'ssn', 'creditCard']),
  )
  const [customRegex, setCustomRegex] = useState('')
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({})
  const [hasFormFields, setHasFormFields] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [signaturePlacement, setSignaturePlacement] =
    useState<SignaturePlacement | null>(null)

  const handleFormValuesChange = useCallback(
    (values: Record<string, string | boolean>) => {
      setFormValues(values)
      setHasFormFields(Object.keys(values).length > 0)
    },
    [],
  )

  useEffect(() => {
    setFiles([])
    setError(null)
    setSuccess(null)
    setMetadata(null)
    setAnnotations([])
    setFormValues({})
    setHasFormFields(false)
    setSignatureDataUrl(null)
    setSignaturePlacement(null)
  }, [tool.id])

  useEffect(() => {
    if (tool.id !== 'metadata' || files.length !== 1) return
    readMetadata(files[0])
      .then(setMetadata)
      .catch(() => setError('Could not read PDF metadata.'))
  }, [tool.id, files])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async () => {
    setError(null)
    setSuccess(null)
    setProcessing(true)

    try {
      switch (tool.id) {
        case 'merge': {
          if (files.length < 2) throw new Error('Add at least two PDF files.')
          const bytes = await mergePdfs(files)
          await downloadUint8Array(bytes, 'merged.pdf')
          setSuccess('Merged PDF downloaded.')
          break
        }
        case 'split': {
          if (!files[0]) throw new Error('Add a PDF file.')
          const results =
            splitMode === 'every'
              ? await splitPdfEveryPage(files[0])
              : await splitPdf(files[0], pageRange)
          for (const { name, bytes } of results) {
            await downloadUint8Array(bytes, name)
          }
          setSuccess(`${results.length} file(s) downloaded.`)
          break
        }
        case 'rotate': {
          if (!files[0]) throw new Error('Add a PDF file.')
          const bytes = await rotatePdf(files[0], rotation)
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_rotated.pdf`)
          setSuccess('Rotated PDF downloaded.')
          break
        }
        case 'organize': {
          if (!files[0]) throw new Error('Add a PDF file.')
          if (!pageOrder.length) throw new Error('Wait for pages to load.')
          const bytes = await organizePdf(files[0], pageOrder)
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_organized.pdf`)
          setSuccess('Organized PDF downloaded.')
          break
        }
        case 'watermark': {
          if (!files[0]) throw new Error('Add a PDF file.')
          if (!watermarkText.trim()) throw new Error('Enter watermark text.')
          const bytes = await addWatermark(
            files[0],
            watermarkText.trim(),
            watermarkOpacity,
          )
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_watermarked.pdf`)
          setSuccess('Watermarked PDF downloaded.')
          break
        }
        case 'redact': {
          if (!files[0]) throw new Error('Add a PDF file.')
          if (!redactQuery.trim()) throw new Error('Enter text to redact.')
          const { bytes, matches } = await redactTextSecure(files[0], redactQuery.trim())
          if (matches === 0) throw new Error('No matching text found to redact.')
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_redacted.pdf`)
          setSuccess(`Redacted ${matches} match(es). The underlying text has been removed.`)
          break
        }
        case 'find-replace': {
          if (!files[0]) throw new Error('Add a PDF file.')
          if (!findQuery.trim()) throw new Error('Enter text to find.')
          const { bytes, replacements } = await findAndReplaceText(
            files[0],
            findQuery.trim(),
            replaceQuery,
            caseSensitive,
          )
          if (replacements === 0) {
            throw new Error('No matching text found in this PDF.')
          }
          await downloadUint8Array(
            bytes,
            `${baseName(files[0].name)}_replaced.pdf`,
          )
          setSuccess(
            `Replaced ${replacements} occurrence(s). PDF downloaded.`,
          )
          break
        }
        case 'annotate': {
          if (!files[0]) throw new Error('Add a PDF file.')
          if (!annotations.length) throw new Error('Add at least one annotation.')
          const bytes = await applyAnnotations(files[0], annotations)
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_annotated.pdf`)
          setSuccess('Annotated PDF downloaded.')
          break
        }
        case 'fill-form': {
          if (!files[0]) throw new Error('Add a PDF file.')
          if (!hasFormFields) throw new Error('No fillable fields found.')
          const bytes = await fillFormFields(files[0], formValues)
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_filled.pdf`)
          setSuccess('Filled PDF downloaded.')
          break
        }
        case 'sign': {
          if (!files[0]) throw new Error('Add a PDF file.')
          if (!signatureDataUrl) throw new Error('Create a signature first.')
          if (!signaturePlacement) throw new Error('Click the page to place your signature.')
          const pngBytes = dataUrlToBytes(signatureDataUrl)
          const bytes = await addImageSignature(
            files[0],
            pngBytes,
            signaturePlacement,
          )
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_signed.pdf`)
          setSuccess('Signed PDF downloaded.')
          break
        }
        case 'images-to-pdf': {
          if (!files.length) throw new Error('Add at least one image.')
          const bytes = await imagesToPdf(files)
          await downloadUint8Array(bytes, 'images.pdf')
          setSuccess('PDF created and downloaded.')
          break
        }
        case 'pdf-to-images': {
          if (!files[0]) throw new Error('Add a PDF file.')
          const images = await pdfToImages(files[0])
          const base = baseName(files[0].name)
          for (let i = 0; i < images.length; i++) {
            await downloadBlob(images[i], `${base}_page_${i + 1}.png`)
          }
          setSuccess(`${images.length} image(s) downloaded.`)
          break
        }
        case 'compress': {
          if (!files[0]) throw new Error('Add a PDF file.')
          const bytes = await compressPdf(files[0])
          const before = files[0].size
          const after = bytes.length
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_compressed.pdf`)
          const saved = Math.max(0, ((before - after) / before) * 100)
          setSuccess(
            `Compressed PDF downloaded. Size reduced by ${saved.toFixed(1)}%.`,
          )
          break
        }
        case 'metadata': {
          if (!files[0] || !metadata) throw new Error('Add a PDF file.')
          const bytes = await updateMetadata(files[0], metadata)
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_metadata.pdf`)
          setSuccess('PDF with updated metadata downloaded.')
          break
        }
        case 'pdf-to-word': {
          if (!files[0]) throw new Error('Add a PDF file.')
          const { bytes, empty } = await pdfToWord(files[0])
          if (empty) {
            throw new Error(
              'No selectable text found — this looks like a scan. Run OCR first, then convert.',
            )
          }
          await downloadUint8Array(bytes, `${baseName(files[0].name)}.docx`)
          setSuccess('Word document (.docx) downloaded.')
          break
        }
        case 'auto-redact': {
          if (!files[0]) throw new Error('Add a PDF file.')
          const selected = [...piiPatterns]
          if (!selected.length && !customRegex.trim()) {
            throw new Error('Select at least one type of data to redact.')
          }
          const { bytes, matches } = await redactPatternsSecure(
            files[0],
            selected,
            customRegex,
          )
          if (matches === 0) throw new Error('No matching data found to redact.')
          await downloadUint8Array(bytes, `${baseName(files[0].name)}_redacted.pdf`)
          setSuccess(`Redacted ${matches} match(es). The underlying data has been removed.`)
          break
        }
        default:
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setProcessing(false)
    }
  }

  const canProcess = (() => {
    if (tool.id === 'viewer') return files.length === 1
    if (tool.id === 'merge') return files.length >= 2
    if (tool.id === 'annotate') return files.length === 1 && annotations.length > 0
    if (tool.id === 'fill-form') return files.length === 1 && hasFormFields
    if (tool.id === 'sign')
      return files.length === 1 && !!signatureDataUrl && !!signaturePlacement
    return files.length > 0
  })()

  const Icon = tool.icon

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal ${WIDE_TOOLS.has(tool.id) ? 'modal-wide' : ''}`}
        role="dialog"
        aria-labelledby="tool-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-title">
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <div>
              <h2 id="tool-title">{tool.name}</h2>
              <p>{tool.description}</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <FileDropzone
            accept={tool.accept}
            multiple={tool.multiple}
            files={files}
            onFilesChange={setFiles}
          />

          {tool.id === 'split' && (
            <div className="tool-options">
              <fieldset>
                <legend>Split mode</legend>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="split-mode"
                    checked={splitMode === 'range'}
                    onChange={() => setSplitMode('range')}
                  />
                  Extract page range
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="split-mode"
                    checked={splitMode === 'every'}
                    onChange={() => setSplitMode('every')}
                  />
                  Split into individual pages
                </label>
              </fieldset>
              {splitMode === 'range' && (
                <label className="field">
                  <span>Page range</span>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8-10"
                  />
                  <small>Use commas for multiple ranges. Leave blank for all pages.</small>
                </label>
              )}
            </div>
          )}

          {tool.id === 'rotate' && (
            <div className="tool-options">
              <label className="field">
                <span>Rotation angle</span>
                <select
                  value={rotation}
                  onChange={(e) =>
                    setRotation(Number(e.target.value) as 90 | 180 | 270)
                  }
                >
                  <option value={90}>90° clockwise</option>
                  <option value={180}>180°</option>
                  <option value={270}>90° counter-clockwise</option>
                </select>
              </label>
            </div>
          )}

          {tool.id === 'organize' && files[0] && (
            <PageOrganizer
              file={files[0]}
              order={pageOrder}
              onOrderChange={setPageOrder}
            />
          )}

          {tool.id === 'watermark' && (
            <div className="tool-options">
              <label className="field">
                <span>Watermark text</span>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="CONFIDENTIAL"
                />
              </label>
              <label className="field">
                <span>Opacity ({Math.round(watermarkOpacity * 100)}%)</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                />
              </label>
            </div>
          )}

          {tool.id === 'redact' && (
            <div className="tool-options">
              <label className="field">
                <span>Text to redact</span>
                <input
                  type="text"
                  value={redactQuery}
                  onChange={(e) => setRedactQuery(e.target.value)}
                  placeholder="e.g. Social Security Number"
                />
                <small>
                  Matched pages are rasterised with the text burned out, so nothing can be
                  selected, searched or recovered. Other text becomes non-selectable on those pages.
                </small>
              </label>
            </div>
          )}

          {tool.id === 'auto-redact' && (
            <div className="tool-options">
              <fieldset>
                <legend>Detect &amp; remove</legend>
                {(Object.keys(PII_PATTERNS) as PiiPatternId[]).map((id) => (
                  <label key={id} className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={piiPatterns.has(id)}
                      onChange={(e) => {
                        setPiiPatterns((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(id)
                          else next.delete(id)
                          return next
                        })
                      }}
                    />
                    {PII_PATTERNS[id].label}
                  </label>
                ))}
              </fieldset>
              <label className="field">
                <span>Custom pattern (optional)</span>
                <input
                  type="text"
                  value={customRegex}
                  onChange={(e) => setCustomRegex(e.target.value)}
                  placeholder="Regular expression, e.g. \bINV-\d+\b"
                />
                <small>
                  Matches are rasterised out irreversibly — nothing redacted can be selected,
                  searched or recovered.
                </small>
              </label>
            </div>
          )}

          {tool.id === 'pdf-to-word' && (
            <div className="tool-options">
              <p className="ocr-note">
                Converts the PDF's text into an editable Word (.docx) document, entirely on your
                device. Layout is simplified to flowing paragraphs. Scanned PDFs need OCR first.
              </p>
            </div>
          )}

          {tool.id === 'find-replace' && (
            <div className="tool-options">
              <label className="field">
                <span>Find</span>
                <input
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Text to search for"
                />
              </label>
              <label className="field">
                <span>Replace with</span>
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replacement text (leave blank to delete)"
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                Case sensitive
              </label>
            </div>
          )}

          {tool.id === 'annotate' && files[0] && (
            <AnnotationEditor
              file={files[0]}
              annotations={annotations}
              onAnnotationsChange={setAnnotations}
            />
          )}

          {tool.id === 'fill-form' && files[0] && (
            <FormFiller
              file={files[0]}
              values={formValues}
              onValuesChange={handleFormValuesChange}
            />
          )}

          {tool.id === 'sign' && files[0] && (
            <SignatureEditor
              file={files[0]}
              placement={signaturePlacement}
              onPlacementChange={setSignaturePlacement}
              signatureDataUrl={signatureDataUrl}
              onSignatureDataUrlChange={(url) => {
                setSignatureDataUrl(url)
                setSignaturePlacement(null)
              }}
            />
          )}

          {tool.id === 'metadata' && metadata && (
            <div className="tool-options metadata-form">
              {(['title', 'author', 'subject', 'keywords'] as const).map(
                (key) => (
                  <label key={key} className="field">
                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <input
                      type="text"
                      value={metadata[key]}
                      onChange={(e) =>
                        setMetadata({ ...metadata, [key]: e.target.value })
                      }
                    />
                  </label>
                ),
              )}
              <p className="meta-readonly">
                {metadata.pageCount} pages · Creator: {metadata.creator || '—'}
              </p>
            </div>
          )}

          {tool.id === 'viewer' && files.length > 0 && (
            <TabbedPdfViewer files={files} onFilesChange={setFiles} />
          )}

          {error && <p className="feedback error">{error}</p>}
          {success && <p className="feedback success">{success}</p>}
        </div>

        {tool.id !== 'viewer' && (
          <footer className="modal-footer">
            <button
              type="button"
              className="btn primary"
              disabled={!canProcess || processing}
              onClick={run}
            >
              {processing ? (
                <>
                  <Loader2 size={18} className="spin" aria-hidden />
                  Processing…
                </>
              ) : (
                <>
                  <Download size={18} aria-hidden />
                  {tool.id === 'annotate'
                    ? 'Apply annotations & download'
                    : tool.id === 'sign'
                      ? 'Apply signature & download'
                      : 'Process & download'}
                </>
              )}
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}