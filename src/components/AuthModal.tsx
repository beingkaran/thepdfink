import { useEffect, useState } from 'react'
import { X, UserRound, Loader2 } from 'lucide-react'
import { loginUser, signupUser, type AccountUser } from '../lib/auth'

interface Props {
  /** Why the user is being asked to sign in — shown under the title. */
  reason?: string
  onClose: () => void
  onSuccess: (user: AccountUser) => void
}

export function AuthModal({ reason, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user =
        mode === 'signup' ? await signupUser(email, password) : await loginUser(email, password)
      onSuccess(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const signup = mode === 'signup'

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal admin-modal"
        role="dialog"
        aria-labelledby="auth-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-title">
            <UserRound size={22} strokeWidth={1.75} aria-hidden />
            <div>
              <h2 id="auth-title">{signup ? 'Create your account' : 'Sign in'}</h2>
              <p>{reason ?? 'Your account keeps Pro unlocked on every browser.'}</p>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form className="modal-body" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              autoFocus
              required
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              required
              minLength={8}
              autoComplete={signup ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={signup ? 'At least 8 characters' : '••••••••'}
            />
          </label>

          {error && <p className="feedback error">{error}</p>}

          <button type="submit" className="btn primary admin-submit" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={18} className="spin" aria-hidden />
                {signup ? 'Creating account…' : 'Signing in…'}
              </>
            ) : signup ? (
              'Create account'
            ) : (
              'Sign in'
            )}
          </button>

          <p className="auth-switch">
            {signup ? 'Already have an account?' : 'New to thepdf.ink?'}{' '}
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => {
                setMode(signup ? 'signin' : 'signup')
                setError(null)
              }}
            >
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
