/**
 * Cross-protocol presence aggregator v0
 *
 * For each tokenized or service agent (with cross_protocol_search_keywords),
 * ILIKE-scans the 6 source tables for keyword mentions. Writes per-source
 * counts to cross_protocol_presence.
 *
 * Same shape as runtime/deployment-aggregator.mjs but generalized for
 * tokenized + service categories. Skips the agent's "own source" to avoid
 * self-reference (tokenized skips virtuals_agents, service skips a2a_agents
 * + agentverse_agents).
 *
 * Usage:
 *   node runtime/cross-protocol-aggregator.mjs --dry-run
 *   node runtime/cross-protocol-aggregator.mjs --write
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');

if (!isDryRun && !isWrite) {
  console.error('Usage: node runtime/cross-protocol-aggregator.mjs [--dry-run | --write]');
  process.exit(1);
}

const ENV_CANDIDATES = [
  '/opt/agentcrush/scanner/.env',
  '/opt/agentcrush/.env',
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env'),
];

async function loadEnv() {
  for (const p of ENV_CANDIDATES) {
    try {
      const buf = await fs.readFile(p, 'utf8');
      for (const line of buf.split('\n')) {
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const i = line.indexOf('=');
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        if (k && !process.env[k]) process.env[k] = v;
      }
    } catch {}
  }
}
await loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Source-table scan configuration ───────────────────────────────────────────

const SOURCES = [
  { table: 'agents',             columns: ['bio', 'tagline', 'bio_extended'], idCol: 'handle' },
  { table: 'bazaar_resources',   columns: ['description'],                     idCol: 'resource_url' },
  { table: 'erc8004_registry',   columns: ['agent_name'],                      idCol: 'token_id' },
  { table: 'agentverse_agents',  columns: ['description'],                     idCol: 'agentverse_id' },
  { table: 'virtuals_agents',    columns: ['description'],                     idCol: 'uid' },
  { table: 'a2a_agents',         columns: ['description'],                     idCol: 'repo_full_name' },
];

// Which sources to SKIP per agent category (the source they came from — avoid self-reference)
function selfSources(primaryCat, secondaryCats) {
  const cats = new Set([primaryCat, ...(secondaryCats || [])]);
  const skips = new Set();
  if (cats.has('tokenized')) skips.add('virtuals_agents');
  if (cats.has('service'))   { skips.add('a2a_agents'); skips.add('agentverse_agents'); }
  // Model_family agents shouldn't reach this aggregator (they use model_family_deployments)
  return skips;
}

function orILIKE(qb, columns, keywords) {
  const parts = [];
  for (const col of columns) {
    for (const kw of keywords) {
      const safe = String(kw).replace(/,/g, '');
      parts.push(`${col}.ilike.%${safe}%`);
    }
  }
  return qb.or(parts.join(','));
}

function findMatchedKeyword(row, columns, keywords) {
  const haystack = columns.map((c) => String(row[c] || '')).join(' \n ').toLowerCase();
  for (const kw of keywords) {
    if (haystack.includes(String(kw).toLowerCase())) return kw;
  }
  return null;
}

async function main() {
  console.log('→ Reading tokenized + service agents with cross_protocol_search_keywords …');
  const { data: agentsList, error } = await sb
    .from('agents')
    .select('handle, display_name, primary_category, secondary_categories, cross_protocol_search_keywords')
    .or('primary_category.eq.tokenized,primary_category.eq.service,secondary_categories.cs.{tokenized},secondary_categories.cs.{service}')
    .not('cross_protocol_search_keywords', 'eq', '{}');
  if (error) throw error;
  console.log(`  ${agentsList?.length || 0} agents with keywords`);

  const allRows = [];

  for (const a of agentsList || []) {
    const kw = a.cross_protocol_search_keywords || [];
    if (kw.length === 0) continue;
    const skips = selfSources(a.primary_category, a.secondary_categories);

    console.log(`\n→ ${a.handle} (${a.primary_category}${a.secondary_categories?.length ? '+' + a.secondary_categories.join(',') : ''})`);
    console.log(`  keywords: [${kw.join(', ')}]`);

    let agentTotal = 0;

    for (const src of SOURCES) {
      if (skips.has(src.table)) {
        console.log(`  ${src.table.padEnd(22)} SKIP (self-source)`);
        continue;
      }
      let qb = sb.from(src.table).select(`${src.idCol}, ${src.columns.join(', ')}`);
      // Exclude self for agents source
      if (src.table === 'agents') qb = qb.neq('handle', a.handle);
      qb = orILIKE(qb, src.columns, kw);
      qb = qb.limit(10000);

      const { data, error: qErr } = await qb;
      if (qErr) { console.log(`  ${src.table.padEnd(22)} ERR: ${qErr.message}`); continue; }
      const rows = data || [];
      const samples = rows.slice(0, 10).map((r) => ({
        id: r[src.idCol],
        matched_keyword: findMatchedKeyword(r, src.columns, kw),
        snippet: (src.columns.map(c => r[c] || '').join(' | ') || '').slice(0, 200),
      }));
      console.log(`  ${src.table.padEnd(22)} matches=${rows.length}`);
      agentTotal += rows.length;
      allRows.push({
        agent_handle: a.handle,
        source_table: src.table,
        match_count: rows.length,
        sample_matches: samples,
        match_keywords: kw,
        last_aggregated_at: new Date().toISOString(),
      });
    }
    const projectedScore = agentTotal > 0
      ? Math.min(100, Math.round(Math.log10(Math.max(1, agentTotal)) * 25))
      : 0;
    console.log(`  TOTAL: ${agentTotal}  → projected cross_protocol_score: ${projectedScore}`);
  }

  if (isDryRun) {
    console.log(`\n[DRY-RUN] would upsert ${allRows.length} rows.`);
    return;
  }
  console.log(`\n→ Upserting ${allRows.length} rows into cross_protocol_presence …`);
  for (let b = 0; b < allRows.length; b += 50) {
    const chunk = allRows.slice(b, b + 50);
    const { error: upErr } = await sb
      .from('cross_protocol_presence')
      .upsert(chunk, { onConflict: 'agent_handle,source_table' });
    if (upErr) { console.error('FAIL:', upErr.message); throw upErr; }
  }
  console.log('✓ done.');
}

await main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
