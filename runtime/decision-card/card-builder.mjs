/**
 * Decision Card builder — composes the 06:00 Morning Card or 20:00 Evening Card
 *
 * Reads brain inputs + DB metrics, produces:
 *   1. A canonical JSON card written to
 *      <BRAIN_PATH>/Agents/decision-card/output/card-YYYY-MM-DD-{morning,evening}.json
 *   2. The formatted Telegram-ready text + inline_keyboard payload via stdout
 *      (JSON, so the sender can pipe it).
 *
 * Usage:
 *   node card-builder.mjs --type morning [--date YYYY-MM-DD] [--dry-run]
 *   node card-builder.mjs --type evening [--date YYYY-MM-DD] [--dry-run]
 *
 * Inputs read (best-effort — missing inputs are tolerated):
 *   - <brain>/STATE.md
 *   - <brain>/Agents/ajsa/output/social-brief-<date>.md   (today's brief)
 *   - <brain>/Inbox/<date>-build-suggestions.md            (today's actions)
 *   - <brain>/Agents/competitor-watcher/output/competitor-<date>.md
 *   - <brain>/Agents/mobile-qa-checker/output/*.md          (most recent)
 *   - <brain>/Agents/stale-content-auditor/output/*.md      (most recent)
 *   - /var/log/agentcrush/anthropic-costs.jsonl             (cost-monitor source)
 *
 * Architecture: see brain Decisions/2026-06-06-2x20-min-architecture.md
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};
const TYPE = flagValue('--type'); // morning | evening
const RUN_DATE = flagValue('--date') || new Date().toISOString().slice(0, 10);
const DRY_RUN = args.includes('--dry-run');

if (TYPE !== 'morning' && TYPE !== 'evening') {
  console.error('[card-builder] FATAL: --type must be "morning" or "evening"');
  process.exit(2);
}

// ── Env ───────────────────────────────────────────────────────────────────────

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const COST_LOG_PATH = process.env.COST_LOG_PATH || '/var/log/agentcrush/anthropic-costs.jsonl';
const CARD_OUT_DIR = path.join(BRAIN_PATH, 'Agents', 'decision-card', 'output');
const QUEUE_PATH = path.join(BRAIN_PATH, 'Agents', 'decision-card', 'action-queue.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readIfExists(p) {
  try { return await fs.readFile(p, 'utf-8'); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

async function readMostRecent(dir, prefix = '') {
  try {
    const files = (await fs.readdir(dir))
      .filter(f => f.endsWith('.md') && (!prefix || f.startsWith(prefix)) && f !== '_index.md')
      .sort()
      .reverse();
    if (files.length === 0) return null;
    return await fs.readFile(path.join(dir, files[0]), 'utf-8');
  } catch (e) {
    return null;
  }
}

function ymdToday() { return new Date().toISOString().slice(0, 10); }
function nowIso() { return new Date().toISOString(); }
function uuid() { return crypto.randomBytes(8).toString('hex'); }

// ── Input gather ──────────────────────────────────────────────────────────────

async function gatherInputs() {
  const ajsaBrief = await readIfExists(path.join(BRAIN_PATH, 'Agents/ajsa/output', `social-brief-${RUN_DATE}.md`));
  const buildSugg = await readIfExists(path.join(BRAIN_PATH, 'Inbox', `${RUN_DATE}-build-suggestions.md`));
  const competitor = await readIfExists(path.join(BRAIN_PATH, 'Agents/competitor-watcher/output', `competitor-${RUN_DATE}.md`))
    || await readMostRecent(path.join(BRAIN_PATH, 'Agents/competitor-watcher/output'), 'competitor-');
  const mobileQa = await readMostRecent(path.join(BRAIN_PATH, 'Agents/mobile-qa-checker/output'));
  const staleAudit = await readMostRecent(path.join(BRAIN_PATH, 'Agents/stale-content-auditor/output'));
  const stateMd = await readIfExists(path.join(BRAIN_PATH, 'STATE.md'));
  return { ajsaBrief, buildSugg, competitor, mobileQa, staleAudit, stateMd };
}

// ── Cost summary (read cost log, aggregate 24h + projected monthly) ──────────

async function costSummary() {
  const raw = await readIfExists(COST_LOG_PATH);
  if (!raw) return { last24h: 0, last7d: 0, projectedMonthly: 0, source: 'no-log' };
  const lines = raw.trim().split('\n').filter(Boolean);
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  let last24h = 0, last7d = 0, last30d = 0;
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      const ts = new Date(e.ts).getTime();
      // Anthropic Haiku 4.5 pricing (approx, in USD per million tokens):
      //   input $1.00, output $5.00, cache_read $0.10, cache_create $1.25
      // We bill rough — exact prices change; this is for at-a-glance.
      const inT = e.input_tokens ?? 0;
      const outT = e.output_tokens ?? 0;
      const crR = e.cache_read_input_tokens ?? 0;
      const crC = e.cache_creation_input_tokens ?? 0;
      const cost = (inT * 1e-6) + (outT * 5e-6) + (crR * 0.1e-6) + (crC * 1.25e-6);
      const age = now - ts;
      if (age < DAY) last24h += cost;
      if (age < 7 * DAY) last7d += cost;
      if (age < 30 * DAY) last30d += cost;
    } catch (_) { /* skip malformed */ }
  }
  const projectedMonthly = last7d * (30 / 7);
  return { last24h, last7d, last30d, projectedMonthly, source: COST_LOG_PATH };
}

