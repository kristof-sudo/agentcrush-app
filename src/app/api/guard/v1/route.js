/**
 * /api/guard/v1 — Guard v1 inline pre-settlement check (SR-H2).
 *
 * The question guardedPay() asks at the moment an x402 quote arrives:
 * "should my agent pay this payTo address for this resource right now?"
 *
 * Deterministic, free, CORS-open (D4, strategy review 2026-07-14: the inline
 * verdict is free; DEPTH is metered, and only offered at the caution/reject
 * moment — a clean `proceed` carries no upsell block).
 *
 * Evidence consulted, cheapest first:
 *   1. Bazaar listings (46K+): is this payTo advertised on the Bazaar, and is
 *      it advertised for the SAME resource the caller is about to pay?
 *   2. ERC-8004 registry (41K+ raw registrations): is this address a
 *      registered on-chain agent owner?
 *   3. AgentCrush index: if the paid resource maps to an indexed agent,
 *      return the full verifyCounterparty verdict (tier + liveness +
 *      wallet-binding).
 *
 * Verdict doctrine (Notes/2026-07-02-verify-verdict-thresholds.md): absence
 * of evidence is caution, never reject. `proceed` requires a resolved
 * evidence-ranked + alive agent; an unresolved-but-corroborated payee stays
 * `caution` with granular reason_codes so callers can set their own policy.
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { trackHit } from '@/lib/telemetry'
import { verifyCounterparty } from '@/lib/verifyCounterparty'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
}

const DEPTH_AT_RISK_MOMENT = {
  full_evaluation: { url: 'https://agentcrush.xyz/api/trust/evaluate/full?handle={handle}', price: '$0.10 x402 or Pro key' },
  signed_attestation: { url: 'https://agentcrush.xyz/api/oracle/attest?metric=liveness&handle={handle}', price: '$0.25 x402 or Pro key' },
}

function ok(data) {
  return NextResponse.json(data, { status: 200, headers: CORS })
}

function err(message, status) {
  return NextResponse.json({ error: message }, { status, headers: CORS })
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function host(u) {
  try {
    return new URL(u).host.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  trackHit('/api/guard/v1', req, 'free_200')
  const url = new URL(req.url)
  const payTo = (url.searchParams.get('pay_to') || '').trim()
  const resource = (url.searchParams.get('resource') || '').trim() || null

  if (!/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
    return err('pay_to must be a 0x-prefixed 40-hex-char address (as received in the x402 payment-required quote).', 400)
  }

  const supabase = db()
  if (!supabase) return err('Server is missing Supabase configuration.', 500)

  const reasonCodes = []
  const evidence = { bazaar_listings: 0, resource_binding: 'no_resource_given', registry_owner_tokens: 0 }

  // 1. Bazaar: exact jsonb containment on the payTo string as quoted.
  //    x402 quotes carry payTo verbatim from the listing, so exact match is
  //    the honest check — a case-variant address is itself a signal that the
  //    quote does not come from the Bazaar listing.
  const { data: listings, error: bzErr } = await supabase
    .from('bazaar_resources')
    .select('resource_url')
    .filter('accepts', 'cs', JSON.stringify([{ payTo }]))
    .is('removed_at', null)
    .limit(50)
  if (bzErr) return err('Database error.', 500)

  const listedUrls = (listings || []).map((l) => l.resource_url)
  evidence.bazaar_listings = listedUrls.length

  if (resource) {
    const resHost = host(resource)
    const sameResource = listedUrls.some((u) => u === resource)
    const sameHost = !sameResource && resHost && listedUrls.some((u) => host(u) === resHost)
    evidence.resource_binding = sameResource ? 'advertised_for_this_resource'
      : sameHost ? 'advertised_for_this_host'
      : listedUrls.length > 0 ? 'advertised_elsewhere_only'
      : 'unknown_payee'
  } else if (listedUrls.length === 0) {
    evidence.resource_binding = 'unknown_payee'
  }

  if (evidence.bazaar_listings === 0) reasonCodes.push('payee_not_in_bazaar')
  if (evidence.resource_binding === 'advertised_elsewhere_only') reasonCodes.push('payto_advertised_for_different_resource')

  // 2. ERC-8004 registry owners (raw on-chain sync). Address case in the
  //    registry follows the sync worker; check both forms via the btree index.
  const { count: ownerCount } = await supabase
    .from('erc8004_registry')
    .select('token_id', { count: 'exact', head: true })
    .in('owner_address', [payTo, payTo.toLowerCase()])
  evidence.registry_owner_tokens = ownerCount || 0
  if (evidence.registry_owner_tokens > 0) reasonCodes.push('payee_is_registered_erc8004_owner')

  // 3. Resolve to an indexed agent via the paid resource's host, when given.
  let agentVerdict = null
  const resHost = resource ? host(resource) : null
  if (resHost) {
    const { data: agent } = await supabase
      .from('agents')
      .select('handle, website_url')
      .ilike('website_url', `%${resHost}%`)
      .limit(1)
      .maybeSingle()
    if (agent?.handle) {
      const v = await verifyCounterparty(supabase, agent.handle)
      if (!v.error) agentVerdict = v
    }
  }
  if (!agentVerdict) reasonCodes.push('counterparty_not_indexed')

  // Deterministic roll-up. proceed only via a resolved agent's own proceed;
  // reject only via a resolved agent's own reject (absence ≠ reject).
  const decision = agentVerdict ? agentVerdict.decision : 'caution'
  for (const c of agentVerdict?.reason_codes || []) reasonCodes.push(c)

  const body = {
    decision,
    pay_to: payTo,
    resource,
    reason_codes: reasonCodes,
    evidence,
    counterparty: agentVerdict
      ? { handle: agentVerdict.handle, name: agentVerdict.name, trust: agentVerdict.trust, liveness: agentVerdict.liveness, wallet_binding: agentVerdict.wallet_binding ?? null, profile_url: agentVerdict.profile_url }
      : null,
    checked_at: new Date().toISOString(),
    methodology_url: 'https://agentcrush.xyz/methodology',
  }

  // D4: depth is offered ONLY at the caution/reject moment, never on proceed.
  // Depth endpoints are handle-keyed, so they are only offered when the
  // counterparty resolved to an indexed agent.
  if (decision !== 'proceed' && agentVerdict) {
    body.deeper = Object.fromEntries(
      Object.entries(DEPTH_AT_RISK_MOMENT).map(([k, v]) => [
        k,
        { ...v, url: v.url.replaceAll('{handle}', encodeURIComponent(agentVerdict.handle)) },
      ])
    )
  }

  return ok(body)
}
