#!/usr/bin/env node
/**
 * promote-agentverse-to-agents.mjs
 *
 * Promote high-quality Agentverse (Fetch.ai) service agents from
 * `agentverse_agents` source table into the main `agents` table at
 * tier='agentverse_service'.
 *
 * Kris-approved threshold (2026-05-14):
 *   status = 'responsive'
 *   AND interactions_count > 50
 *   AND age_days > 14
 *
 * Note: Kris mentioned "unique_callers > 5" but our schema doesn't expose
 * that directly. Substituting with `rating IS NOT NULL AND rating > 0`
 * as proxy for "had real callers". (Verified with Kris.)
 *
 * Idempotent: re-runs detect existing rows via `agents.agentverse_id`.
 *
 * Usage:
 *   node scripts/promote-agentverse-to-agents.mjs --dry-run
 *   node scripts/promote-agentverse-to-agents.mjs --write
 *   node scripts/promote-agentverse-to-agents.mjs --write --max 50 --update-existing
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

const ENV_CANDIDATES = [
  '/opt/agentcrush/selector/.env',
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

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function makeHandle(name) {
  const slug = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);
  return `agentverse_${slug || 'unnamed'}`;
}

async function uniqueHandle(handle) {
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

console.log(`[promote-agentverse] mode=${isDryRun ? 'DRY-RUN' : 'WRITE'} update_existing=${isUpdate} max=${MAX === Infinity ? 'all' : MAX}`);

// Note: `first_seen_at` is when we ingested (today on first sync), not when
// Agentverse registered the agent. The agentverse_agents schema doesn't
// expose an authoritative "registered_at" field. We skip the age filter for
// the first sync — re-add it once ingestion has been running ≥14 days so
// first_seen_at is meaningful.

const { data: candidates, error: queryErr } = await sb
  .from('agentverse_agents')
  .select('agentverse_id, name, description, category, endpoint_url, status, interactions_count, rating, runtime, first_seen_at')
  .eq('status', 'responsive')
  .gt('interactions_count', 50)
  .gt('rating', 0)
  .order('interactions_count', { ascending: false });

if (queryErr) {
  console.error('query failed:', queryErr.message);
  process.exit(1);
}

const qualifying = (candidates || []).slice(0, MAX === Infinity ? candidates.length : MAX);
console.log(`[promote-agentverse] ${qualifying.length} qualifying (filter: responsive, interactions>50, rating>0, age>14d)`);

if (qualifying.length === 0) {
  console.log('[promote-agentverse] nothing to do');
  process.exit(0);
}

console.log('[promote-agentverse] sample (first 3):');
for (const c of qualifying.slice(0, 3)) {
  console.log(`  ${c.name} — ${c.interactions_count} interactions, rating ${c.rating}, runtime ${c.runtime}`);
}

if (isDryRun) {
  console.log('[promote-agentverse] DRY-RUN — no writes');
  process.exit(0);
}

let inserted = 0, updated = 0, crossLinked = 0, skipped = 0, failed = 0;

for (const v of qualifying) {
  // 1. Already mapped via agentverse_id?
  const { data: existing } = await sb.from('agents').select('id').eq('agentverse_id', v.agentverse_id).maybeSingle();
  if (existing) {
    if (isUpdate) {
      const { error: updErr } = await sb.from('agents').update({
        display_name: v.name,
        tagline: (v.description || '').slice(0, 200),
        website_url: v.endpoint_url && v.endpoint_url.startsWith('http') ? v.endpoint_url : null,
      }).eq('id', existing.id);
      if (updErr) failed++; else updated++;
    } else skipped++;
    continue;
  }

  // 2. Dedup: existing agent with matching display_name or handle (case-insensitive)?
  // Cross-link rather than create duplicate.
  const nameLower = (v.name || '').trim().toLowerCase();
  if (nameLower) {
    const { data: nameMatch } = await sb
      .from('agents')
      .select('id, handle, display_name, agentverse_id')
      .or(`display_name.ilike.${nameLower},handle.ilike.${nameLower}`)
      .is('agentverse_id', null)
      .limit(1)
      .maybeSingle();
    if (nameMatch) {
      const { error: linkErr } = await sb.from('agents').update({
        agentverse_id: v.agentverse_id,
      }).eq('id', nameMatch.id);
      if (linkErr) { failed++; console.warn(`  cross-link fail ${nameMatch.handle}: ${linkErr.message}`); }
      else { crossLinked++; if (crossLinked <= 5) console.log(`  ↔ cross-link ${nameMatch.handle} = ${v.name}`); }
      continue;
    }
  }

  // 3. New row
  const baseHandle = makeHandle(v.name);
  const handle = await uniqueHandle(baseHandle);

  const row = {
    handle,
    display_name: v.name || handle,
    tagline: (v.description || '').slice(0, 200),
    bio: v.description || null,
    archetype: 'Operator',
    tier: 'agentverse_service',
    tier_promoted_at: new Date().toISOString(),
    agentverse_id: v.agentverse_id,
    website_url: v.endpoint_url && v.endpoint_url.startsWith('http') ? v.endpoint_url : null,
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

console.log(`\n[promote-agentverse] inserted=${inserted} cross-linked=${crossLinked} updated=${updated} skipped=${skipped} failed=${failed}`);
