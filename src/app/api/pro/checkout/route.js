/**
 * POST /api/pro/checkout
 *
 * Creates a Stripe Checkout session for the AgentCrush Pro API subscription
 * ($29/mo). On payment, the webhook issues an API key retrievable once via
 * /api/keys/by-session.
 *
 * Uses STRIPE_PRICE_PRO_API (a Stripe Price id) when set; otherwise creates
 * the price inline so no dashboard setup is required.
 */

import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const SITE = 'https://agentcrush.xyz'

export async function POST(req) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
  }
  const stripe = new Stripe(key)

  let body
  try { body = await req.json() } catch { body = {} }

  const priceId = process.env.STRIPE_PRICE_PRO_API
  const lineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 2900,
          recurring: { interval: 'month' },
          product_data: {
            name: 'AgentCrush Pro API',
            description: 'Full-depth trust evaluations, premium endpoints without per-call payments, 500-handle bulk lookups.',
          },
        },
      }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [lineItem],
      allow_promotion_codes: true,
      customer_email: body?.email || undefined,
      metadata: { product: 'pro_api' },
      success_url: `${SITE}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/pricing`,
    })
    return NextResponse.json({ id: session.id, url: session.url })
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Stripe checkout failed' },
      { status: 500 }
    )
  }
}
