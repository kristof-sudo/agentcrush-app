/**
 * telemetry-export-worker.mjs — B13 daily machine-traffic export.
 *
 * Runs at 03:25 UTC daily (before the 03:30 morning brief, so the brief can
 * include yesterday's machine-traffic line).
 *
 * 1. Reads yesterday's api_telemetry_daily rows from Supabase
 * 2. Writes a daily JSON to the VPS brain clone:
 *      /opt/agentcrush-brain/Fetchers/telemetry/output/telemetry-YYYY-MM-DD.json
 *    (auto-sync picks it up like the other Fetchers outputs)
 * 3. Sends a one-line Telegram summary to Kris
 *
 * The headline numbers — THE distribution KPI per the 2026-06-10 decision:
 *   - total machine (agent-UA) calls
 *   - 402s quoted vs paid passes vs pro passes  (the conversion funnel)
 *
 * Cost: 0 LLM calls. Pure DB read + file write.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const SB_URL  = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');
const BRAIN_DIR = process.env.BRAIN_DIR || '/opt/agentcrush-brain';

async function tg(text) {
  if (!TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  }).catch(() => {});
}

const day = process.argv[2] || new Date(Date.now() - 86400000).toISOString().slice(0, 10);

console.log(`[telemetry-export] exporting ${day}...`);

const sb = createClient(SB_URL, SB_KEY);
const { data, error } = await sb
  .from('api_telemetry_daily')
  .select('endpoint, ua_class, outcome, count')
  .eq('day', day);

if (error) {
  console.error('[telemetry-export] query failed:', error.message);
  await tg(`⚠️ telemetry export failed for ${day}: ${error.message}`);
  process.exit(1);
}

const rows = data || [];
const sum = (pred) => rows.filter(pred).reduce((n, r) => n + r.count, 0);

const totals = {
  all_calls: sum(() => true),
  machine_calls: sum((r) => r.ua_class === 'agent'),
  browser_calls: sum((r) => r.ua_class === 'browser'),
  gated_402: sum((r) => r.outcome === 'gated_402'),
  paid_pass: sum((r) => r.outcome === 'paid_pass'),
  pro_pass: sum((r) => r.outcome === 'pro_pass'),
};
totals.paid_conversion_pct = totals.gated_402 > 0
  ? Math.round((totals.paid_pass / totals.gated_402) * 1000) / 10
  : null;

// ── Honest funnel segmentation ────────────────────────────────────────────
// The headline gated_402 is dominated by automated probing of a few per-handle
// endpoints (/api/agent/<handle>/trust-summary|history|verification-status for
// a handful of famous names). That inflates "quotes/day" ~500x over real
// purchase intent. Split the funnel so the conversion denominator reflects the
// flagship paid products we actually sell, not crawler noise.
// See brain Notes/2026-06-13-funnel-reality-decomposition.md.
const PER_HANDLE_RE = /^\/api\/agent\/[^/]+\//; // /api/agent/<handle>/... (NOT /api/agents/)
const isPerHandle = (ep) => PER_HANDLE_RE.test(ep);
const sumGated = (pred) => rows.filter((r) => r.outcome === 'gated_402' && pred(r.endpoint)).reduce((n, r) => n + r.count, 0);
const sumPaid  = (pred) => rows.filter((r) => (r.outcome === 'paid_pass' || r.outcome === 'pro_pass') && pred(r.endpoint)).reduce((n, r) => n + r.count, 0);

const gatedFlagship  = sumGated((ep) => !isPerHandle(ep));
const gatedPerHandle = sumGated((ep) => isPerHandle(ep));
const paidFlagship   = sumPaid((ep) => !isPerHandle(ep));

// Concentration: how much of all gated_402 is the single busiest endpoint —
// a high share is the bot-probe signature.
const gatedByEndpoint = {};
for (const r of rows) {
  if (r.outcome !== 'gated_402') continue;
  gatedByEndpoint[r.endpoint] = (gatedByEndpoint[r.endpoint] || 0) + r.count;
}
const topGated = Object.entries(gatedByEndpoint).sort((a, b) => b[1] - a[1])[0] || [null, 0];

totals.gated_402_flagship   = gatedFlagship;
totals.gated_402_per_handle = gatedPerHandle;
totals.flagship_conversion_pct = gatedFlagship > 0
  ? Math.round((paidFlagship / gatedFlagship) * 1000) / 10
  : null;
totals.top_gated_endpoint  = topGated[0];
totals.top_gated_share_pct = totals.gated_402 > 0
  ? Math.round((topGated[1] / totals.gated_402) * 1000) / 10
  : null;

const byEndpoint = {};
for (const r of rows) {
  byEndpoint[r.endpoint] = byEndpoint[r.endpoint] || { total: 0, agent: 0, outcomes: {} };
  byEndpoint[r.endpoint].total += r.count;
  if (r.ua_class === 'agent') byEndpoint[r.endpoint].agent += r.count;
  byEndpoint[r.endpoint].outcomes[r.outcome] = (byEndpoint[r.endpoint].outcomes[r.outcome] || 0) + r.count;
}

// B6 — per-key Pro usage (key prefixes only; table may not exist yet)
let keyUsage = [];
try {
  const { data: ku } = await sb
    .from('api_key_usage_daily')
    .select('key_prefix, endpoint, count')
    .eq('day', day);
  const byKey = {};
  for (const r of ku || []) {
    byKey[r.key_prefix] = byKey[r.key_prefix] || { key_prefix: r.key_prefix, total: 0, endpoints: {} };
    byKey[r.key_prefix].total += r.count;
    byKey[r.key_prefix].endpoints[r.endpoint] = (byKey[r.key_prefix].endpoints[r.endpoint] || 0) + r.count;
  }
  keyUsage = Object.values(byKey).sort((a, b) => b.total - a.total);
} catch { /* migration not applied yet */ }

const payload = {
  date: day,
  generated_at: new Date().toISOString(),
  kpi_note: 'Distribution KPI = machine_calls + paid funnel (gated_402 -> paid_pass/pro_pass). Zeros are valid numbers; print them honestly. HEADLINE gated_402 is inflated by per-handle bot probing (see top_gated_share_pct / gated_402_per_handle); flagship_conversion_pct over gated_402_flagship is the real purchase-intent funnel.',
  totals,
  by_endpoint: byEndpoint,
  pro_key_usage: keyUsage,
};

const outDir = path.join(BRAIN_DIR, 'Fetchers', 'telemetry', 'output');
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `telemetry-${day}.json`);
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`[telemetry-export] wrote ${outPath} (${rows.length} rows)`);

const keyLine = keyUsage.length
  ? ` · keys: ${keyUsage.slice(0, 3).map((k) => `${k.key_prefix}…×${k.total}`).join(', ')}${keyUsage.length > 3 ? ` +${keyUsage.length - 3} more` : ''}`
  : '';
await tg(
  `📡 Machine traffic ${day}: ${totals.machine_calls} agent calls / ${totals.all_calls} total\n` +
  `402s quoted: ${totals.gated_402} (flagship ${totals.gated_402_flagship} · per-handle probe ${totals.gated_402_per_handle})\n` +
  `paid: ${totals.paid_pass} · pro: ${totals.pro_pass}` +
  (totals.flagship_conversion_pct != null ? ` · flagship conv ${totals.flagship_conversion_pct}%` : '') +
  (totals.top_gated_share_pct != null ? `\ntop endpoint ${totals.top_gated_endpoint} = ${totals.top_gated_share_pct}% of all 402s` : '') +
  keyLine
);

console.log('[telemetry-export] done.');
