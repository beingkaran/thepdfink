import { Shield, KeyRound, LogOut } from 'lucide-react'
import { isTauri } from '../lib/platform'
import { BrandMark } from './BrandMark'

interface HeaderProps {
  admin: boolean
  /** Show the (hidden-by-default) admin login entry point. */
  showAdminEntry: boolean
  onOpenAdmin: () => void
  onLogout: () => void
}

export function Header({ admin, showAdminEntry, onOpenAdmin, onLogout }: HeaderProps) {
  const offline = isTauri()

  return (
    <header className="site-header">
      <a className="logo" href="/" aria-label="thepdf.ink">
        <BrandMark size={30} />
        <span>
          the<strong>pdf</strong>
          <span className="logo-tld">.ink</span>
        </span>
      </a>

      <div className="header-right">
        {admin ? (
          <div className="admin-pill">
            <KeyRound size={13} aria-hidden />
            <span>Admin</span>
            <button type="button" className="admin-logout" onClick={onLogout} aria-label="Sign out of admin">
              <LogOut size={13} aria-hidden />
            </button>
          </div>
        ) : (
          showAdminEntry && (
            <button
              type="button"
              className="admin-entry"
              onClick={onOpenAdmin}
              aria-label="Admin sign in"
              title="Admin sign in (local testing)"
            >
              <KeyRound size={15} aria-hidden />
            </button>
          )
        )}
        <div className="header-badge">
          <Shield size={14} aria-hidden />
          <span>{offline ? '100% offline · No uploads' : '100% client-side · No uploads'}</span>
        </div>
      </div>
    </header>
  )
}
