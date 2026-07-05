import { useCallback, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

interface FileDropzoneProps {
  accept: string
  multiple: boolean
  files: File[]
  onFilesChange: (files: File[]) => void
  label?: string
}

export function FileDropzone({
  accept,
  multiple,
  files,
  onFilesChange,
  label = 'Drop files here or click to browse',
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = [...incoming]
      if (!multiple) {
        onFilesChange(list.slice(0, 1))
        return
      }
      onFilesChange([...files, ...list])
    },
    [files, multiple, onFilesChange],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <Upload size={28} strokeWidth={1.5} aria-hidden />
        <p>{label}</p>
        <span className="dropzone-hint">
          {multiple ? 'Multiple files supported' : 'Single file only'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <span className="file-name">{file.name}</span>
              <span className="file-size">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}