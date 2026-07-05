import { useEffect, useState } from 'react'
import { X, KeyRound, Loader2 } from 'lucide-react'
import { loginAdmin } from '../lib/entitlement'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function AdminLogin({ onClose, onSuccess }: Props) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    // Synchronous check, but keep the busy state for a tick so the UI reads as a login.
    const ok = loginAdmin(user, pass)
    setBusy(false)
    if (ok) {
      onSuccess()
      onClose()
    } else {
      setError('Incorrect username or password.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal admin-modal"
        role="dialog"
        aria-labelledby="admin-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-title">
            <KeyRound size={22} strokeWidth={1.75} aria-hidden />
            <div>
              <h2 id="admin-title">Admin sign in</h2>
              <p>Local testing unlock — full access, no payment.</p>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form className="modal-body" onSubmit={submit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={user}
              autoFocus
              autoComplete="username"
              onChange={(e) => setUser(e.target.value)}
              placeholder="admin"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={pass}
              autoComplete="current-password"
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••"
            />
          </label>

          <p className="admin-note">
            For local development only. Unlocks every tool and hides pricing on this device.
            Not a security boundary.
          </p>

          {error && <p className="feedback error">{error}</p>}

          <button type="submit" className="btn primary admin-submit" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={18} className="spin" aria-hidden /> Signing in…
              </>
            ) : (
              <>
                <KeyRound size={18} aria-hidden /> Unlock everything
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
