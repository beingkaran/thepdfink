import { json } from './_lib'
import { getUserFromToken, grantProByEmail, isProByEmail } from './_supabase'

/**
 * Start a Pro checkout for the signed-in user via Lemon Squeezy.
 *
 * The caller is identified by their Supabase access token (Authorization: Bearer
 * <token>), verified server-side. Lemon Squeezy is the Merchant of Record — it
 * collects and remits global sales tax / VAT on our behalf and pays out to the
 * store owner. With LEMONSQUEEZY_API_KEY (+ store & variant ids) set this creates
 * a hosted checkout and returns its URL; the pro flag is then granted by the
 * lemonsqueezy-webhook function on `order_created`.
 *
 * Without the keys (local dev / staging) it falls back to TEST MODE: the pro flag
 * is granted immediately and the client is sent to the success URL.
 */
export const onRequestPost = async ({ request, env }: any): Promise<Response> => {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const user = await getUserFromToken(env, token)
  if (!user) return json({ error: 'Sign in to unlock Pro.' }, 401)

  if (await isProByEmail(env, user.email)) {
    return json({ url: '/?checkout=success', alreadyPro: true })
  }

  const origin = new URL(request.url).origin

  if (!env.LEMONSQUEEZY_API_KEY || !env.LEMONSQUEEZY_STORE_ID || !env.LEMONSQUEEZY_VARIANT_ID) {
    // TEST MODE — no payment provider configured.
    await grantProByEmail(env, user.email)
    return json({ url: '/?checkout=success&test=1', testMode: true })
  }

  // Attach the account email as custom data so the webhook can identify the
  // buyer, and prefill/lock the checkout email to that account.
  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: user.email,
          custom: { email: user.email },
        },
        product_options: {
          redirect_url: `${origin}/?checkout=success`,
          receipt_button_text: 'Back to thepdf.ink',
          receipt_thank_you_note: 'Pro is unlocked on your account. Thank you!',
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: String(env.LEMONSQUEEZY_STORE_ID) } },
        variant: { data: { type: 'variants', id: String(env.LEMONSQUEEZY_VARIANT_ID) } },
      },
    },
  }

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify(body),
  })
  const result: any = await res.json().catch(() => null)
  const url = result?.data?.attributes?.url
  if (!res.ok || !url) {
    return json({ error: 'Could not start checkout. Please try again.' }, 502)
  }
  return json({ url })
}
