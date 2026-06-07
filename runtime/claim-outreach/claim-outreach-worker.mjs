/**
 * claim-outreach-worker.mjs — Weekly post surfacing top unclaimed agents.
 *
 * Runs: Mondays 09:00 UTC
 *
 * Strategy: passive builds (Ghost Index, Trust Eval) tell the story of what's missing.
 * This worker is the active complement — it calls out the gap publicly, creating
 * social proof that claiming matters and making maintainers aware.
 *
 * Post format:
 *   "🔔 Top unclaimed agents in the AgentCrush index this week: ..."
 *
 * Cost: 0 LLM calls. Deduped by ISO week so it never double-posts.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { trustFallPost } from '../decision-card/action-dispatcher.mjs';

const BRAIN    = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID  = String(process.env.TELEGRAM_CHAT_ID || '');
const SB_URL   = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const POSTED_LOG = path.join(BRAIN, 'Agents/decision-card/trust-fall-posted.jsonl');

const CAT_LABEL = {
  developer: 'Developer', tokenized: 'Tokenized', service: 'Service',
  model_family: 'Model Family', mcp_server: 'MCP Server',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function wasPostedThisWeek(key) {
  try {
    const raw = await fs.readFile(POSTED_LOG, 'utf-8');
    return raw.split('\n').filter(Boolean).some(l => {
      try { return JSON.parse(l).event_key === key; } catch (_) { return false; }
    });
  } catch (_) { return false; }
}

async function markPosted(key, meta = {}) {
  await fs.mkdir(path.dirname(POSTED_LOG), { recursive: true });
  await fs.appendFile(POSTED_LOG, JSON.stringify({ ts: new Date().toISOString(), event_key: key, ...meta }) + '\n');
}

async function tg(text) {
  if (!TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('[claim-outreach] running...');

const week    = isoWeek();
const eventKey = `claim-outreach-${week}`;

if (await wasPostedThisWeek(eventKey)) {
  console.log(`[claim-outreach] already posted for ${week}, skipping.`);
  process.exit(0);
}

const sb = createClient(SB_URL, SB_KEY);

// Find top unclaimed agents by visibility_score
const { data: agents, error } = await sb
  .from('agents')
  .select('handle, display_name, primary_category, visibility_score, tier')
  .eq('claim_status', 'unclaimed')
  .not('visibility_score', 'is', null)
  .gt('visibility_score', 0)
  .order('visibility_score', { ascending: false })
  .limit(5);

if (error) {
  console.error('[claim-outreach] query error:', error.message);
  await tg(`❌ Claim outreach worker failed: ${error.message}`);
  process.exit(1);
}

if (!agents || agents.length === 0) {
  console.log('[claim-outreach] no unclaimed agents found — skipping post.');
  process.exit(0);
}

// Build post text
const lines = [
  `🔔 Top unclaimed agents in the AgentCrush index (${week}):`,
  ``,
];

for (const a of agents) {
  const name    = a.display_name || a.handle;
  const catStr  = CAT_LABEL[a.primary_category] || a.primary_category || 'Unknown';
  const scoreStr = a.visibility_score ? `score: ${a.visibility_score}` : '';
  lines.push(`• ${name} — ${catStr}${scoreStr ? `, ${scoreStr}` : ''}`);
}

lines.push(
  ``,
  `These agents have real presence in the ecosystem but no claimed profile.`,
  ``,
  `Maintainers: claim at agentcrush.xyz/claim`,
);

const postText = lines.join('\n');
console.log('[claim-outreach] posting:\n', postText);

const result = await trustFallPost({
  text: postText,
  platform: 'x',
  reason: 'claim-outreach-weekly',
}).catch(e => ({ ok: false, message: e.message }));

console.log('[claim-outreach] post result:', result);

if (result.ok !== false) {
  await markPosted(eventKey, { agents: agents.map(a => a.handle), week });
}

await tg([
  `🔔 *Claim Outreach* — ${week}`,
  `${agents.length} unclaimed agents surfaced`,
  result.ok !== false
    ? `✓ Posted to X`
    : `✗ Post failed: ${String(result.message).slice(0, 80)}`,
].join('\n'));

console.log('[claim-outreach] done.');
