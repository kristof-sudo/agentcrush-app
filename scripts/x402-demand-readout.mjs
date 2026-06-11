/**
 * x402-demand-readout.mjs — B19 phase 0: where x402 demand actually is.
 *
 * Computes a demand leaderboard from the bazaar_resources mirror (no new
 * collection; evidence tier: marketplace-reported — Bazaar self-published
 * quality metrics) and writes a daily JSON to the brain:
 *   <BRAIN_DIR>/Fetchers/x402-demand/output/x402-demand-YYYY-MM-DD.json
 *
 * Run anywhere with Supabase env (Mac: BRAIN_DIR=~/projects/agentcrush-brain;
 * VPS cron later: BRAIN_DIR=/opt/agentcrush-brain). 0 LLM calls.
 *
 *   node scripts/x402-demand-readout.mjs [--top=50]
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const BRAIN_DIR = process.env.BRAIN_DIR || path.join(os.homedir(), 'projects', 'agentcrush-brain');
const TOP_N = parseInt((process.argv.find((a) => a.startsWith('--top=')) || '--top=50').split('=')[1], 10);

const sb = createClient(SB_URL, SB_KEY);

// Page through live (non-removed) resources with reported call volume.
const PAGE = 1000;
let from = 0;
const rows = [];
for (;;) {
  const { data, error } = await sb
    .from('bazaar_resources')
    .select('resource_url, description, accepts, quality, last_updated_at')
    .is('removed_at', null)
    .gt('quality->l30DaysTotalCalls', 0)
    .order('quality->l30DaysTotalCalls', { ascending: false })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error('[x402-demand] query failed:', error.message);
    process.exit(1);
  }
  rows.push(...(data || []));
  if (!data || data.length < PAGE) break;
  from += PAGE;
}

const hostOf = (u) => {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
};

const totals = {
  resources_with_demand: rows.length,
  total_30d_calls: 0,
  total_30d_unique_payers_sum: 0, // sum across resources — payers overlap across resources, so an upper bound, not a wallet count
};
const byHost = {};
for (const r of rows) {
  const q = r.quality || {};
  const calls = Number(q.l30DaysTotalCalls) || 0;
  const payers = Number(q.l30DaysUniquePayers) || 0;
  totals.total_30d_calls += calls;
  totals.total_30d_unique_payers_sum += payers;
  const h = hostOf(r.resource_url);
  byHost[h] = byHost[h] || { host: h, resources: 0, calls_30d: 0, max_unique_payers_30d: 0 };
  byHost[h].resources += 1;
  byHost[h].calls_30d += calls;
  byHost[h].max_unique_payers_30d = Math.max(byHost[h].max_unique_payers_30d, payers);
}

const hostLeaderboard = Object.values(byHost)
  .sort((a, b) => b.calls_30d - a.calls_30d)
  .slice(0, TOP_N);

const resourceLeaderboard = rows.slice(0, TOP_N).map((r) => ({
  resource_url: r.resource_url,
  host: hostOf(r.resource_url),
  description: (r.description || '').slice(0, 140),
  calls_30d: Number(r.quality?.l30DaysTotalCalls) || 0,
  unique_payers_30d: Number(r.quality?.l30DaysUniquePayers) || 0,
  last_called_at: r.quality?.lastCalledAt || null,
  networks: [...new Set((r.accepts || []).map((a) => a?.network).filter(Boolean))],
}));

const day = new Date().toISOString().slice(0, 10);
const payload = {
  date: day,
  generated_at: new Date().toISOString(),
  evidence_tier: 'marketplace_reported',
  source: 'bazaar_resources mirror (Coinbase CDP Bazaar /discovery/resources, self-published quality metrics)',
  caveats: [
    'Bazaar quality metrics are self-reported by the marketplace, not chain-verified (phase 1 will verify on Base).',
    'unique_payers overlap across resources; the sum is an upper bound, not a distinct wallet count.',
  ],
  totals,
  host_leaderboard: hostLeaderboard,
  resource_leaderboard: resourceLeaderboard,
};

const outDir = path.join(BRAIN_DIR, 'Fetchers', 'x402-demand', 'output');
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `x402-demand-${day}.json`);
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`[x402-demand] ${rows.length} resources, ${totals.total_30d_calls.toLocaleString()} calls/30d → ${outPath}`);
