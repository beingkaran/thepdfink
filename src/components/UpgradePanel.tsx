import { useEffect } from 'react'
import { X, Check, Sparkles } from 'lucide-react'
import type { Tool } from '../data/tools'

interface UpgradePanelProps {
  tool: Tool
  onClose: () => void
  /** Starts the sign-in → checkout flow. */
  onUnlock: () => void
}

const PRO_PERKS = [
  'OCR — make scanned PDFs searchable',
  'Batch & bulk processing',
  'Secure, irreversible redaction',
  'AI: summarise & ask your PDF (on-device)',
  'Everything in Personal, on every device',
]

export function UpgradePanel({ tool, onClose, onUnlock }: UpgradePanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Icon = tool.icon

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal upgrade-modal"
        role="dialog"
        aria-labelledby="upgrade-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-title">
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <div>
              <h2 id="upgrade-title">{tool.name}</h2>
              <p>{tool.soon ? 'Coming soon with Pro' : 'A Pro tool'}</p>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="upgrade-hero">
            <span className="pro-chip">
              <Sparkles size={13} aria-hidden /> Pro
            </span>
            <p className="upgrade-lead">
              {tool.soon
                ? `“${tool.name}” is on the way. Unlock Pro now and get it — plus every power tool — the moment it ships.`
                : `“${tool.name}” is part of Pro. Unlock it once and keep it forever, on every device.`}
            </p>
          </div>

          <ul className="upgrade-list">
            {PRO_PERKS.map((perk) => (
              <li key={perk}>
                <Check size={16} aria-hidden />
                {perk}
              </li>
            ))}
          </ul>

          <div className="upgrade-price">
            <span className="upgrade-was">$29</span>
            <span className="upgrade-amount">$19</span>
            <span className="upgrade-note">once · lifetime · free updates</span>
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn primary" onClick={onUnlock}>
            <Sparkles size={18} aria-hidden />
            Unlock Pro — $19 forever
          </button>
        </footer>
      </div>
    </div>
  )
}
