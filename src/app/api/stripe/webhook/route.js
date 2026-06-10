import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { generateApiKey, sbAdmin } from '@/lib/apiKeys'

export const runtime = 'nodejs'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }
  return new Stripe(key)
}

export async function POST(req) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing Stripe webhook configuration' },
      { status: 500 }
    )
  }

  const body = await req.text()

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.metadata?.product === 'pro_api') {
          await issueProKey(session)
        }
        break
      }
      case 'customer.subscription.deleted': {
        await setKeyStatus(event.data.object.id, 'revoked')
        break
      }
      case 'invoice.payment_failed': {
        const subId = invoiceSubscriptionId(event.data.object)
        if (subId) await setKeyStatus(subId, 'past_due')
        break
      }
      case 'invoice.paid': {
        const subId = invoiceSubscriptionId(event.data.object)
        if (subId) await setKeyStatus(subId, 'active')
        break
      }
      default:
        break
    }
  } catch (err) {
    // Return 500 so Stripe retries — key issuance must not be silently dropped
    return NextResponse.json({ error: err?.message || 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// API versions ≥ 2025-03-31.basil moved invoice.subscription to
// invoice.parent.subscription_details.subscription — support both shapes.
function invoiceSubscriptionId(invoice) {
  const sub = invoice.subscription ?? invoice.parent?.subscription_details?.subscription
  return typeof sub === 'string' ? sub : sub?.id ?? null
}

async function issueProKey(session) {
  const sb = sbAdmin()

  // Idempotency: Stripe retries webhooks; one key per checkout session
  const { data: existing } = await sb
    .from('api_keys')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle()
  if (existing) return

  const { raw, hash, prefix } = generateApiKey()
  const { error } = await sb.from('api_keys').insert({
    key_hash: hash,
    key_prefix: prefix,
    key_once: raw,
    email: session.customer_details?.email || session.customer_email || null,
    plan: 'pro',
    status: 'active',
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
    stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
    stripe_checkout_session_id: session.id,
  })
  if (error) throw new Error(`api_keys insert failed: ${error.message}`)
}

async function setKeyStatus(subscriptionId, status) {
  const sb = sbAdmin()
  const update = { status }
  if (status === 'revoked') update.revoked_at = new Date().toISOString()
  await sb.from('api_keys').update(update).eq('stripe_subscription_id', subscriptionId)
}
