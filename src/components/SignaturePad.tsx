import { useEffect, useRef, useState } from 'react'
import { PenLine, Type, Upload } from 'lucide-react'

export type SignatureMode = 'draw' | 'type' | 'upload'

interface SignaturePadProps {
  mode: SignatureMode
  onModeChange: (mode: SignatureMode) => void
  typedText: string
  onTypedTextChange: (text: string) => void
  onSignatureReady: (pngDataUrl: string | null) => void
}

export function SignaturePad({
  mode,
  onModeChange,
  typedText,
  onTypedTextChange,
  onSignatureReady,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1f2e'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setHasDrawn(false)
    onSignatureReady(null)
  }, [mode, onSignatureReady])

  useEffect(() => {
    if (mode === 'type' && typedText.trim()) {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 120
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#1a1f2e'
      ctx.font = 'italic 42px Georgia, serif'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedText, 16, canvas.height / 2)
      onSignatureReady(canvas.toDataURL('image/png'))
    } else if (mode === 'type') {
      onSignatureReady(null)
    }
  }, [mode, typedText, onSignatureReady])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
    onSignatureReady(canvas.toDataURL('image/png'))
  }

  const endDraw = () => {
    drawing.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onSignatureReady(null)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onSignatureReady(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="signature-pad">
      <div className="sig-mode-tabs">
        {(
          [
            { id: 'draw' as const, label: 'Draw', icon: PenLine },
            { id: 'type' as const, label: 'Type', icon: Type },
            { id: 'upload' as const, label: 'Upload', icon: Upload },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`sig-tab ${mode === id ? 'active' : ''}`}
            onClick={() => onModeChange(id)}
          >
            <Icon size={15} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {mode === 'draw' && (
        <div className="sig-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={400}
            height={120}
            className="sig-canvas"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <button
            type="button"
            className="sig-clear"
            onClick={clearCanvas}
            disabled={!hasDrawn}
          >
            Clear
          </button>
        </div>
      )}

      {mode === 'type' && (
        <label className="field">
          <span>Your signature</span>
          <input
            type="text"
            value={typedText}
            onChange={(e) => onTypedTextChange(e.target.value)}
            placeholder="Type your name"
          />
        </label>
      )}

      {mode === 'upload' && (
        <label className="sig-upload">
          <Upload size={20} aria-hidden />
          <span>Choose signature image (PNG/JPG)</span>
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </label>
      )}
    </div>
  )
}