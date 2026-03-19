import { NextResponse } from 'next/server'
import Stripe from 'stripe'

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

  switch (event.type) {
    case 'checkout.session.completed':
      break
    default:
      break
  }

  return NextResponse.json({ received: true })
}
