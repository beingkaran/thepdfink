/**
 * Pricing tiers — single source of truth for the homepage Pricing section.
 * The static /pricing.html page mirrors this structure.
 *
 * Model: two tiers only. A free, ad-supported web tier funnels into a single
 * one-time Pro unlock ($19) that opens every tool — including OCR, batch,
 * redaction and the on-device AI — tied to the user's account.
 */

export type PlanId = 'free' | 'pro'

export interface PlanFeature {
  label: string
  /** Show a "Soon" badge for roadmap features (e.g. AI auto-fill). */
  soon?: boolean
}

export interface Plan {
  id: PlanId
  name: string
  /** Current price in USD. 0 = free. */
  price: number
  /** Optional struck-through regular price to anchor the launch discount. */
  regularPrice?: number
  priceNote: string
  tagline: string
  /** Header line for the feature list, e.g. "Everything in Free, plus:". */
  featuresLead: string
  features: PlanFeature[]
  cta: string
  /** Highlight this card as the recommended tier. */
  highlight?: boolean
  badge?: string
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceNote: 'forever',
    tagline: 'The everyday PDF tools, in your browser.',
    featuresLead: 'Includes:',
    features: [
      { label: 'All core tools — merge, split, convert & more' },
      { label: '100% client-side — nothing is uploaded' },
      { label: 'No account required' },
      { label: 'Ad-supported' },
    ],
    cta: 'Use the free tools',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    regularPrice: 29,
    priceNote: 'once · lifetime',
    tagline: 'Every power tool, unlocked on your account.',
    featuresLead: 'Everything in Free, plus:',
    features: [
      { label: 'OCR — make scanned PDFs searchable' },
      { label: 'Batch & bulk processing' },
      { label: 'Secure, irreversible redaction' },
      { label: 'AI: summarise & ask your PDF — on-device' },
      { label: 'Ad-free, on every browser you sign in to' },
      { label: 'AI auto-fill forms', soon: true },
      { label: 'Free updates, forever' },
    ],
    cta: 'Unlock Pro — $19',
    highlight: true,
    badge: 'Best value',
  },
]
