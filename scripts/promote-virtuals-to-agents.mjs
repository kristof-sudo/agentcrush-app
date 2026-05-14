#!/usr/bin/env node
/**
 * promote-virtuals-to-agents.mjs
 *
 * Promote high-quality Virtuals Protocol agents from `virtuals_agents`
 * source table into the main `agents` table at tier='virtuals_economic'.
 *
 * Kris-approved threshold (2026-05-14):
 *   status = 'AVAILABLE'
 *   AND holders > 5000
 *   AND volume_24h_usd > 10000
 *   AND age_days > 30
 *
 * These agents stay OUT of the main /rankings view. They have their own
 * tier and (eventually) their own ranking surface. See brain/Queue/claude-tasks
 * for the deferred UI work.
 *
 * Idempotent: re-runs detect existing rows via `agents.virtuals_id` and
 * either skip or refresh metadata depending on --update-existing flag.
 *
 * Usage:
 *   node scripts/promote-virtuals-to-agents.mjs --dry-run
 *   node scripts/promote-virtuals-to-agents.mjs --write
 *   node scripts/promote-virtuals-to-agents.mjs --write --max 50
 *   node scripts/promote-virtuals-to-agents.mjs --write --update-existing
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite  = args.includes('--write');
const isUpdate = args.includes('--update-existing');
const maxArg   = args.indexOf('--max');
const MAX      = maxArg >= 0 ? parseInt(args[maxArg + 1], 10) : Infinity;

if (!isDryRun && !isWrite) {
  console.error('Pass --dry-run or --write');
  process.exit(1);
}

// Env loading
const ENV_CANDIDATES = [
  '/opt/agentcrush/selector/.env',
  '/opt/agentcrush/briefing/.env',
  '/opt/agentcrush/copydesk/.env',
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of ENV_CANDIDATES) {
  try {
    const text = await fs.readFile(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function makeHandle(name, ticker) {
  // virtuals_${ticker.toLowerCase()} with non-alphanumeric stripped
  const base = `virtuals_${(ticker || name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
  return base.slice(0, 60);
}

async function uniqueHandle(handle) {
  // If handle already exists, append _2, _3, etc.
  let candidate = handle;
  let i = 1;
  while (true) {
    const { data } = await sb.from('agents').select('id').eq('handle', candidate).maybeSingle();
    if (!data) return candidate;
    i++;
    candidate = `${handle}_${i}`;
    if (i > 99) throw new Error(`couldn't find unique handle for ${handle}`);
  }
}

console.log(`[promote-virtuals] mode=${isDryRun ? 'DRY-RUN' : 'WRITE'} update_existing=${isUpdate} max=${MAX === Infinity ? 'all' : MAX}`);

// Query qualifying Virtuals agents.
// Age check uses raw_payload.createdAt (Virtuals' actual launch timestamp).
// We can't filter via .lt() on a JSONB extracted value through PostgREST
// without RPC, so we apply DB-side filters that are cheap, fetch a wider
// candidate set, and apply the age filter in JS below.
const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

const { data: rawCandidates, error: queryErr } = await sb
  .from('virtuals_agents')
  .select('virtuals_id, name, ticker, description, token_address, status, holders, volume_24h_usd, market_cap_usd, market_cap_virtual, image_url, website_url, twitter_url, raw_payload')
  .eq('status', 'AVAILABLE')
  .gt('holders', 5000)
  .gt('volume_24h_usd', 10000)
  .order('market_cap_usd', { ascending: false, nullsFirst: false });

const candidates = (rawCandidates || []).filter((r) => {
  const created = r.raw_payload?.createdAt;
  if (!created) return false;
  const t = Date.parse(created);
  if (!Number.isFinite(t)) return false;
  return t < thirtyDaysAgoMs;
});

if (queryErr) {
  console.error('query failed:', queryErr.message);
  process.exit(1);
}

const qualifying = (candidates || []).slice(0, MAX === Infinity ? candidates.length : MAX);
console.log(`[promote-virtuals] ${qualifying.length} qualifying (filter: status=AVAILABLE, holders>5000, volume24h>$10k, age>30d)`);

if (qualifying.length === 0) {
  console.log('[promote-virtuals] nothing to do');
  process.exit(0);
}

// Sample
console.log('[promote-virtuals] sample (first 3):');
for (const c of qualifying.slice(0, 3)) {
  console.log(`  ${c.name} ($${c.ticker}) — holders ${c.holders}, vol24h $${c.volume_24h_usd?.toLocaleString()}, mcap $${(c.market_cap_usd || 0).toLocaleString()}`);
}

if (isDryRun) {
  console.log('[promote-virtuals] DRY-RUN — no writes');
  process.exit(0);
}

let inserted = 0, updated = 0, skipped = 0, failed = 0;

for (const v of qualifying) {
  // Already mapped?
  const { data: existing } = await sb.from('agents').select('id, handle, tier').eq('virtuals_id', v.virtuals_id).maybeSingle();
  if (existing) {
    if (isUpdate) {
      const { error: updErr } = await sb.from('agents').update({
        display_name: v.name,
        tagline: (v.description || '').slice(0, 200),
        avatar_url: v.image_url || null,
        website_url: v.website_url || null,
        twitter_url: v.twitter_url || null,
      }).eq('id', existing.id);
      if (updErr) { failed++; console.warn(`  update fail ${v.name}: ${updErr.message}`); }
      else updated++;
    } else {
      skipped++;
    }
    continue;
  }

  // New row
  const baseHandle = makeHandle(v.name, v.ticker);
  const handle = await uniqueHandle(baseHandle);

  const row = {
    handle,
    display_name: v.name,
    tagline: (v.description || '').slice(0, 200),
    bio: v.description || null,
    archetype: 'Trader',
    tier: 'virtuals_economic',
    tier_promoted_at: new Date().toISOString(),
    virtuals_id: v.virtuals_id,
    avatar_url: v.image_url || null,
    website_url: v.website_url || null,
    twitter_url: v.twitter_url || null,
    identity_status: 'unverified',
    visibility_score: 0,
    reputation_score: 0,
    weekly_delta: 0,
    ecosystem_layer: 'agent',
    status: 'active',
  };

  const { error: insErr } = await sb.from('agents').insert(row);
  if (insErr) { failed++; console.warn(`  insert fail ${v.name} (${handle}): ${insErr.message}`); }
  else { inserted++; if (inserted <= 5) console.log(`  + ${handle} ← ${v.name}`); }
}

console.log(`\n[promote-virtuals] inserted=${inserted} updated=${updated} skipped=${skipped} failed=${failed}`);
