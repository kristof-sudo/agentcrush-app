/**
 * Model-family deployment aggregator v0
 *
 * Local SQL aggregation — no external API calls. For each model_family agent,
 * scans text fields across our existing 6 source tables for keyword mentions
 * and writes per-source deployment counts into `model_family_deployments`.
 *
 * Step (c.4) of the Category Index Pivot. THE moat signal — measures "which
 * model families is the agent economy actually deploying," a question only
 * AgentCrush can answer because only AgentCrush has the cross-protocol index
 * (Bazaar + ERC-8004 + Agentverse + Virtuals + A2A + our own agents table).
 *
 * Usage:
 *   node runtime/deployment-aggregator.mjs --dry-run    # summary only
 *   node runtime/deployment-aggregator.mjs --write      # upsert into Supabase
 *
 * Sources scanned + text field:
 *   - agents.{bio, tagline, bio_extended}              (excluding the model_family agent itself)
 *   - bazaar_resources.description
 *   - erc8004_registry.agent_name
 *   - agentverse_agents.{description, tags}
 *   - virtuals_agents.description
 *   - a2a_agents.{description, topics}
 *
 * Match strategy: ILIKE '%keyword%' (case-insensitive substring). Multiple
 * keywords OR'd together. We store the top-10 sample matches per source for
 * transparency (so we can review for false positives later).
 *
 * Idempotent. Upserts on (model_family_handle, source_table).
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');

if (!isDryRun && !isWrite) {
  console.error('Usage: node runtime/deployment-aggregator.mjs [--dry-run | --write]');
  process.exit(1);
}

// ── Env loader (matches citations-adapter.mjs) ────────────────────────────────

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
    } catch { /* file missing — ok */ }
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
// Each entry: { table, columns: [..], snippetFn: (row) => "text for sample_matches" }

const SOURCES = [
  {
    table: 'agents',
    columns: ['bio', 'tagline', 'bio_extended'],
    idCol: 'handle',
    snippet: (r) => r.bio || r.tagline || r.bio_extended || '',
  },
  {
    table: 'bazaar_resources',
    columns: ['description'],
    idCol: 'resource_url',
    snippet: (r) => r.description || '',
  },
  {
    table: 'erc8004_registry',
    columns: ['agent_name'],
    idCol: 'token_id',
    snippet: (r) => r.agent_name || '',
  },
  {
    table: 'agentverse_agents',
    columns: ['description'], // tags is JSONB — skipping for v0 (PostgREST ilike fails on jsonb)
    idCol: 'agentverse_id',
    snippet: (r) => r.description || '',
  },
  {
    table: 'virtuals_agents',
    columns: ['description'],
    idCol: 'uid',
    snippet: (r) => r.description || '',
  },
  {
    table: 'a2a_agents',
    columns: ['description'], // topics is JSONB — skipping for v0
    idCol: 'repo_full_name',
    snippet: (r) => r.description || '',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function orILIKE(qb, columns, keywords) {
  // Build an OR filter across columns × keywords.
  // PostgREST .or() string syntax: col1.ilike.%kw%,col2.ilike.%kw%
  const parts = [];
  for (const col of columns) {
    for (const kw of keywords) {
      // Escape commas/parens in keywords (none expected in our seed set, but safe)
      const safe = kw.replace(/,/g, '');
      parts.push(`${col}.ilike.%${safe}%`);
    }
  }
  return qb.or(parts.join(','));
}

function findMatchedKeyword(row, columns, keywords) {
  const haystack = columns.map((c) => String(row[c] || '')).join(' \n ').toLowerCase();
  for (const kw of keywords) {
    if (haystack.includes(kw.toLowerCase())) return kw;
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('→ Reading model_family agents + keywords …');
  const { data: families, error: fErr } = await sb
    .from('agents')
    .select('handle, display_name, model_family_search_keywords')
    .eq('primary_category', 'model_family')
    .not('model_family_search_keywords', 'eq', '{}');
  if (fErr) throw fErr;
  console.log(`  ${families?.length || 0} model_family agents with keywords`);

  const allRows = [];

  for (const fam of families || []) {
    const kw = fam.model_family_search_keywords || [];
    if (kw.length === 0) continue;

    console.log(`\n→ ${fam.handle} (${fam.display_name})`);
    console.log(`  keywords: [${kw.join(', ')}]`);

    let agentTotal = 0;

    for (const src of SOURCES) {
      // Build query
      let qb = sb.from(src.table).select(`${src.idCol}, ${src.columns.join(', ')}`);

      // For agents source, exclude the model_family agent itself
      if (src.table === 'agents') {
        qb = qb.neq('handle', fam.handle);
      }

      qb = orILIKE(qb, src.columns, kw);
      qb = qb.limit(10000); // safety cap

      const { data, error, count } = await qb;
      if (error) {
        console.log(`  ${src.table.padEnd(22)} ERR: ${error.message}`);
        continue;
      }

      const rows = data || [];
      const samples = rows.slice(0, 10).map((r) => ({
        id: r[src.idCol],
        matched_keyword: findMatchedKeyword(r, src.columns, kw),
        snippet: (src.snippet(r) || '').slice(0, 200),
      }));

      console.log(`  ${src.table.padEnd(22)} matches=${rows.length}`);
      agentTotal += rows.length;

      allRows.push({
        model_family_handle: fam.handle,
        source_table: src.table,
        deployment_count: rows.length,
        sample_matches: samples,
        match_keywords: kw,
        last_aggregated_at: new Date().toISOString(),
      });
    }

    // Apply scoring formula for the summary print
    const projectedScore = agentTotal > 0
      ? Math.min(100, Math.round(Math.log10(Math.max(1, agentTotal)) * 30))
      : 0;
    console.log(`  TOTAL deployments: ${agentTotal}  → projected deployment_score: ${projectedScore}`);
  }

  // ── Write ───────────────────────────────────────────────────────────────────
  if (isDryRun) {
    console.log(`\n[DRY-RUN] would upsert ${allRows.length} rows. Re-run with --write to commit.`);
    return;
  }

  console.log(`\n→ Upserting ${allRows.length} rows into model_family_deployments …`);
  let upserted = 0;
  for (let b = 0; b < allRows.length; b += 50) {
    const chunk = allRows.slice(b, b + 50);
    const { error: upErr } = await sb
      .from('model_family_deployments')
      .upsert(chunk, { onConflict: 'model_family_handle,source_table' });
    if (upErr) {
      console.error(`  batch ${b}-${b + chunk.length} FAILED:`, upErr.message);
      throw upErr;
    }
    upserted += chunk.length;
    console.log(`  upserted ${upserted}/${allRows.length}`);
  }
  console.log('✓ done.');
}

await main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
