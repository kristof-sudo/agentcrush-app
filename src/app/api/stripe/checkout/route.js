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
  try {
    const stripe = getStripe()
    const body = await req.json()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: body?.line_items || [],
      success_url: body?.success_url,
      cancel_url: body?.cancel_url,
      metadata: body?.metadata || {},
    })

    return NextResponse.json({ id: session.id, url: session.url })
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Stripe checkout failed' },
      { status: 500 }
    )
  }
}
