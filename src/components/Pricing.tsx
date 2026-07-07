import { Check, Coffee } from 'lucide-react'
import { plans, type Plan } from '../data/plans'
import { checkoutFor } from '../lib/config'

function PlanCard({ plan, onUnlockPro }: { plan: Plan; onUnlockPro?: () => void }) {
  const href = checkoutFor(plan.id)
  const free = plan.price === 0
  // Pro is sold through the in-app account flow (sign in → Lemon Squeezy
  // checkout), not a hosted checkout link.
  const proFlow = plan.id === 'pro' && onUnlockPro

  return (
    <div className={`plan${plan.highlight ? ' plan-featured' : ''}`}>
      {plan.badge && <span className="plan-badge">{plan.badge}</span>}
      <h3 className="plan-name">{plan.name}</h3>
      <p className="plan-tagline">{plan.tagline}</p>

      <div className="plan-price">
        {free ? (
          <span className="plan-amount">Free</span>
        ) : (
          <>
            {plan.regularPrice && <span className="plan-was">${plan.regularPrice}</span>}
            <span className="plan-amount">${plan.price}</span>
          </>
        )}
        <span className="plan-period">{plan.priceNote}</span>
      </div>

      {proFlow ? (
        <button
          type="button"
          className={`btn ${plan.highlight ? 'btn-primary' : 'btn-ghost'}`}
          onClick={onUnlockPro}
        >
          {plan.cta}
        </button>
      ) : (
        <a className={`btn ${plan.highlight ? 'btn-primary' : 'btn-ghost'}`} href={href}>
          {plan.highlight && <Coffee size={16} aria-hidden />}
          {plan.cta}
        </a>
      )}

      <p className="plan-lead">{plan.featuresLead}</p>
      <ul className="plan-features">
        {plan.features.map((f) => (
          <li key={f.label}>
            <Check size={16} aria-hidden />
            <span>
              {f.label}
              {f.soon && <span className="soon">Soon</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Pricing({ onUnlockPro }: { onUnlockPro?: () => void }) {
  return (
    <section className="pricing" id="pricing" aria-labelledby="pricing-title">
      <div className="section-head pricing-head">
        <p className="hero-eyebrow">Pay once · No subscription</p>
        <h2 id="pricing-title">Pay once. Yours forever.</h2>
        <p>
          The everyday tools are free. Unlock Pro once to add OCR, batch processing, secure
          redaction and on-device AI — yours forever, on every browser you sign in to. No
          subscription, ever.
        </p>
        <p className="pricing-launch">🎉 Launch pricing — lock in the lower price today.</p>
      </div>

      <div className="plan-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onUnlockPro={onUnlockPro} />
        ))}
      </div>

      <p className="pricing-trust">
        One-time payment · Lifetime license · Free updates · 14-day money-back guarantee
      </p>
    </section>
  )
}
