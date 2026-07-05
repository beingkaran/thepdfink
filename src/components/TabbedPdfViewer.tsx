import { useState } from 'react'
import { X } from 'lucide-react'
import { PdfViewer } from './PdfViewer'

interface TabbedPdfViewerProps {
  files: File[]
  onFilesChange?: (files: File[]) => void
}

function shortName(name: string) {
  return name.length > 22 ? `${name.slice(0, 19)}…` : name
}

export function TabbedPdfViewer({ files, onFilesChange }: TabbedPdfViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeFile = files[activeIndex] ?? files[0]

  const closeTab = (index: number) => {
    if (!onFilesChange || files.length <= 1) return
    const next = files.filter((_, i) => i !== index)
    onFilesChange(next)
    setActiveIndex((current) => {
      if (current > index) return current - 1
      if (current >= next.length) return Math.max(0, next.length - 1)
      return current
    })
  }

  if (!activeFile) return null

  return (
    <div className="tabbed-viewer">
      {files.length > 1 && (
        <div className="viewer-tabs" role="tablist">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className={`viewer-tab ${index === activeIndex ? 'active' : ''}`}
              role="presentation"
            >
              <button
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                className="viewer-tab-btn"
                onClick={() => setActiveIndex(index)}
                title={file.name}
              >
                {shortName(file.name)}
              </button>
              {onFilesChange && (
                <button
                  type="button"
                  className="viewer-tab-close"
                  aria-label={`Close ${file.name}`}
                  onClick={() => closeTab(index)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <PdfViewer key={`${activeFile.name}-${activeIndex}`} file={activeFile} />
    </div>
  )
}