// ── DB metrics (Supabase REST GET via fetch) ──────────────────────────────────

async function dbMetrics() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { available: false };
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const safeFetch = async (path, opts = {}) => {
    try {
      const r = await fetch(`${url}${path}`, { headers, ...opts });
      if (!r.ok) return null;
      return r;
    } catch (_) { return null; }
  };
  const countOf = async (table, where = '') => {
    const r = await safeFetch(`/rest/v1/${table}?select=count${where}`, { headers: { ...headers, Prefer: 'count=exact' }, method: 'HEAD' });
    if (!r) return null;
    const cr = r.headers.get('content-range');
    if (!cr) return null;
    const m = cr.match(/\/(\d+)$/);
    return m ? Number(m[1]) : null;
  };
  const totalAgents = await countOf('agents');
  const evidenceRanked = await countOf('agents', '&tier=eq.evidence_ranked');
  // Today's snapshot count
  const snapToday = await countOf('agent_snapshots', `&snapshot_date=eq.${RUN_DATE}`);
  return { available: true, totalAgents, evidenceRanked, snapToday };
}

// ── Site health (probe 8 key routes) ─────────────────────────────────────────

async function siteHealth() {
  const routes = ['/', '/rankings', '/rankings/agent-payments-stack', '/methodology', '/llms.txt', '/.well-known/mcp.json', '/api/agent-economy/llm-summary'];
  const results = await Promise.all(routes.map(async (p) => {
    try {
      const r = await fetch(`https://agentcrush.xyz${p}`, { method: 'HEAD' });
      return { p, ok: r.ok, status: r.status };
    } catch (e) {
      return { p, ok: false, status: 0 };
    }
  }));
  return results;
}

// ── Pending actions in queue (carry forward unactioned from previous card) ───

async function pendingFromQueue() {
  const raw = await readIfExists(QUEUE_PATH);
  if (!raw) return [];
  try {
    const queue = JSON.parse(raw);
    return (queue.actions || []).filter(a => a.status === 'pending');
  } catch (_) { return []; }
}

async function writeQueue(actions) {
  await fs.mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  const payload = { updated_at: nowIso(), actions };
  await fs.writeFile(QUEUE_PATH, JSON.stringify(payload, null, 2));
}

// ── Action extractors — pull tappable items from each input ──────────────────

