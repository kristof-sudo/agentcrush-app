/**
 * ghost-index-worker.mjs — Nightly Ghost Index computation + social post.
 *
 * Runs at 23:50 UTC daily.
 *
 * 1. Reads ghost_index_live view from Supabase
 * 2. Upserts today's snapshot to ghost_index_daily
 * 3. Posts to X via action-dispatcher trustFallPost()
 * 4. Sends Telegram summary to Kris
 *
 * Cost: 0 LLM calls. Pure DB read + write + social post.
 * The post text is deterministic — no generation needed.
 */

import { createClient } from '@supabase/supabase-js';
import { trustFallPost } from '../decision-card/action-dispatcher.mjs';

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');
const SB_URL  = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

async function tg(text) {
  if (!TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  }).catch(() => {});
}

const SENTIMENT = score =>
  score < 10  ? 'Graveyard 💀' :
  score < 25  ? 'Haunted 👻'   :
  score < 50  ? 'Struggling 😬' :
  score < 75  ? 'Active ✅'    :
               'Thriving 🚀';

function buildPostText(data, delta7d) {
  const { liveness_score, total_agents, alive_agents, category_breakdown } = data;
  const score = Number(liveness_score);
  const sentiment = SENTIMENT(score);

  // Top alive category
  let topCat = null;
  let topPct = 0;
  for (const [cat, d] of Object.entries(category_breakdown || {})) {
    if (Number(d.liveness) > topPct) { topPct = Number(d.liveness); topCat = cat; }
  }

  const deltaStr = delta7d != null
    ? (delta7d > 0 ? ` ↑${delta7d}pp` : delta7d < 0 ? ` ↓${Math.abs(delta7d)}pp` : ' flat')
    : '';

  const lines = [
    `👻 Ghost Index: ${score}%${deltaStr} — ${sentiment}`,
    ``,
    `${alive_agents.toLocaleString()} of ${total_agents.toLocaleString()} indexed AI agents show signs of life.`,
  ];

  if (topCat) {
    const label = { developer: 'Developer', tokenized: 'Tokenized', service: 'Service', model_family: 'Model Families', mcp_server: 'MCP Servers' }[topCat] || topCat;
    lines.push(`Most active category: ${label} at ${topPct}%`);
  }

  lines.push(``, `agentcrush.xyz/ghost-index`);

  return lines.join('\n');
}

console.log('[ghost-index-worker] running...');

const sb = createClient(SB_URL, SB_KEY);

// 1. Read live view
const { data: live, error: liveErr } = await sb.from('ghost_index_live').select('*').single();
if (liveErr) {
  console.error('[ghost-index-worker] live view error:', liveErr.message);
  await tg(`❌ Ghost Index worker failed: ${liveErr.message}`);
  process.exit(1);
}

console.log(`[ghost-index-worker] live score: ${live.liveness_score}% (${live.alive_agents}/${live.total_agents} alive)`);

// 2. Upsert snapshot
const today = new Date().toISOString().slice(0, 10);
const { error: upsertErr } = await sb.from('ghost_index_daily').upsert({
  snapshot_date:      today,
  liveness_score:     live.liveness_score,
  total_agents:       live.total_agents,
  alive_agents:       live.alive_agents,
  ghost_agents:       live.ghost_agents,
  category_breakdown: live.category_breakdown,
  evidence_ranked:    live.evidence_ranked,
  indexed_only:       live.indexed_only,
  computed_at:        new Date().toISOString(),
  methodology_version: 'v1.0',
}, { onConflict: 'snapshot_date' });

if (upsertErr) {
  console.error('[ghost-index-worker] upsert error:', upsertErr.message);
  await tg(`❌ Ghost Index upsert failed: ${upsertErr.message}`);
  process.exit(1);
}

console.log('[ghost-index-worker] snapshot upserted for', today);

// 3. Compute 7-day delta
const { data: history } = await sb
  .from('ghost_index_daily')
  .select('snapshot_date, liveness_score')
  .order('snapshot_date', { ascending: false })
  .limit(8);

const weekAgo = history?.find((_, i) => i >= 7);
const delta7d = weekAgo
  ? Number((Number(live.liveness_score) - Number(weekAgo.liveness_score)).toFixed(1))
  : null;

// 4. Post to X (trust-fall lane)
const postText = buildPostText(live, delta7d);
console.log('[ghost-index-worker] posting:', postText.slice(0, 60), '...');

const postResult = await trustFallPost({
  text: postText,
  platform: 'x',
  reason: 'ghost-index-daily',
}).catch(e => ({ ok: false, message: e.message }));

console.log('[ghost-index-worker] post result:', postResult);

// 5. Telegram summary
const score = Number(live.liveness_score);
const tgMsg = [
  `👻 *Ghost Index* — ${score}% alive ${delta7d != null ? `(${delta7d > 0 ? '+' : ''}${delta7d}pp vs 7d ago)` : ''}`,
  `${live.alive_agents}/${live.total_agents} agents show activity`,
  `Snapshot saved for ${today}`,
  postResult.ok
    ? `✓ Posted to X: ${postResult.tweet_id ?? 'ok'}`
    : `✗ Post failed: ${postResult.message?.slice(0, 80)}`,
].join('\n');

await tg(tgMsg);

console.log('[ghost-index-worker] done.');
