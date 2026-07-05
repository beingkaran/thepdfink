import { Shield } from 'lucide-react'
import { isTauri } from '../lib/platform'
import { BrandMark } from './BrandMark'

export function Header() {
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
      <div className="header-badge">
        <Shield size={14} aria-hidden />
        <span>{offline ? '100% offline · No uploads' : '100% client-side · No uploads'}</span>
      </div>
    </header>
  )
}
