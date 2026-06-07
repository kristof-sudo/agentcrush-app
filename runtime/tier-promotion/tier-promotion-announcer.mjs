/**
 * tier-promotion-announcer.mjs — Weekly post announcing newly evidence-ranked agents.
 *
 * Runs: Sundays 07:45 UTC (15 min after tier-promotion-worker finishes at 07:00)
 *
 * Finds agents promoted to evidence_ranked in the last 7 days via tier_promoted_at.
 * Posts a single batch announcement — not per-agent (avoid spam).
 *
 * Post format:
 *   "📈 New to Evidence-Ranked this week on AgentCrush: ..."
 *
 * Cost: 0 LLM calls. Deduped by ISO week.
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

console.log('[tier-promotion-announcer] running...');

const week     = isoWeek();
const eventKey = `tier-promoted-${week}`;

if (await wasPostedThisWeek(eventKey)) {
  console.log(`[tier-promotion-announcer] already posted for ${week}, skipping.`);
  process.exit(0);
}

const sb = createClient(SB_URL, SB_KEY);

// Find agents promoted to evidence_ranked in the last 7 days
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const { data: promoted, error } = await sb
  .from('agents')
  .select('handle, display_name, primary_category, tier_promoted_at, visibility_score')
  .eq('tier', 'evidence_ranked')
  .gte('tier_promoted_at', cutoff)
  .order('visibility_score', { ascending: false })
  .limit(10);

if (error) {
  console.error('[tier-promotion-announcer] query error:', error.message);
  await tg(`❌ Tier promotion announcer failed: ${error.message}`);
  process.exit(1);
}

if (!promoted || promoted.length === 0) {
  console.log('[tier-promotion-announcer] no promotions this week — skipping post.');
  // Still mark as processed so we don't retry
  await markPosted(eventKey, { count: 0, week, skipped: true });
  process.exit(0);
}

// Build post text
const capCount = Math.min(promoted.length, 7); // cap at 7 to stay within 280 chars
const shown    = promoted.slice(0, capCount);

const lines = [
  `📈 New to Evidence-Ranked this week (${week}):`,
  ``,
];

for (const a of shown) {
  const name   = a.display_name || a.handle;
  const catStr = CAT_LABEL[a.primary_category] || a.primary_category || '';
  lines.push(`• ${name}${catStr ? ` (${catStr})` : ''}`);
}

if (promoted.length > capCount) {
  lines.push(`• +${promoted.length - capCount} more`);
}

lines.push(
  ``,
  `Evidence-ranked = verified signals across GitHub, social, and registries.`,
  ``,
  `agentcrush.xyz/rankings`,
);

const postText = lines.join('\n');

// Check char length — X limit is 280; if over, trim definitions line
const finalText = postText.length <= 280
  ? postText
  : lines.filter((_, i) => i !== lines.length - 4).join('\n'); // drop the definition line

console.log('[tier-promotion-announcer] posting:\n', finalText);

const result = await trustFallPost({
  text: finalText,
  platform: 'x',
  reason: 'tier-promoted-weekly',
}).catch(e => ({ ok: false, message: e.message }));

console.log('[tier-promotion-announcer] post result:', result);

await markPosted(eventKey, {
  count: promoted.length,
  agents: shown.map(a => a.handle),
  week,
});

await tg([
  `📈 *Tier Promotion Announcer* — ${week}`,
  `${promoted.length} agent${promoted.length !== 1 ? 's' : ''} promoted to Evidence-Ranked`,
  result.ok !== false
    ? `✓ Posted to X`
    : `✗ Post failed: ${String(result.message).slice(0, 80)}`,
].join('\n'));

console.log('[tier-promotion-announcer] done.');
