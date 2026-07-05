import type { LucideIcon } from 'lucide-react'
import { Apple, AppWindow, Terminal, Smartphone, TabletSmartphone, Download } from 'lucide-react'
import { DOWNLOAD_URLS, PRICE_USD, hasDownloadLink, type PlatformId } from '../lib/config'
import { detectOS } from '../lib/platform'

interface PlatformMeta {
  id: PlatformId
  name: string
  format: string
  icon: LucideIcon
  cta: string
}

const PLATFORMS: PlatformMeta[] = [
  { id: 'macos', name: 'macOS', format: '.dmg · Apple silicon & Intel', icon: Apple, cta: 'Download' },
  { id: 'windows', name: 'Windows', format: '.exe installer · 64-bit', icon: AppWindow, cta: 'Download' },
  { id: 'linux', name: 'Linux', format: 'AppImage · .deb · .rpm', icon: Terminal, cta: 'Download' },
  { id: 'ios', name: 'iOS', format: 'iPhone & iPad', icon: Smartphone, cta: 'App Store' },
  { id: 'android', name: 'Android', format: '.apk · sideload install', icon: TabletSmartphone, cta: 'Download' },
]

export function Downloads() {
  const os = detectOS()
  const detectedPlatform = PLATFORMS.find((p) => p.id === os) ?? null
  const featured = detectedPlatform && hasDownloadLink(detectedPlatform.id) ? detectedPlatform : null

  return (
    <section className="downloads" id="download" aria-labelledby="download-title">
      <div className="section-head">
        <h2 id="download-title">Get the app on every device</h2>
        <p>
          Install the full offline app — the same private tools, native, faster and ad-free.
          One purchase covers macOS, Windows, Linux, iOS &amp; Android.
        </p>
      </div>

      {featured && (
        <a className="download-featured" href={DOWNLOAD_URLS[featured.id]}>
          <span className="download-featured-icon">
            <featured.icon size={26} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="download-featured-text">
            <strong>Download for {featured.name}</strong>
            <span>Detected on your device · {featured.format}</span>
          </span>
          <span className="download-featured-btn">
            <Download size={18} aria-hidden /> Download
          </span>
        </a>
      )}

      <div className="download-grid">
        {PLATFORMS.map((p) => {
          const Icon = p.icon
          const detected = detectedPlatform?.id === p.id
          const available = hasDownloadLink(p.id)
          const cardClass = `download-card${detected ? ' is-detected' : ''}${
            available ? '' : ' is-soon'
          }`
          const inner = (
            <>
              <div className="download-icon">
                <Icon size={24} strokeWidth={1.75} aria-hidden />
              </div>
              <h3>
                {p.name}
                {detected && <span className="download-you">Your device</span>}
              </h3>
              <p>{p.format}</p>
              <span className="download-btn">
                {available ? (
                  <>
                    <Download size={15} aria-hidden />
                    {p.cta}
                  </>
                ) : (
                  'Coming soon'
                )}
              </span>
            </>
          )
          return available ? (
            <a key={p.id} className={cardClass} href={DOWNLOAD_URLS[p.id]}>
              {inner}
            </a>
          ) : (
            <div key={p.id} className={cardClass} aria-disabled="true">
              {inner}
            </div>
          )
        })}
      </div>

      <p className="download-note">
        One-time <strong>${PRICE_USD}</strong> unlock — yours forever on every platform, with free
        updates. <a href="/pricing">See pricing →</a>
      </p>
    </section>
  )
}
