import { isTauri } from '../lib/platform'

export function Footer() {
  const native = isTauri()
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      {!native && (
        <nav className="footer-links" aria-label="Footer">
          <a href="/tools">All PDF tools</a>
          <a href="/pricing">Pricing</a>
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/licenses">Licenses</a>
          <a href="/contact">Contact</a>
        </nav>
      )}
      <p>
        thepdf.ink processes every file locally{native ? ' on your device' : ' in your browser'} using
        pdf-lib and PDF.js. Nothing is uploaded, stored, or tracked.
      </p>
      <p className="footer-note">
        © {year} thepdf.ink ·{' '}
        {native
          ? 'Native app for macOS, Windows, iOS & Android. Built for privacy.'
          : 'One-time $9 unlock — yours forever, on every platform.'}
      </p>
    </footer>
  )
}