function extractAjsaActions(briefMd) {
  if (!briefMd) return [];
  const actions = [];

  // Pull "Today's original post" — Ajsa's daily post draft
  const postSection = briefMd.match(/##\s*(?:8\.\s*)?Today'?s original post([\s\S]*?)(?:^##|\Z)/m);
  if (postSection) {
    const body = postSection[1];
    // Skip if explicitly "no post" / "skip today" / "no original today"
    if (!/no\s+(?:post|original)|skip\s+today|nothing to post/i.test(body.slice(0, 200))) {
      const draft = body.match(/"([^"]{40,500})"/);
      if (draft) {
        const cleaned = draft[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
        actions.push({
          action_id: uuid(),
          type: 'post-x',
          label: "Today's primary X post",
          preview: cleaned.slice(0, 200),
          payload: { text: cleaned, surface: 'x' },
        });
      }
    }
  }

  // Pull engagement queue replies — but ONLY if Ajsa actually drafted concrete ones.
  // Skip when she says "0 replies drafted", "No specific reply drafts", "No draft actions", etc.
  const replySection = briefMd.match(/##\s*(?:5\.\s*)?Engagement queue\s*[—-]\s*replies([\s\S]*?)(?:^##|\Z)/m);
  if (replySection) {
    const head = replySection[1].slice(0, 300).toLowerCase();
    const isEmpty = /\b0\s+(?:replies?|drafts?|actions?)|no\s+(?:specific|draft|reply)|none\b/i.test(head);
    if (!isEmpty) {
      // Only pull items that look like real reply targets: must contain a Twitter/Farcaster handle
      // or quoted text, not just reasoning prose.
      const items = [...replySection[1].matchAll(/(?:^|\n)(?:\d+\.|[-*])\s*(?:\*\*)?(?:Reply to\s+)?([^\n]+)/gi)];
      let added = 0;
      for (const m of items) {
        if (added >= 2) break;
        let desc = m[1].trim()
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '@$1')
          .replace(/[*_`]/g, '')
          .replace(/\s+/g, ' ');
        // Reject reasoning paragraphs (no handle, no URL hint, long prose)
        const hasHandle = /@[a-zA-Z0-9_.]+|warpcast\.com|x\.com/.test(desc);
        const looksLikeReasoning = /^(reasoning|because|all\s+(?:high|the)|note|context)/i.test(desc);
        if (!hasHandle || looksLikeReasoning) continue;
        if (desc.length < 15) continue;
        actions.push({
          action_id: uuid(),
          type: 'reply-x',
          label: `Reply: ${desc.slice(0, 100)}`,
          preview: desc.slice(0, 200),
          payload: { description: desc },
        });
        added++;
      }
    }
  }

  return actions;
}

function extractBuildSuggestionActions(md) {
  if (!md) return [];
  const actions = [];
  // build-suggestions writes tagged items: SHIP, DECIDE, DRAFT, etc.
  // Pull up to 3 "DECIDE" or top-priority items
  const decidePattern = /(?:^|\n)(?:###?\s*)?(?:\*\*)?(?:DECIDE|SHIP|APPROVE)\s*[:—-]?\s*\*?\*?([^\n]+)/gi;
  let match;
  let count = 0;
  while ((match = decidePattern.exec(md)) && count < 3) {
    const item = match[1].trim().replace(/[*_]/g, '');
    if (item.length > 10) {
      actions.push({
        action_id: uuid(),
        type: 'build-suggestion',
        label: item.slice(0, 120),
        preview: item.slice(0, 200),
        payload: { description: item, source: 'build-suggestions' },
      });
      count++;
    }
  }
  return actions;
}

// ── Ecosystem Pulse — short, scannable AI-Twitter+Farcaster summary ──────────

function extractEcosystemPulse(briefMd) {
  if (!briefMd) return [];
  const lines = [];

  // 1. Headline trend from "Trending in the ecosystem" section
  const trendSection = briefMd.match(/##\s*(?:\d+\.\s*)?Trending in the ecosystem([\s\S]*?)(?:^##|\Z)/m);
  if (trendSection) {
    // Pull the observation sentence — usually the first 1-2 sentences with concrete numbers
    const cleanBody = trendSection[1].replace(/\*+/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    // Find the most quantified opening line (has digit + word context)
    const firstNumeric = cleanBody.split('\n').find(l => /\d/.test(l) && l.length > 30 && l.length < 280);
    if (firstNumeric) {
      lines.push(`• ${firstNumeric.trim().replace(/^[•\-*]\s*/, '')}`);
    }
  }

  // 2-4. Top-3 keyword signals — pull the keyword + top engagement count + 1-line summary
  const keywordSection = briefMd.match(/##\s*(?:\d+\.\s*)?Keyword signal([\s\S]*?)(?:^##|\Z)/m);
  if (keywordSection) {
    // Each keyword block typically starts with **<keyword>** or ### <keyword>
    const keywordBlocks = [...keywordSection[1].matchAll(/(?:^|\n)(?:###?\s*|\*\*|-\s+\*\*)([A-Za-z][A-Za-z0-9 \-_]+?)(?:\*\*)?\s*[:—-]?\s*\n([\s\S]*?)(?=\n(?:###|\*\*[A-Z]|-\s+\*\*[A-Z])|$)/g)];
    const seenKeywords = new Set();
    for (const block of keywordBlocks) {
      const keyword = block[1].trim().toLowerCase();
      if (seenKeywords.has(keyword) || keyword.length > 30) continue;
      seenKeywords.add(keyword);
      const body = block[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*+/g, '');
      // Count posts in this block
      const posts = (body.match(/https?:\/\//g) || []).length;
      // Try to find a punchy quote
      const quote = body.match(/"([^"]{20,140})"/);
      if (quote) {
        lines.push(`• ${block[1].trim()}: ${posts} posts · "${quote[1]}"`);
      } else if (posts > 0) {
        // Fall back to first non-URL sentence
        const firstSentence = body.split(/[.\n]/).map(s => s.trim()).find(s => s.length > 25 && s.length < 200 && !/^https?/.test(s));
        if (firstSentence) lines.push(`• ${block[1].trim()}: ${posts} posts · ${firstSentence}`);
      }
      if (lines.length >= 4) break; // cap at headline + 3 keywords
    }
  }

  // 5. Top creator engagement — if Ajsa included follower-count signals
  const creatorMentions = [...briefMd.matchAll(/@([a-zA-Z0-9_.]+)\s*\(([\d,]+)\s+followers\)/g)];
  if (creatorMentions.length > 0) {
    const top3 = [...new Set(creatorMentions.map(m => `@${m[1]} (${m[2]})`))].slice(0, 3);
    if (top3.length > 0) lines.push(`• Top voices: ${top3.join(' · ')}`);
  }

  return lines;
}

// ── Card composition ─────────────────────────────────────────────────────────

function formatCost(usd) { return `$${usd.toFixed(2)}`; }

function buildOvernightSection(deps) {
  const { db, site, cost, inputs } = deps;
  const lines = [];
  // Site
  const failed = site.filter(r => !r.ok);
  if (failed.length === 0) {
    lines.push(`• Site: green (${site.length}/${site.length} routes)`);
  } else {
    lines.push(`• ⚠️ Site: ${failed.length}/${site.length} routes failing — ${failed.map(f => f.p).join(', ')}`);
  }
  // Snapshots
  if (db.available && db.snapToday != null) {
    lines.push(`• Snapshots today: ${db.snapToday.toLocaleString()} rows ${db.snapToday >= 900 ? '✓' : '⚠️'}`);
  }
  // Index size
  if (db.available && db.totalAgents != null) {
    lines.push(`• Indexed: ${db.totalAgents.toLocaleString()} agents · ${db.evidenceRanked ?? '?'} evidence-ranked`);
  }
  // Cost
  const pctOfCap = (cost.projectedMonthly / 10) * 100;
  const flag = pctOfCap > 80 ? '🚨' : pctOfCap > 50 ? '⚠️' : '✓';
  lines.push(`• Cost: ${formatCost(cost.projectedMonthly)} projected / $10 cap (${pctOfCap.toFixed(0)}%) ${flag}`);
  // Ajsa pulse
  if (inputs.ajsaBrief) {
    lines.push(`• Ajsa brief: delivered`);
  } else {
    lines.push(`• ⚠️ Ajsa brief: missing today`);
  }
  return lines;
}

function buildFyiSection(deps) {
  const { inputs } = deps;
  const lines = [];
  // Pull "Trending in the ecosystem" headline from Ajsa
  if (inputs.ajsaBrief) {
    const trend = inputs.ajsaBrief.match(/##\s*(?:2\.\s*)?Trending in the ecosystem\s*\n+\*?\*?\[?([^\]\n*]{10,100})/);
    if (trend) lines.push(`• Ecosystem signal: ${trend[1].replace(/\*+/g, '').trim()}`);
  }
  // Competitor moves
  if (inputs.competitor) {
    const headline = inputs.competitor.match(/##\s+([^\n]+)/);
    if (headline) lines.push(`• Competitor: ${headline[1].trim().slice(0, 100)}`);
  }
  // Stale content
  if (inputs.staleAudit) {
    const sevHi = (inputs.staleAudit.match(/severity[:\s]+high/gi) || []).length;
    if (sevHi > 0) lines.push(`• ⚠️ Stale content: ${sevHi} high-severity items`);
  }
  return lines;
}

function buildDecideSection(actions) {
  // Each action gets an inline keyboard row: APPROVE | REJECT (or APPROVE | SKIP)
  return actions.map((a, idx) => ({
    text: `[${idx + 1}] ${a.label}${a.preview && a.preview !== a.label ? `\n     "${a.preview.slice(0, 180)}${a.preview.length > 180 ? '…' : ''}"` : ''}`,
    keyboard: [
      [
        { text: `✅ Approve ${idx + 1}`, callback_data: `approve:${a.action_id}` },
        { text: `❌ Reject ${idx + 1}`, callback_data: `reject:${a.action_id}` },
        { text: `⏭ Defer ${idx + 1}`, callback_data: `defer:${a.action_id}` },
      ],
    ],
  }));
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderText(card) {
  const dayName = new Date(`${card.run_date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short' });
  const header = card.type === 'morning'
    ? `🌅 *AgentCrush — ${dayName} ${card.run_date}*\n_2×20 Morning Card_`
    : `🌙 *AgentCrush — ${dayName} ${card.run_date} EOD*\n_2×20 Evening Card_`;

  const parts = [header, ''];

  if (card.sections.overnight?.length) {
    parts.push('🟢 *OVERNIGHT*');
    parts.push(...card.sections.overnight);
    parts.push('');
  }
  if (card.sections.pulse?.length) {
    parts.push('🌐 *ECOSYSTEM PULSE — what\'s hot on AI X + Farcaster*');
    parts.push(...card.sections.pulse);
    parts.push('');
  }
  if (card.sections.decide?.length) {
    parts.push(`🟡 *DECIDE NOW* (${card.sections.decide.length})`);
    card.sections.decide.forEach((d) => parts.push(d.text));
    parts.push('');
    parts.push('_Tap a button, or reply: `skip N`, `defer N`, `status`, `costs`._');
    parts.push('');
  } else {
    parts.push('🟡 *DECIDE NOW*');
    parts.push('• Nothing requires your action — autonomous lanes handled everything.');
    parts.push('');
  }
  if (card.sections.fyi?.length) {
    parts.push('🔵 *FYI*');
    parts.push(...card.sections.fyi);
  }
  return parts.join('\n');
}

function renderKeyboard(card) {
  const rows = [];
  for (const d of card.sections.decide || []) {
    rows.push(...d.keyboard);
  }
  return rows.length ? { inline_keyboard: rows } : null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.error(`[card-builder] type=${TYPE} date=${RUN_DATE} brain=${BRAIN_PATH} dry-run=${DRY_RUN}`);

  const inputs = await gatherInputs();
  const [db, site, cost, carried] = await Promise.all([
    dbMetrics(),
    siteHealth(),
    costSummary(),
    pendingFromQueue(),
  ]);

  // Decide actions: fresh actions from inputs + any deferred from prior queue
  const fresh = [
    ...extractAjsaActions(inputs.ajsaBrief),
    ...extractBuildSuggestionActions(inputs.buildSugg),
  ];
  // Mark carried items as such
  const carriedFlagged = carried.map(a => ({ ...a, label: `${a.label} (deferred)`, deferred: true }));
  // Dedup by label
  const seenLabels = new Set();
  const decideActions = [];
  for (const a of [...carriedFlagged, ...fresh]) {
    const key = a.label.toLowerCase().slice(0, 60);
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    decideActions.push(a);
  }

  const deps = { db, site, cost, inputs };
  const card = {
    card_id: `${TYPE}-${RUN_DATE}-${uuid().slice(0, 6)}`,
    type: TYPE,
    run_date: RUN_DATE,
    issued_at: nowIso(),
    expires_at: new Date(Date.now() + (TYPE === 'morning' ? 14 : 10) * 3600 * 1000).toISOString(),
    sections: {
      overnight: buildOvernightSection(deps),
      pulse: extractEcosystemPulse(inputs.ajsaBrief),
      decide: buildDecideSection(decideActions),
      fyi: buildFyiSection(deps),
    },
    raw_actions: decideActions, // full payload for dispatcher
  };

  // Persist card
  await fs.mkdir(CARD_OUT_DIR, { recursive: true });
  const cardPath = path.join(CARD_OUT_DIR, `card-${RUN_DATE}-${TYPE}.json`);
  if (!DRY_RUN) {
    await fs.writeFile(cardPath, JSON.stringify(card, null, 2));
    // Update action queue: actions currently in this card are 'pending'
    const queueActions = decideActions.map(a => ({
      action_id: a.action_id,
      type: a.type,
      label: a.label,
      preview: a.preview,
      payload: a.payload,
      status: 'pending',
      issued_at: card.issued_at,
      issued_in_card: card.card_id,
    }));
    await writeQueue(queueActions);
  }

  // Output: JSON with text + keyboard, so the sender can pipe directly
  const text = renderText(card);
  const reply_markup = renderKeyboard(card);
  process.stdout.write(JSON.stringify({ card_id: card.card_id, card_path: cardPath, text, reply_markup }) + '\n');

  console.error(`[card-builder] wrote ${cardPath} (decide=${decideActions.length} overnight=${card.sections.overnight.length} fyi=${card.sections.fyi.length})`);
}

main().catch((err) => {
  console.error(`[card-builder] FATAL: ${err.message}\n${err.stack}`);
  process.exit(1);
});
