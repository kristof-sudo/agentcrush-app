/**
 * cost-monitor — Layer 2 sub-agent (Phase 2 item #1)
 *
 * Reads /var/log/agentcrush/anthropic-costs.jsonl (written by each Layer 2 worker
 * after every successful Anthropic call), aggregates spend, projects monthly
 * burn against the $10/mo cap from Memory.md, and pushes a Telegram alert if
 * we drift toward the ceiling.
 *
 * Each worker appends one JSONL line per successful call:
 *   {ts, worker, model, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens}
 *
 * Env (loaded from /opt/agentcrush/fetchers/.env when run by systemd):
 *   TELEGRAM_BOT_TOKEN   — required for alerts
 *   TELEGRAM_CHAT_ID     — required for alerts
 *   COST_LOG_PATH        — default /var/log/agentcrush/anthropic-costs.jsonl
 *   COST_MONTHLY_CAP_USD — default 10
 *   COST_WARN_PCT        — default 0.50 (warn when projected monthly > 50% of cap)
 *   COST_CRIT_PCT        — default 0.80
 *   COST_FORCE_REPORT    — "1" to always send a report (smoke testing)
 *
 * Exit codes: 0 always (we never want this to break the timer chain).
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Config ────────────────────────────────────────────────────────────────────

const COST_LOG_PATH = process.env.COST_LOG_PATH || '/var/log/agentcrush/anthropic-costs.jsonl';
const MONTHLY_CAP_USD = Number(process.env.COST_MONTHLY_CAP_USD || 10);
const WARN_PCT = Number(process.env.COST_WARN_PCT || 0.5);
const CRIT_PCT = Number(process.env.COST_CRIT_PCT || 0.8);
const FORCE_REPORT = process.env.COST_FORCE_REPORT === '1';
const HISTORY_PATH = process.env.COST_MONITOR_HISTORY || '/var/log/agentcrush/cost-monitor-history.jsonl';

// Pricing USD per million tokens. Update when Anthropic changes prices or new models added.
// Cache_read is billed at 0.1x input; cache_creation at 1.25x input (Anthropic standard).
const MODEL_PRICING = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
};
const DEFAULT_PRICING = MODEL_PRICING['claude-haiku-4-5'];

// ── Cost log scan ─────────────────────────────────────────────────────────────

function readCostLog() {
  if (!fs.existsSync(COST_LOG_PATH)) return [];
  const raw = fs.readFileSync(COST_LOG_PATH, 'utf-8');
  const events = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec;
    try { rec = JSON.parse(trimmed); } catch { continue; }
    if (!rec.ts || !rec.model) continue;
    events.push(priceEvent(rec));
  }
  return events;
}

function priceEvent(rec) {
  const p = MODEL_PRICING[rec.model] || DEFAULT_PRICING;
  const input = Number(rec.input_tokens || 0);
  const output = Number(rec.output_tokens || 0);
  const cacheRead = Number(rec.cache_read_input_tokens || 0);
  const cacheCreate = Number(rec.cache_creation_input_tokens || 0);
  const cost =
    (input / 1e6) * p.input +
    (output / 1e6) * p.output +
    (cacheRead / 1e6) * p.input * 0.1 +
    (cacheCreate / 1e6) * p.input * 1.25;
  return {
    ts: rec.ts,
    unit: `${rec.worker}.service`,
    model: rec.model,
    input,
    output,
    cost_usd: cost,
  };
}

function aggregate(events, windowMs, now) {
  const cutoff = now - windowMs;
  let cost = 0;
  let input = 0;
  let output = 0;
  let calls = 0;
  for (const ev of events) {
    const t = Date.parse(ev.ts);
    if (!Number.isFinite(t) || t < cutoff) continue;
    cost += ev.cost_usd;
    input += ev.input;
    output += ev.output;
    calls += 1;
  }
  return { cost, input, output, calls };
}

// ── Report assembly ───────────────────────────────────────────────────────────

function fmtUSD(n) {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function buildReport({ now, last24h, last7d, last30d, byService }) {
  const days30d = Math.min(30, Math.max(1, (now - earliestSeen) / 86_400_000));
  const projectedMonthly = (last30d.cost / days30d) * 30;
  const pctOfCap = projectedMonthly / MONTHLY_CAP_USD;

  let severity = 'ok';
  if (pctOfCap >= CRIT_PCT) severity = 'crit';
  else if (pctOfCap >= WARN_PCT) severity = 'warn';

  const emoji = severity === 'crit' ? '🚨' : severity === 'warn' ? '⚠️' : '✅';
  const headline = `${emoji} cost-monitor — projected monthly ${fmtUSD(projectedMonthly)} / ${fmtUSD(MONTHLY_CAP_USD)} cap (${(pctOfCap * 100).toFixed(0)}%)`;

  const perServiceLines = Object.entries(byService)
    .sort((a, b) => b[1].cost - a[1].cost)
    .map(([svc, agg]) => `  • ${svc.replace(/\.service$/, '')}: ${fmtUSD(agg.cost)} (${agg.calls} calls, ${agg.input + agg.output} tok)`)
    .join('\n');

  const body = [
    headline,
    '',
    `Last 24h: ${fmtUSD(last24h.cost)} (${last24h.calls} calls)`,
    `Last 7d:  ${fmtUSD(last7d.cost)} (${last7d.calls} calls)`,
    `Last 30d: ${fmtUSD(last30d.cost)} (${last30d.calls} calls)`,
    '',
    'By service (30d):',
    perServiceLines || '  (no events)',
    '',
    `Cap: ${fmtUSD(MONTHLY_CAP_USD)}/mo • Warn ${(WARN_PCT * 100).toFixed(0)}% • Crit ${(CRIT_PCT * 100).toFixed(0)}%`,
    `Source: ${COST_LOG_PATH}`,
  ].join('\n');

  return { severity, body, projectedMonthly };
}

let earliestSeen = Date.now();

// ── Telegram push ─────────────────────────────────────────────────────────────

async function pushTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.warn('[cost-monitor] TELEGRAM_BOT_TOKEN/CHAT_ID not set — skipping push');
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    console.warn(`[cost-monitor] Telegram error: ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
    return;
  }
  console.log(`[cost-monitor] Telegram sent (msg ${json.result?.message_id})`);
}

// ── History (idempotent: append a single record per run) ─────────────────────

function appendHistory(record) {
  try {
    fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
    fs.appendFileSync(HISTORY_PATH, JSON.stringify(record) + '\n');
  } catch (err) {
    console.warn(`[cost-monitor] history append failed: ${err.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const now = Date.now();
  const allEvents = readCostLog();
  const byService = {};
  for (const ev of allEvents) {
    if (!byService[ev.unit]) byService[ev.unit] = { cost: 0, input: 0, output: 0, calls: 0 };
    const t = Date.parse(ev.ts);
    if (t >= now - 30 * 86_400_000) {
      byService[ev.unit].cost += ev.cost_usd;
      byService[ev.unit].input += ev.input;
      byService[ev.unit].output += ev.output;
      byService[ev.unit].calls += 1;
    }
  }

  if (allEvents.length === 0) {
    earliestSeen = now - 86_400_000; // avoid division by zero
  } else {
    const oldest = allEvents.reduce((min, e) => Math.min(min, Date.parse(e.ts)), Infinity);
    if (Number.isFinite(oldest)) earliestSeen = oldest;
  }

  const last24h = aggregate(allEvents, 86_400_000, now);
  const last7d = aggregate(allEvents, 7 * 86_400_000, now);
  const last30d = aggregate(allEvents, 30 * 86_400_000, now);

  const report = buildReport({ now, last24h, last7d, last30d, byService });

  console.log(report.body);

  appendHistory({
    ts: new Date(now).toISOString(),
    severity: report.severity,
    projected_monthly_usd: Number(report.projectedMonthly.toFixed(4)),
    last_24h_usd: Number(last24h.cost.toFixed(4)),
    last_7d_usd: Number(last7d.cost.toFixed(4)),
    last_30d_usd: Number(last30d.cost.toFixed(4)),
    cap_usd: MONTHLY_CAP_USD,
    by_service: Object.fromEntries(
      Object.entries(byService).map(([k, v]) => [k, { cost_usd: Number(v.cost.toFixed(4)), calls: v.calls }])
    ),
  });

  // Push policy:
  //  - always push if severity != ok
  //  - always push on Monday (weekly summary)
  //  - always push if COST_FORCE_REPORT=1 (smoke test)
  const isMonday = new Date(now).getUTCDay() === 1;
  if (report.severity !== 'ok' || isMonday || FORCE_REPORT) {
    await pushTelegram(report.body);
  } else {
    console.log('[cost-monitor] severity=ok and not Monday — skipping Telegram push');
  }
}

main().catch((err) => {
  console.error(`[cost-monitor] FATAL: ${err.message}`);
  // Don't exit non-zero — we don't want a cost-monitor bug to mask itself in
  // systemd failure state. Log + move on; weekly summary will surface absence.
  process.exit(0);
});
