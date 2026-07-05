/**
 * Pricing tiers — single source of truth for the homepage Pricing section.
 * The static /pricing.html page mirrors this structure.
 *
 * Model: one-time purchases only (no subscriptions). Free web tier funnels into
 * a $9 impulse tier, anchored by Pro ($29) and Business ($79).
 */

export type PlanId = 'free' | 'personal' | 'pro' | 'business'

export interface PlanFeature {
  label: string
  /** Show a "Soon" badge for roadmap features (e.g. AI). */
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
  /** Header line for the feature list, e.g. "Everything in Personal, plus:". */
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
    tagline: 'The web tools, in your browser.',
    featuresLead: 'Includes:',
    features: [
      { label: 'All 15 core tools on the web' },
      { label: '100% client-side — no uploads' },
      { label: 'No account required' },
      { label: 'Ad-supported' },
    ],
    cta: 'Use the free tools',
  },
  {
    id: 'personal',
    name: 'Personal',
    price: 9,
    regularPrice: 19,
    priceNote: 'once · lifetime',
    tagline: 'Buy me a coffee. Keep it forever.',
    featuresLead: 'Everything in Free, plus:',
    features: [
      { label: 'Native apps — macOS, Windows, Linux, iOS & Android' },
      { label: 'Fully offline, ad-free & tracking-free' },
      { label: 'All 15 tools on every device' },
      { label: 'Free updates, forever' },
      { label: '1 user · personal use' },
    ],
    cta: 'Get Personal',
    highlight: true,
    badge: 'Most popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    regularPrice: 49,
    priceNote: 'once · lifetime',
    tagline: 'For power users and heavy documents.',
    featuresLead: 'Everything in Personal, plus:',
    features: [
      { label: 'OCR — make scanned PDFs searchable' },
      { label: 'Batch & bulk processing' },
      { label: 'Secure, irreversible redaction' },
      { label: 'AI: summarise & ask your PDF — on-device' },
      { label: 'AI auto-fill forms', soon: true },
      { label: 'Priority updates' },
    ],
    cta: 'Get Pro',
  },
  {
    id: 'business',
    name: 'Business',
    price: 79,
    priceNote: 'once · or $39/seat',
    tagline: 'Commercial use, teams & invoicing.',
    featuresLead: 'Everything in Pro, plus:',
    features: [
      { label: 'Commercial-use license' },
      { label: 'Invoice & VAT receipt' },
      { label: 'Priority email support' },
      { label: 'Team & volume deployment' },
      { label: 'Per-seat option available' },
    ],
    cta: 'Get Business',
  },
]
