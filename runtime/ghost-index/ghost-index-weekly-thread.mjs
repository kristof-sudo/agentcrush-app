/**
 * ghost-index-weekly-thread.mjs — Wednesday Ghost Index post.
 *
 * Reads the last 2 weeks of ghost_index_daily snapshots, computes deltas per
 * category, and drafts an X thread + Farcaster cast comparing this week vs
 * last week. Drafts go to Telegram for Kris's manual approval + post.
 *
 * Runs: Wednesday 14:00 UTC
 * Systemd: agentcrush-ghost-index-weekly.timer
 * Cost: $0.00 (no LLM — deterministic from DB)
 *
 * Skip rule: if |total delta| < 0.5pp, skip the post. Per posting-cadence.md
 * the rule is "silence > noise" for this surface.
 */

import { createClient } from '@supabase/supabase-js';

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');
const SB_URL  = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const CATEGORY_LABEL = {
  developer:    'Developer',
  tokenized:    'Tokenized',
  service:      'Service',
  model_family: 'Model Families',
  mcp_server:   'MCP Servers',
};

// Categories where the 0% reading is a measurement artifact, not real death.
// Hide their delta from the post until ingestion lands.
const PENDING_INGESTION = new Set(['service', 'tokenized']);

const MIN_DELTA_PP = 0.5;

async function tg(text) {
  if (!TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  }).catch(() => {});
}

function fmtDelta(pp) {
  if (pp == null || Number.isNaN(pp)) return 'n/a';
  const v = Number(pp).toFixed(1);
  if (Number(v) > 0) return `↑ ${v}pp`;
  if (Number(v) < 0) return `↓ ${Math.abs(v)}pp`;
  return 'flat';
}

function fmtPct(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Number(v).toFixed(1)}%`;
}

function isoWeekNumber(d) {
  // Returns YYYY-W## for the ISO week of date d.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function main() {
  if (!SB_URL || !SB_KEY) {
    console.error('[ghost-weekly] missing Supabase env');
    process.exit(2);
  }
  const sb = createClient(SB_URL, SB_KEY);

  // Pull the last 14 daily snapshots
  const { data: snapshots, error } = await sb
    .from('ghost_index_daily')
    .select('snapshot_date, liveness_score, total_agents, alive_agents, category_breakdown')
    .order('snapshot_date', { ascending: false })
    .limit(14);

  if (error || !snapshots?.length) {
    console.error('[ghost-weekly] no snapshots available:', error?.message);
    await tg(`⚠️ *Ghost Index thread skipped* — no snapshots available (${error?.message || 'empty'}).`);
    process.exit(1);
  }

  const today = snapshots[0];
  // Find snapshot ~7 days back (closest match)
  const weekAgoTargetDate = new Date(today.snapshot_date);
  weekAgoTargetDate.setUTCDate(weekAgoTargetDate.getUTCDate() - 7);
  const weekAgoIso = weekAgoTargetDate.toISOString().slice(0, 10);
  const weekAgo = snapshots.find(s => s.snapshot_date <= weekAgoIso) || snapshots[snapshots.length - 1];

  const deltaTotal = Number(today.liveness_score) - Number(weekAgo.liveness_score);

  // Per-category delta
  const todayCats = today.category_breakdown || {};
  const lastCats  = weekAgo.category_breakdown || {};
  const catDeltas = [];
  for (const [cat, td] of Object.entries(todayCats)) {
    if (PENDING_INGESTION.has(cat)) continue;
    const tdPct = Number(td.liveness);
    const lastPct = lastCats[cat] ? Number(lastCats[cat].liveness) : null;
    const delta = lastPct != null ? tdPct - lastPct : null;
    catDeltas.push({ cat, tdPct, delta, alive: td.alive, total: td.total });
  }
  // Sort by absolute delta desc (biggest movers first)
  catDeltas.sort((a, b) => Math.abs((b.delta ?? 0)) - Math.abs((a.delta ?? 0)));

  // Skip rule
  if (Math.abs(deltaTotal) < MIN_DELTA_PP && catDeltas.every(c => Math.abs(c.delta || 0) < MIN_DELTA_PP)) {
    const msg = `🌫 *Ghost Index thread skipped* — delta within noise floor (<${MIN_DELTA_PP}pp). Total: ${fmtPct(today.liveness_score)} → ${fmtPct(weekAgo.liveness_score)}. Will check again next Wednesday.`;
    console.log(msg.replace(/\*/g, ''));
    await tg(msg);
    return;
  }

  const week = isoWeekNumber(new Date(today.snapshot_date));

  // ── X thread (3 tweets) ────────────────────────────────────────────────────
  const xT1 =
`Ghost Index ${week}.

${fmtPct(today.liveness_score)} of indexed AI agents show signs of life. ${fmtDelta(deltaTotal)} vs last week.

${today.alive_agents.toLocaleString()} / ${today.total_agents.toLocaleString()} alive.`;

  const xT2 =
`By category:

${catDeltas.map(c => `${CATEGORY_LABEL[c.cat] || c.cat}: ${fmtPct(c.tdPct)} (${fmtDelta(c.delta)})`).join('\n')}`;

  const xT3 =
`Methodology + raw data:
agentcrush.xyz/ghost-index
agentcrush.xyz/methodology

Updated daily. Free JSON: /api/ghost-index/v1`;

  // ── Farcaster cast (single longer post) ────────────────────────────────────
  const fc =
`Ghost Index ${week}: ${fmtPct(today.liveness_score)} of indexed AI agents show signs of life. ${fmtDelta(deltaTotal)} vs last week.

${today.alive_agents.toLocaleString()} alive out of ${today.total_agents.toLocaleString()} indexed.

By category:
${catDeltas.map(c => `· ${CATEGORY_LABEL[c.cat] || c.cat} — ${fmtPct(c.tdPct)} (${fmtDelta(c.delta)})`).join('\n')}

Methodology + raw JSON: agentcrush.xyz/ghost-index`;

  // Draft message
  const draft =
`🌫 *Ghost Index — ${week}*

This week vs last week — drafts ready for review.

────────
*X thread (3 tweets)*

T1:
${xT1}

T2:
${xT2}

T3:
${xT3}

────────
*Farcaster (single cast)*

${fc}

────────
_Per posting-cadence.md: Wednesday 14:00 UTC, manual gate. Reply with the edited final, or skip._`;

  console.log('[ghost-weekly] draft sent to Telegram for approval');
  await tg(draft);
}

main().catch(err => {
  console.error('[ghost-weekly] FATAL:', err);
  tg(`⚠️ *Ghost Index weekly worker failed*: ${err.message}`).then(() => process.exit(1));
});
