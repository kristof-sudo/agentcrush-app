/**
 * trust-fall-checker.mjs — Autonomously posts tightly-scoped events without Kris's approval.
 *
 * Trust-fall scope (from architecture doc):
 *   ✅ Ranking delta ≥5 in top-20 (e.g. "crewai climbed +7 to #3 this week")
 *   ✅ New index page live (blog announce + X announce)
 *   ✅ Weekly digest published
 *   ✅ New evidence-ranked agent (first time it enters the ranked list)
 *
 * Everything else queues to the Morning Card.
 *
 * Runs: daily at 07:30 UTC (09:30 Budapest) after the executor morning run.
 * Systemd: agentcrush-trust-fall.timer
 *
 * Dedup: maintains a posted-log.jsonl so it never re-posts the same event.
 *
 * Cost: zero LLM calls for detection; Haiku only for text generation (~$0.001/post).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { trustFallPost } from './action-dispatcher.mjs';

const BRAIN = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');

const POSTED_LOG = path.join(BRAIN, 'Agents/decision-card/trust-fall-posted.jsonl');
const TRUST_LOG  = path.join(BRAIN, 'Agents/decision-card/trust-fall-log.jsonl');

// ── Dedup helpers ─────────────────────────────────────────────────────────────

async function loadPosted() {
  try {
    const raw = await fs.readFile(POSTED_LOG, 'utf-8');
    return new Set(raw.trim().split('\n').filter(Boolean).map(l => {
      try { return JSON.parse(l).event_key; } catch (_) { return null; }
    }).filter(Boolean));
  } catch (_) { return new Set(); }
}

async function markPosted(eventKey, meta = {}) {
  await fs.mkdir(path.dirname(POSTED_LOG), { recursive: true });
  await fs.appendFile(POSTED_LOG, JSON.stringify({ ts: new Date().toISOString(), event_key: eventKey, ...meta }) + '\n');
}

async function log(record) {
  await fs.mkdir(path.dirname(TRUST_LOG), { recursive: true });
  await fs.appendFile(TRUST_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n');
}

// ── Telegram notification ─────────────────────────────────────────────────────

async function tgNotify(text) {
  if (!TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── Text generation via Haiku ─────────────────────────────────────────────────

async function generatePost(prompt) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
      system: `You are AgentCrush — the evidence-ranked index of the AI agent economy.
Write a single X post (max 260 chars, no hashtags, no em-dashes that would look AI-generated, factual, concise).
Return ONLY the post text, nothing else. No quotes around it. No explanation.
Voice: direct, data-first, slightly observational. Not hype. Not generic.`,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const json = await res.json();
  return json.content?.[0]?.text?.trim() || '';
}

// ── Signal detectors ─────────────────────────────────────────────────────────

async function detectRankingMovers(posted) {
  // Read today's Ajsa brief for movers (>= ±5 in top-20)
  const today = new Date().toISOString().slice(0, 10);
  const briefPath = path.join(BRAIN, `Agents/ajsa/output/ajsa-brief-${today}.md`);
  let brief = '';
  try { brief = await fs.readFile(briefPath, 'utf-8'); } catch (_) { return []; }

  const events = [];
  // Pattern: "climbed +N to #M" or "rose N spots"
  const moverRe = /([A-Za-z0-9\-_]+).*?(?:climbed|rose|gained|jumped)\s+\+?(\d+).*?#(\d+)/gi;
  let m;
  while ((m = moverRe.exec(brief)) !== null) {
    const [, name, delta, rank] = m;
    const d = parseInt(delta, 10), r = parseInt(rank, 10);
    if (d >= 5 && r <= 20) {
      const key = `mover:${name.toLowerCase()}:${today}`;
      if (!posted.has(key)) events.push({ type: 'mover', name, delta: d, rank: r, key });
    }
  }
  return events.slice(0, 1); // Max 1 mover post per day
}

async function detectWeeklyDigest(posted) {
  // Check if weekly digest was published today (Sunday)
  const today = new Date().toISOString().slice(0, 10);
  const isWeekend = new Date().getDay() === 0;
  if (!isWeekend) return [];
  const key = `weekly-digest:${today}`;
  if (posted.has(key)) return [];
  // Check if the digest page would exist (approximate — just fire on Sunday)
  return [{ type: 'weekly-digest', date: today, key }];
}

async function detectNewEvidence(posted) {
  // Read ranking changes from brain if any new evidence-ranked agents today
  const today = new Date().toISOString().slice(0, 10);
  const key = `new-evidence:${today}`;
  if (posted.has(key)) return [];
  // Read today's build-suggestions or ajsa brief for "new" evidence-ranked mentions
  const briefPath = path.join(BRAIN, `Agents/ajsa/output/ajsa-brief-${today}.md`);
  try {
    const brief = await fs.readFile(briefPath, 'utf-8');
    if (/evidence.rank|newly ranked|promoted to/i.test(brief)) {
      return [{ type: 'new-evidence', date: today, key }];
    }
  } catch (_) {}
  return [];
}

// ── Post generators ───────────────────────────────────────────────────────────

async function postMover({ name, delta, rank }) {
  const prompt = `Write a short X post (max 240 chars) announcing: ${name} climbed +${delta} spots to #${rank} in the AgentCrush developer agent rankings this week. Include the rankings URL: agentcrush.xyz/rankings/developer. Factual, data-first. No hashtags.`;
  return generatePost(prompt);
}

async function postWeeklyDigest({ date }) {
  const weekNum = getISOWeek(new Date(date));
  const prompt = `Write a short X post (max 240 chars) announcing: AgentCrush W${weekNum} weekly digest is live — ecosystem signals, ranking movers, and protocol trends from the past 7 days. URL: agentcrush.xyz/weekly/${date.slice(0, 7)}/W${weekNum}. Factual, direct, no hashtags.`;
  return generatePost(prompt);
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('[trust-fall] checking for auto-post triggers...');

const posted = await loadPosted();
const [movers, digest, newEvidence] = await Promise.all([
  detectRankingMovers(posted),
  detectWeeklyDigest(posted),
  detectNewEvidence(posted),
]);

const allEvents = [...movers, ...digest, ...newEvidence];
console.log(`[trust-fall] ${allEvents.length} events found (movers:${movers.length} digest:${digest.length} new-evidence:${newEvidence.length})`);

if (!allEvents.length) {
  await log({ run: 'trust-fall', events: 0, note: 'nothing to post' });
  process.exit(0);
}

const results = [];
for (const event of allEvents) {
  console.log(`[trust-fall] processing ${event.type} key=${event.key}`);
  try {
    let text = '';
    if (event.type === 'mover') text = await postMover(event);
    else if (event.type === 'weekly-digest') text = await postWeeklyDigest(event);
    else if (event.type === 'new-evidence') text = await generatePost('Write a short X post (max 240 chars): AgentCrush just promoted new agents to evidence-ranked status — check the latest rankings at agentcrush.xyz/rankings. No hashtags, factual.');

    if (!text) { results.push({ event: event.key, ok: false, reason: 'empty text generated' }); continue; }

    const result = await trustFallPost({ text, platform: 'x', reason: event.type });
    await markPosted(event.key, { type: event.type, tweet_id: result.tweet_id });
    await log({ event: event.key, type: event.type, ok: true, tweet_id: result.tweet_id, text });
    results.push({ event: event.key, ok: true, tweet_id: result.tweet_id, text });
    console.log(`[trust-fall] posted ${event.key} → ${result.url}`);
  } catch (err) {
    console.error(`[trust-fall] ${event.key} failed: ${err.message}`);
    await log({ event: event.key, type: event.type, ok: false, error: err.message });
    results.push({ event: event.key, ok: false, error: err.message });
  }
}

// Telegram notify
const okCount = results.filter(r => r.ok).length;
const failCount = results.filter(r => !r.ok).length;
if (okCount > 0) {
  const lines = [`🤖 *Trust-fall* — ${okCount} auto-post${okCount !== 1 ? 's' : ''}`];
  for (const r of results.filter(r => r.ok)) {
    lines.push(`✓ ${r.event.split(':')[0]}: ${r.text?.slice(0, 80)}…`);
    if (r.tweet_id) lines.push(`  https://x.com/agentcrush_xyz/status/${r.tweet_id}`);
  }
  await tgNotify(lines.join('\n'));
}
if (failCount > 0) {
  await tgNotify(`⚠️ Trust-fall: ${failCount} event${failCount !== 1 ? 's' : ''} failed — check trust-fall-log.jsonl`);
}

console.log(`[trust-fall] done — ok=${okCount} fail=${failCount}`);
