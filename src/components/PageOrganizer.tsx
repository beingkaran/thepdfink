import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react'
import { getPageCount, renderPdfPage } from '../lib/pdf'

interface PageOrganizerProps {
  file: File
  order: number[]
  onOrderChange: (order: number[]) => void
}

export function PageOrganizer({ file, order, onOrderChange }: PageOrganizerProps) {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false

    async function load() {
      const count = await getPageCount(file)
      const initial = Array.from({ length: count }, (_, i) => i)
      onOrderChange(initial)

      for (let i = 1; i <= count; i++) {
        if (cancelled) return
        const url = await renderPdfPage(file, i, 0.35)
        setThumbnails((prev) => ({ ...prev, [i - 1]: url }))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [file, onOrderChange])

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return
    const next = [...order]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onOrderChange(next)
  }

  const duplicate = (index: number) => {
    const next = [...order]
    next.splice(index + 1, 0, order[index])
    onOrderChange(next)
  }

  const remove = (index: number) => {
    if (order.length <= 1) return
    onOrderChange(order.filter((_, i) => i !== index))
  }

  return (
    <div className="page-organizer">
      {order.map((pageIndex, index) => (
        <div key={`${pageIndex}-${index}`} className="page-card">
          <div className="page-thumb">
            {thumbnails[pageIndex] ? (
              <img src={thumbnails[pageIndex]} alt={`Page ${pageIndex + 1}`} />
            ) : (
              <div className="page-thumb-loading" />
            )}
          </div>
          <span className="page-label">Page {pageIndex + 1}</span>
          <div className="page-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => move(index, index - 1)}
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Move down"
              disabled={index === order.length - 1}
              onClick={() => move(index, index + 1)}
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Duplicate page"
              onClick={() => duplicate(index)}
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              aria-label="Delete page"
              disabled={order.length <= 1}
              onClick={() => remove(index)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}