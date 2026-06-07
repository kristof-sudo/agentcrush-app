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
    // Auto-expire items older than 36h — avoids accumulation across multiple missed cards.
    const cutoff = Date.now() - 36 * 3600 * 1000;
    return (queue.actions || []).filter(a =>
      a.status === 'pending' &&
      new Date(a.issued_at || 0).getTime() > cutoff
    );
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

function extractRepostActions(briefMd) {
  if (!briefMd) return [];
  // Section 6: "Engagement queue — quote/repost with observation"
  const section = briefMd.match(/##\s*(?:\d+\.\s*)?Engagement queue\s*[—–-]\s*quote(?:\/repost)?([\s\S]*?)(?:\n##|\Z)/mi);
  if (!section) return [];
  const body = section[1];
  // Skip if empty / no reposts
  if (/\b0\s+repost|\bno\s+repost|\bnone\b/i.test(body.slice(0, 120))) return [];
  if (!/drafted|suggestion|draft/i.test(body.slice(0, 200))) return [];

  const actions = [];
  // Pull source handle + quote text
  const sourceMatch = body.match(/\*\*Source:\*\*\s*([^\n]+)/);
  const urlMatch = body.match(/https?:\/\/(?:warpcast\.com|x\.com|twitter\.com)\/[^\s)]+/);
  const quoteMatch = body.match(/\*\*Quote text suggestion:\*\*\s*"([\s\S]*?)"/m)
    || body.match(/"([^"]{40,500})"/s);

  if (quoteMatch) {
    const quoteText = quoteMatch[1].trim();
    const source = sourceMatch
      ? sourceMatch[1].replace(/\*+/g, '').trim().split(',')[0].slice(0, 60)
      : 'ecosystem post';
    actions.push({
      action_id: uuid(),
      type: 'quote-x',
      label: `Quote-post: ${source}`,
      preview: quoteText.slice(0, 200),
      payload: { text: quoteText, source_url: urlMatch ? urlMatch[0] : null, surface: 'x' },
    });
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

  // Section 2: "Trending in the ecosystem" — has **Topic** — N posts/casts format
  // e.g. "**x402 payments infrastructure** — 17 casts/posts across both surfaces, 32 total engagement. Theme: ..."
  const trendSection = briefMd.match(/##\s*(?:\d+\.\s*)?Trending in the ecosystem([\s\S]*?)(?:\n##|\Z)/m);
  if (trendSection) {
    const body = trendSection[1];
    // Match each **Topic** — lead line
    const topicMatches = [...body.matchAll(/\*\*([^*\n]{3,60})\*\*\s*[—–-]+\s*([^\n]{20,300})/g)];
    for (const m of topicMatches) {
      const topic = m[1].trim();
      // Extract the stats and first observation sentence, strip URLs/markdown
      let summary = m[2]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*+/g, '')
        .trim();
      // Grab up to first "Observation:" sentence if present
      const obsMatch = body.slice(m.index).match(/\*\*Observation:\*\*\s*([^.]+\.)/);
      if (obsMatch) {
        summary = obsMatch[1].trim();
      } else {
        // Trim to first sentence
        summary = summary.split(/(?<=\.)\s/)[0];
      }
      if (summary.length > 220) summary = summary.slice(0, 217) + '…';
      lines.push(`• *${topic}*: ${summary}`);
      if (lines.length >= 4) break;
    }
  }

  // Keyword section: pull the #1 post per keyword (by engagement) as a quick signal
  // Format: "### x402\n**Top 3 casts by engagement:**\n\n1. **@handle** (Nk followers) — description\n   - Engagement: N likes..."
  const keywordSection = briefMd.match(/##\s*(?:\d+\.\s*)?Keyword signal([\s\S]*?)(?:\n##|\Z)/m);
  if (keywordSection && lines.length < 5) {
    const kwBody = keywordSection[1];
    const kwBlocks = [...kwBody.matchAll(/###\s+([A-Za-z][A-Za-z0-9 \-_.]+)\n([\s\S]*?)(?=\n###|\Z)/g)];
    const addedKw = new Set();
    for (const block of kwBlocks) {
      const kw = block[1].trim();
      if (addedKw.has(kw.toLowerCase()) || lines.length >= 6) break;
      // Find top post — first numbered item
      const topPost = block[2].match(/1\.\s+\*\*@([^*]+)\*\*\s*\(([^)]+)\)\s*[—–-]+\s*([^\n]+)/);
      if (topPost) {
        const handle = topPost[1].trim();
        const context = topPost[3].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*+/g, '').trim().split('.')[0];
        if (context.length > 15) {
          lines.push(`  ↳ Top ${kw} signal: @${handle} — ${context.slice(0, 120)}`);
          addedKw.add(kw.toLowerCase());
        }
      }
    }
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

function buildFyiSection(deps, { isSunday = false, weekLabel = '' } = {}) {
  const { inputs } = deps;
  const lines = [];

  // Sunday: digest reminder
  if (isSunday && weekLabel) {
    lines.push(`📅 *${weekLabel} digest auto-generates tonight at 19:00 UTC (21:00 Budapest).*`);
    lines.push(`   Upload cover before then: commit to /public/weekly/${weekLabel}_cover.png`);
    lines.push(`   Then approve the "Post ${weekLabel} weekly digest" action above.`);
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
  // Cadence status from brief
  if (inputs.ajsaBrief) {
    const cadence = inputs.ajsaBrief.match(/Cadence status:\s*([^\n.]+)/i);
    if (cadence) lines.push(`• Cadence: ${cadence[1].trim().slice(0, 120)}`);
  }
  // Likes queue — just count
  if (inputs.ajsaBrief) {
    const likeSection = inputs.ajsaBrief.match(/##\s*(?:\d+\.\s*)?Engagement queue\s*[—–-]\s*likes([\s\S]*?)(?:\n##|\Z)/mi);
    if (likeSection) {
      const likeItems = (likeSection[1].match(/^(?:\d+\.|[-*])\s/gm) || []).length;
      if (likeItems > 0) lines.push(`• Like queue: ${likeItems} posts ready (auto-lane — no decision needed)`);
    }
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

  // Day-of-week awareness (0=Sun, 1=Mon, ... 6=Sat)
  const dow = new Date(`${RUN_DATE}T12:00:00Z`).getUTCDay();
  const isSunday = dow === 0;

  // Decide actions: fresh actions from inputs + any deferred from prior queue
  const fresh = [
    ...extractAjsaActions(inputs.ajsaBrief),
    ...extractRepostActions(inputs.ajsaBrief),
    ...extractBuildSuggestionActions(inputs.buildSugg),
  ];

  // On Sundays: inject weekly digest post action at the TOP of decide list
  if (isSunday) {
    // Derive ISO week number for this Sunday (it's the last day of the ISO week)
    const dt = new Date(`${RUN_DATE}T12:00:00Z`);
    const isoYear = dt.getUTCFullYear();
    // ISO week: Jan 4 is always in W1
    const jan4 = new Date(Date.UTC(isoYear, 0, 4));
    const startOfW1 = new Date(jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * 86400000);
    const weekNum = Math.floor((dt.getTime() - startOfW1.getTime()) / (7 * 86400000)) + 1;
    const weekLabel = `W${weekNum}`;
    fresh.unshift({
      action_id: uuid(),
      type: 'post-x',
      label: `Post ${weekLabel} weekly digest`,
      preview: `"${weekLabel} agent ecosystem digest is live at agentcrush.xyz/weekly/${isoYear}-${weekLabel}. Top signals this week: ERC-8004 trust tooling surge (Boon/Argus/AgentAudit), x402 routing real volume, MCP adoption +35%. Read the full breakdown."`,
      payload: {
        text: `${weekLabel} agent ecosystem digest is live → agentcrush.xyz/weekly/${isoYear}-${weekLabel}\n\nTop signals this week:\n• ERC-8004 trust tooling surge — Boon, Argus, AgentAudit all shipped in the same 72h window\n• x402 routing real volume (Travala, Agent Realm, Base Account)\n• MCP adoption +35% — Base MCP ships, third major blockchain integration this year\n\nWhat this means for builders → [link]`,
        surface: 'x',
        note: 'Post after 19:00 UTC when digest auto-generates. Upload cover first: /public/weekly/W' + weekNum + '_cover.png',
      },
    });
  }
  // Mark carried items with the date they were issued, so Kris knows they're old
  const carriedFlagged = carried.map(a => {
    const issuedDate = a.issued_at ? a.issued_at.slice(5, 10) : 'prev'; // MM-DD
    return { ...a, label: `${a.label} [carried ${issuedDate}]`, deferred: true };
  });
  // Dedup by label
  const seenLabels = new Set();
  const decideActions = [];
  for (const a of [...carriedFlagged, ...fresh]) {
    const key = a.label.toLowerCase().slice(0, 60);
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    decideActions.push(a);
  }

  // Compute week label for FYI/Sunday logic
  const dt = new Date(`${RUN_DATE}T12:00:00Z`);
  const isoYear2 = dt.getUTCFullYear();
  const jan4b = new Date(Date.UTC(isoYear2, 0, 4));
  const startOfW1b = new Date(jan4b.getTime() - ((jan4b.getUTCDay() || 7) - 1) * 86400000);
  const weekNumNow = Math.floor((dt.getTime() - startOfW1b.getTime()) / (7 * 86400000)) + 1;
  const weekLabelNow = `W${weekNumNow}`;

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
      fyi: buildFyiSection(deps, { isSunday, weekLabel: weekLabelNow }),
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
