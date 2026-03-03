import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_BY_KEY = {
  identity_kit: process.env.STRIPE_PRICE_IDENTITY_KIT,
  compat_basic: process.env.STRIPE_PRICE_COMPAT_BASIC,
  compat_premium: process.env.STRIPE_PRICE_COMPAT_PREMIUM,
  featured_spotlight: process.env.STRIPE_PRICE_FEATURED_SPOTLIGHT,
  persona_basic: process.env.STRIPE_PRICE_PERSONA_BASIC,
  persona_pro: process.env.STRIPE_PRICE_PERSONA_PRO,
};

function getBaseUrl(req) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

export async function POST(req) {
  try {
    const { product_key, agent_id } = await req.json();
    if (!product_key) return Response.json({ error: 'Missing product_key' }, { status: 400 });

    const price = PRICE_BY_KEY[product_key];
    if (!price) return Response.json({ error: `Unknown product_key: ${product_key}` }, { status: 400 });

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer_creation: 'always',
  line_items: [{ price, quantity: 1 }],
  success_url: `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/shop`,
  metadata: {
    product_key,
    ...(agent_id ? { agent_id: String(agent_id) } : {}),
  },
});

    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
