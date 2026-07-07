import { Sparkles, ArrowDown } from 'lucide-react'
import { tools } from '../data/tools'
import { PRICE_USD } from '../lib/config'
import { isTauri } from '../lib/platform'

export function Hero({ isPro = false }: { isPro?: boolean }) {
  const native = isTauri()

  return (
    <section className="hero">
      <p className="hero-eyebrow">Your documents stay on your device</p>
      <h1>
        Professional PDF tools.
        <br />
        <em>No account. No cloud.</em>
      </h1>
      <p className="hero-lead">
        Merge, split, find &amp; replace, annotate, sign, and convert PDFs entirely on
        your device. Files are processed locally and never sent to a server.
      </p>

      {!native && (
        <div className="hero-cta">
          <a className="btn btn-primary" href="#tools">
            <ArrowDown size={18} aria-hidden />
            {isPro ? 'Open your tools' : 'Use the free web tools'}
          </a>
          {!isPro && (
            <a className="btn btn-ghost" href="#pricing">
              <Sparkles size={18} aria-hidden />
              Unlock Pro — ${PRICE_USD}
            </a>
          )}
        </div>
      )}

      <div className="hero-stats">
        <div>
          <strong>{tools.length}</strong>
          <span>tools</span>
        </div>
        <div>
          <strong>0</strong>
          <span>uploads</span>
        </div>
        <div>
          <strong>{isPro ? '✓' : `$${PRICE_USD}`}</strong>
          <span>{isPro ? 'Pro unlocked' : 'Pro · lifetime'}</span>
        </div>
      </div>
    </section>
  )
}
