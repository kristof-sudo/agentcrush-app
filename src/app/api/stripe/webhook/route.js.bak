import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function sbAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  const sb = sbAdmin();

  // Idempotency: record event first
  const { data: existing } = await sb.from('stripe_events').select('id, processed_at').eq('id', event.id).maybeSingle();
  if (existing?.processed_at) return new Response('OK', { status: 200 });

  await sb.from('stripe_events').upsert({
    id: event.id,
    type: event.type,
    raw: event,
    status: 'ok',
  });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const product_key = session?.metadata?.product_key;
      const agent_id = session?.metadata?.agent_id || null;

      // purchase
      const purchaseInsert = {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        stripe_customer_id: session.customer || session?.customer_details?.email || null,
        buyer_email: session?.customer_details?.email || null,
        product_key,
        amount_total: session.amount_total || null,
        currency: session.currency || null,
        payment_status: session.payment_status || 'paid',
        metadata: session.metadata || {},
      };

      const { data: purchase, error: perr } = await sb
        .from('purchases')
        .upsert(purchaseInsert, { onConflict: 'stripe_checkout_session_id' })
        .select('*')
        .single();
      if (perr) throw perr;

      // entitlement
      const entInsert = {
        subject_type: 'stripe_customer',
        subject_id: String(session.customer || session?.customer_details?.email || session.id),
        product_key,
        status: 'active',
        source_purchase_id: purchase.id,
      };

      const { data: entitlement, error: eerr } = await sb
        .from('entitlements')
        .upsert(entInsert, { onConflict: 'subject_type,subject_id,product_key' })
        .select('*')
        .single();
      if (eerr) throw eerr;

      // delivery
      let delivery_type = 'in_app_unlock';
      let payload = { product_key, agent_id };

      if (product_key === 'persona_basic' || product_key === 'persona_pro') {
        delivery_type = 'download_url';
        payload = { product_key, file_key: product_key };
      } else if (product_key === 'compat_basic' || product_key === 'compat_premium') {
        delivery_type = 'report';
        payload = { product_key, agent_id };
      } else if (product_key === 'featured_spotlight') {
        delivery_type = 'in_app_unlock';
        payload = { product_key, agent_id, duration_hours: 72 };
        // featured_agents insert only if agent_id provided
        if (agent_id) {
          const starts = new Date();
          const ends = new Date(starts.getTime() + 72 * 3600 * 1000);
          await sb.from('featured_agents').upsert({
            agent_id,
            starts_at: starts.toISOString(),
            ends_at: ends.toISOString(),
            source_entitlement_id: entitlement.id,
          });
        }
      }

      await sb.from('deliveries').insert({
        entitlement_id: entitlement.id,
        delivery_type,
        status: 'delivered',
        payload,
      });
    }

    await sb.from('stripe_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id);
    return new Response('OK', { status: 200 });
  } catch (err) {
    await sb.from('stripe_events').update({ status: 'error', error: String(err?.message || err) }).eq('id', event.id);
    return new Response('Webhook handler error', { status: 500 });
  }
}
