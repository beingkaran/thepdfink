import { ShieldCheck } from 'lucide-react'

/**
 * A compact animated reassurance banner for the free tools: a document stays
 * inside the "device" while an upload attempt to the cloud is blocked — driving
 * home that everything runs 100% locally and nothing is uploaded.
 *
 * The animation is pure CSS (SMIL-free) so it works everywhere and respects
 * prefers-reduced-motion. Styles are scoped by the `lpb-` class prefix.
 */
export function LocalProcessingBadge() {
  return (
    <div className="lpb" role="img" aria-label="All processing happens on your device — nothing is uploaded.">
      <style>{lpbStyles}</style>

      <svg className="lpb-svg" viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        {/* Device (laptop) */}
        <g className="lpb-device">
          <rect x="24" y="30" width="96" height="60" rx="6" className="lpb-screen" />
          <rect x="14" y="90" width="116" height="8" rx="3" className="lpb-base" />
        </g>

        {/* Document that stays home, gently floating inside the device */}
        <g className="lpb-doc">
          <rect x="52" y="42" width="40" height="36" rx="3" className="lpb-page" />
          <line x1="59" y1="52" x2="85" y2="52" className="lpb-line" />
          <line x1="59" y1="60" x2="85" y2="60" className="lpb-line" />
          <line x1="59" y1="68" x2="76" y2="68" className="lpb-line" />
        </g>

        {/* A packet tries to leave for the cloud, then bounces back */}
        <circle className="lpb-packet" cx="132" cy="60" r="4" />

        {/* Cloud with a "no upload" slash */}
        <g className="lpb-cloud">
          <path
            className="lpb-cloud-shape"
            d="M182 66 a14 14 0 0 1 3 -27 a18 18 0 0 1 34 4 a12 12 0 0 1 -2 23 z"
          />
          <line x1="176" y1="38" x2="222" y2="70" className="lpb-slash" />
        </g>
      </svg>

      <div className="lpb-copy">
        <ShieldCheck size={16} className="lpb-shield" aria-hidden />
        <span>
          <strong>100% on your device.</strong> Your files never get uploaded — every tool runs
          right here in your browser.
        </span>
      </div>
    </div>
  )
}

const lpbStyles = `
.local-badge-wrap { padding: 0 1.5rem 0.5rem; }
.lpb {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, currentColor 4%, transparent);
  max-width: 640px;
  margin: 0 auto;
}
.lpb-svg { width: 200px; height: 100px; flex: none; }

.lpb-screen { fill: none; stroke: currentColor; stroke-width: 2.5; opacity: 0.55; }
.lpb-base   { fill: currentColor; opacity: 0.55; }

.lpb-page { fill: color-mix(in srgb, currentColor 10%, transparent); stroke: currentColor; stroke-width: 1.5; }
.lpb-line { stroke: currentColor; stroke-width: 2; stroke-linecap: round; opacity: 0.5; }
.lpb-doc  { transform-box: fill-box; transform-origin: center; animation: lpb-float 3s ease-in-out infinite; }

.lpb-packet {
  fill: var(--accent, #b03a76);
  animation: lpb-bounce 2.6s cubic-bezier(.5,0,.5,1) infinite;
}

.lpb-cloud-shape { fill: none; stroke: currentColor; stroke-width: 2.5; opacity: 0.4; }
.lpb-slash {
  stroke: #e5484d; stroke-width: 3.5; stroke-linecap: round;
  stroke-dasharray: 56; stroke-dashoffset: 56;
  animation: lpb-slash 2.6s ease-in-out infinite;
}

.lpb-copy { display: flex; align-items: center; gap: .55rem; font-size: .9rem; line-height: 1.35; flex: 1; min-width: 200px; }
.lpb-copy strong { font-weight: 700; }
.lpb-shield { color: #2f9e5a; flex: none; }

@keyframes lpb-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
/* Packet lunges toward the cloud, is refused, and snaps home. */
@keyframes lpb-bounce {
  0%, 12%  { transform: translateX(0);    opacity: 0; }
  22%      { opacity: 1; }
  50%      { transform: translateX(34px); opacity: 1; }
  64%      { transform: translateX(18px); opacity: 1; }
  86%,100% { transform: translateX(0);    opacity: 0; }
}
@keyframes lpb-slash {
  0%, 40%  { stroke-dashoffset: 56; }
  60%, 90% { stroke-dashoffset: 0; }
  100%     { stroke-dashoffset: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .lpb-doc, .lpb-packet, .lpb-slash { animation: none; }
  .lpb-packet { opacity: 0; }
  .lpb-slash  { stroke-dashoffset: 0; }
}
`
