/**
 * x402-funnel-report-worker.mjs — Daily x402 conversion funnel report.
 *
 * Fires at 06:10 UTC (08:10 Budapest) — morning revenue check for Kris.
 *
 * Reads api_telemetry_daily for yesterday + prior 6 days (7d window):
 *   - Flagship gated_402 (non per-handle endpoints — real purchase intent)
 *   - paid_pass + pro_pass conversions
 *   - Flagship conversion %
 *   - Day-over-day delta on conv%
 *   - Plain-English interpretation (flat / improving / declining / dry spell)
 *
 * Also reads api_keys for active Pro subscriber count.
 *
 * No LLM calls. No brain file write. Pure Supabase read + Telegram send.
 *
 * Per-handle probe filter: /api/agent/<handle>/... endpoints are automated
 * bot probing (500x inflation). Flagship scope = everything else.
 * See brain Notes/2026-06-13-funnel-reality-decomposition.md.
 */

import { createClient } from '@supabase/supabase-js';

const SB_URL  = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');

const DAYS_BACK = 7;
const PER_HANDLE_RE = /^\/api\/agent\/[^/]+\//;
const isFlagship = (ep) => !PER_HANDLE_RE.test(ep);

async function tg(text) {
  if (!TOKEN || !CHAT_ID) {
    console.log('[x402-funnel] TG not configured, would send:\n' + text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!res.ok) console.error('[x402-funnel] TG error:', res.status, await res.text());
}

function pct(v) { return v == null ? 'n/a' : `${v}%`; }

function convDeltaStr(cur, prev) {
  if (cur == null || prev == null) return '';
  const d = Math.round((cur - prev) * 10) / 10;
  if (d === 0) return ' (=)';
  return d > 0 ? ` (+${d}pp)` : ` (${d}pp)`;
}

function computeDay(rows) {
  let gated_flagship = 0, gated_probe = 0, paid_pass = 0, pro_pass = 0;
  for (const r of rows) {
    if (r.outcome === 'gated_402') {
      if (isFlagship(r.endpoint)) gated_flagship += r.count;
      else gated_probe += r.count;
    } else if (r.outcome === 'paid_pass' && isFlagship(r.endpoint)) {
      paid_pass += r.count;
    } else if (r.outcome === 'pro_pass' && isFlagship(r.endpoint)) {
      pro_pass += r.count;
    }
  }
  const conversions = paid_pass + pro_pass;
  const conv_pct = gated_flagship > 0
    ? Math.round((conversions / gated_flagship) * 1000) / 10
    : null;
  return { gated_flagship, gated_probe, paid_pass, pro_pass, conversions, conv_pct };
}

function interpret(cur, prev) {
  if (!cur) return '⚠️ No telemetry data for report day.';
  if (cur.gated_flagship === 0) {
    return '⚠️ Zero demand signal — no flagship 402s quoted. Check endpoint wiring or traffic gap.';
  }
  if (cur.conversions === 0) {
    const suffix = prev && prev.conversions === 0 ? ' (multi-day dry spell)' : '';
    return `🟡 0 conversions${suffix} — ${cur.gated_flagship} 402s quoted, none converted. Review pricing page friction.`;
  }
  if (prev == null) {
    return `✅ ${cur.conversions} conversion${cur.conversions === 1 ? '' : 's'} — no prior-day baseline yet.`;
  }
  const cd = cur.conv_pct != null && prev.conv_pct != null
    ? Math.round((cur.conv_pct - prev.conv_pct) * 10) / 10
    : null;
  if (cd == null) return `✅ ${cur.conversions} conversion${cur.conversions === 1 ? '' : 's'}.`;
  if (Math.abs(cd) < 0.5) return `➡️ Flat — conv ${pct(cur.conv_pct)}, ±${Math.abs(cd)}pp vs prior day.`;
  if (cd > 0) return `📈 Conv up: ${pct(prev.conv_pct)} → ${pct(cur.conv_pct)} (+${cd}pp d/d).`;
  return `📉 Conv down: ${pct(prev.conv_pct)} → ${pct(cur.conv_pct)} (${cd}pp d/d).`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const reportDay = process.argv[2] || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const prevDay   = new Date(new Date(reportDay).getTime() - 86400000).toISOString().slice(0, 10);
const startDay  = new Date(new Date(reportDay).getTime() - (DAYS_BACK - 1) * 86400000).toISOString().slice(0, 10);

console.log(`[x402-funnel] report for ${reportDay} (prev: ${prevDay}, history from ${startDay})`);

if (!SB_URL || !SB_KEY) {
  console.error('[x402-funnel] missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

const sb = createClient(SB_URL, SB_KEY);

const [telRes, proRes] = await Promise.all([
  sb.from('api_telemetry_daily')
    .select('day, endpoint, outcome, count')
    .gte('day', startDay)
    .lte('day', reportDay),
  sb.from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('plan', 'pro'),
]);

if (telRes.error) {
  console.error('[x402-funnel] telemetry query failed:', telRes.error.message);
  await tg(`⚠️ x402 funnel report failed (${reportDay}): ${telRes.error.message}`);
  process.exit(1);
}

// Group rows by day
const byDay = {};
for (const r of telRes.data || []) {
  byDay[r.day] = byDay[r.day] || [];
  byDay[r.day].push(r);
}

const cur  = computeDay(byDay[reportDay] || []);
const prev = byDay[prevDay] ? computeDay(byDay[prevDay]) : null;

// 7-day conversion total
const wkConversions = Object.keys(byDay)
  .filter((d) => d >= startDay && d <= reportDay)
  .sort()
  .slice(-7)
  .reduce((n, d) => n + computeDay(byDay[d]).conversions, 0);

const proCount = proRes.error ? '?' : (proRes.count ?? 0);

const msg = [
  `💰 x402 Funnel — ${reportDay}`,
  ``,
  `Demand:  ${cur.gated_flagship} flagship 402s quoted`,
  `         (${cur.gated_probe} per-handle probe noise excluded)`,
  `Paid:    ${cur.paid_pass} x402 passes`,
  `Pro:     ${cur.pro_pass} Pro-key passes  |  ${proCount} active subscribers`,
  `Conv%:   ${pct(cur.conv_pct)}${convDeltaStr(cur.conv_pct, prev?.conv_pct)}`,
  ``,
  `7d conversions: ${wkConversions}`,
  ``,
  interpret(cur, prev),
].join('\n');

console.log('[x402-funnel]\n' + msg);
await tg(msg);
console.log('[x402-funnel] done.');
