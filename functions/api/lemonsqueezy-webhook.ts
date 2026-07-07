import { grantPro, json, normalizeEmail, verifyLemonSqueezySignature } from './_lib'

/**
 * Lemon Squeezy webhook: flips the account's pro flag on a completed order.
 *
 * Configure in the Lemon Squeezy dashboard → Settings → Webhooks → endpoint
 * `https://thepdf.ink/api/lemonsqueezy-webhook`, event `order_created`, and set
 * the signing secret as LEMONSQUEEZY_WEBHOOK_SECRET.
 */
export const onRequestPost = async ({ request, env }: any): Promise<Response> => {
  if (!env.LEMONSQUEEZY_WEBHOOK_SECRET) return json({ error: 'Webhook not configured.' }, 503)

  const payload = await request.text()
  const signature = request.headers.get('x-signature') ?? ''
  if (!(await verifyLemonSqueezySignature(payload, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET))) {
    return json({ error: 'Invalid signature.' }, 400)
  }

  const event = JSON.parse(payload)
  if (event?.meta?.event_name === 'order_created') {
    const attrs = event.data?.attributes ?? {}
    // Only grant on a paid order (ignore refunded/pending).
    const paid = attrs.status === 'paid'
    const email = normalizeEmail(event.meta?.custom_data?.email || attrs.user_email || '')
    if (paid && email) await grantPro(env, email)
  }

  return json({ received: true })
}
