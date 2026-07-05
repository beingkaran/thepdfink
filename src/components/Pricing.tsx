import { Check, Coffee } from 'lucide-react'
import { plans, type Plan } from '../data/plans'
import { checkoutFor } from '../lib/config'

function PlanCard({ plan }: { plan: Plan }) {
  const href = checkoutFor(plan.id)
  const free = plan.price === 0

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

      <a
        className={`btn ${plan.highlight ? 'btn-primary' : 'btn-ghost'}`}
        href={href}
      >
        {plan.highlight && <Coffee size={16} aria-hidden />}
        {plan.cta}
      </a>

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

export function Pricing() {
  return (
    <section className="pricing" id="pricing" aria-labelledby="pricing-title">
      <div className="section-head pricing-head">
        <p className="hero-eyebrow">Pay once · No subscription</p>
        <h2 id="pricing-title">Pay once. Yours forever.</h2>
        <p>
          The web tools are free. Unlock the offline apps for the price of a coffee — then step up
          to Pro or Business only if you need the power tools. No monthly fees, ever.
        </p>
        <p className="pricing-launch">🎉 Launch pricing — lock in the lower price today.</p>
      </div>

      <div className="plan-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <p className="pricing-trust">
        One-time payment · Lifetime license · Free updates · 14-day money-back guarantee
      </p>
    </section>
  )
}
