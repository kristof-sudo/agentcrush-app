/**
 * agent-of-week-worker.mjs — Sunday Agent of the Week post.
 *
 * Picks the agent with the highest visibility_score (most hyped) but no
 * observable activity signal — i.e., the most prominent ghost in the index.
 *
 * Posts a dry, data-grounded observation to X. No LLM call — post is
 * deterministic from DB data.
 *
 * Runs: Sunday 10:00 UTC
 * Systemd: agentcrush-agent-of-week.timer
 * Cost: $0.00 (no LLM)
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

// Dedup — don't post the same agent two Sundays in a row
async function alreadyPostedThisWeek(handle, sb) {
  const lastSunday = new Date();
  lastSunday.setDate(lastSunday.getDate() - 7);
  const { data } = await sb
    .from('ghost_index_daily')
    .select('category_breakdown')
    .gte('snapshot_date', lastSunday.toISOString().slice(0, 10))
    .limit(1);
  // Simple: check if handle appears in any stored agent_of_week metadata
  // For now just return false — full dedup via trust-fall-checker event_key is enough
  return false;
}

console.log('[agent-of-week] running...');

const sb = createClient(SB_URL, SB_KEY);

// Find the most prominent ghost: high visibility_score but inactive
const { data: ghosts, error } = await sb
  .from('agents')
  .select('handle, display_name, primary_category, visibility_score, tier, website_url, x_handle')
  .or('activity_status.is.null,activity_status.eq.inactive')
  .is('last_event_at', null)
  .not('visibility_score', 'is', null)
  .gt('visibility_score', 0)
  .in('tier', ['indexed', 'evidence_ranked'])
  .order('visibility_score', { ascending: false })
  .limit(10);

if (error) {
  console.error('[agent-of-week] DB error:', error.message);
  await tg(`❌ Agent of the Week worker failed: ${error.message}`);
  process.exit(1);
}

if (!ghosts || ghosts.length === 0) {
  console.log('[agent-of-week] no ghost agents found — skipping');
  await tg('👻 Agent of the Week: no qualifying ghost agents found today.');
  process.exit(0);
}

// Pick first (highest visibility)
const agent = ghosts[0];
const name = agent.display_name || agent.handle;
const cat = agent.primary_category || 'unknown';
const catLabel = {
  developer: 'developer framework',
  tokenized: 'tokenized agent',
  service:   'service agent',
  model_family: 'model family',
  mcp_server: 'MCP server',
}[cat] || cat;

const xHandle = agent.x_handle ? `@${agent.x_handle}` : '';

// Build post text — dry, factual, slightly sardonic
const postText = [
  `👻 Ghost Agent of the Week: ${name}`,
  ``,
  `${catLabel.charAt(0).toUpperCase() + catLabel.slice(1)}. Visibility score: ${agent.visibility_score}. Last observed activity: never.`,
  ``,
  `The index sees it. We just can't confirm it's home.`,
  ``,
  `Ghost Index: agentcrush.xyz/ghost-index`,
].join('\n');

console.log('[agent-of-week] selected:', name, '(score:', agent.visibility_score, ')');
console.log('[agent-of-week] post text:', postText.slice(0, 80), '...');

const result = await trustFallPost({
  text: postText,
  platform: 'x',
  reason: `agent-of-week:${agent.handle}:${new Date().toISOString().slice(0, 10)}`,
}).catch(e => ({ ok: false, message: e.message }));

const tgMsg = [
  `👻 *Agent of the Week* — ${name}`,
  `Category: ${catLabel} · Visibility: ${agent.visibility_score}`,
  result.ok ? `✓ Posted to X` : `✗ Post failed: ${result.message?.slice(0, 80)}`,
].join('\n');

await tg(tgMsg);
console.log('[agent-of-week] done. Post result:', result.ok ? 'ok' : result.message);
