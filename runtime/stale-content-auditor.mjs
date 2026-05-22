/**
 * stale-content-auditor — Phase 3 #5 (Layer 2 Haiku)
 *
 * Reads:
 *   - Live agentcrush.xyz pages (a fixed set of "claim-heavy" routes)
 *   - Brain STATE.md (canonical product state — what's actually true today)
 *   - Brain Memory.md (positioning rules — what we ARE / are NOT)
 *   - Decisions/ index (closed questions to detect re-litigation)
 *
 * Asks Haiku 4.5 to identify items on the live site that no longer match
 * brain truth — outdated counts, retired features still mentioned,
 * methodology versions out of sync, positioning claims that drift from
 * Memory.md rules, etc.
 *
 * Output: brain Agents/stale-content-auditor/output/audit-YYYY-MM-DD.md
 * Telegram: weekly (Mondays) OR severity=high (≥3 stale items found).
 *
 * Follows locked Layer 2 pattern: prompt-caching split (cached prefix =
 * audit instructions + Memory.md + STATE.md; uncached suffix = the live
 * HTML extracts), cost-log writes for cost-monitor visibility.
 *
 * Schedule: weekly Sunday 10:00 Budapest (so Monday morning brief can
 * reference fresh audit).
 *
 * Env:
 *   ANTHROPIC_API_KEY       required
 *   BRAIN_PATH              default /opt/agentcrush-brain
 *   TELEGRAM_BOT_TOKEN/CHAT_ID  required for push
 *   STALE_BASE_URL          default https://agentcrush.xyz
 *   STALE_ROUTES            comma-separated; default below
 *   STALE_FORCE_PUSH        "1" to force push
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 4096;
const BASE = (process.env.STALE_BASE_URL || 'https://agentcrush.xyz').replace(/\/$/, '');
const DEFAULT_ROUTES = '/,/rankings,/rankings/model-families,/agent-economy,/methodology,/labs,/about,/how-we-rank';
const ROUTES = (process.env.STALE_ROUTES || DEFAULT_ROUTES).split(',').map((r) => r.trim()).filter(Boolean);
const FORCE_PUSH = process.env.STALE_FORCE_PUSH === '1';
const RUN_DATE = process.env.RUN_DATE || new Date().toISOString().slice(0, 10);

if (!ANTHROPIC_API_KEY) {
  console.error('[stale-content-auditor] FATAL: ANTHROPIC_API_KEY not set');
  process.exit(2);
}

// Very small HTML→text extractor: strip scripts/styles, collapse whitespace.
// We don't need DOM accuracy — we just need the visible text claims for the LLM to read.
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchRoute(route) {
  const url = `${BASE}${route}`;
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'agentcrush-stale-content-auditor/0.1' } });
    if (!res.ok) return { route, url, error: `http ${res.status}` };
    const html = await res.text();
    const text = stripHtml(html).slice(0, 12_000); // cap per-route text size
    return { route, url, text };
  } catch (err) {
    return { route, url, error: err.message.slice(0, 200) };
  }
}

async function readIfExists(p) {
  try { return await fs.readFile(p, 'utf-8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

async function gatherInputs() {
  const stateMd = await readIfExists(path.join(BRAIN_PATH, 'STATE.md'));
  const memoryMd = await readIfExists(path.join(BRAIN_PATH, 'Memory.md'));
  if (!stateMd || !memoryMd) {
    console.error('[stale-content-auditor] FATAL: brain STATE.md / Memory.md missing');
    process.exit(2);
  }
  const decisionsDir = path.join(BRAIN_PATH, 'Decisions');
  let decisionsList = '';
  try {
    const files = (await fs.readdir(decisionsDir)).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort().reverse();
    decisionsList = files.map((f) => `- ${f.replace(/\.md$/, '')}`).join('\n');
  } catch {}

  console.log(`[stale-content-auditor] Fetching ${ROUTES.length} routes from ${BASE}`);
  const routeResults = [];
  for (const r of ROUTES) {
    routeResults.push(await fetchRoute(r));
  }
  return { stateMd, memoryMd, decisionsList, routes: routeResults };
}

function buildSystemBlocks(inputs) {
  const cached = `You are stale-content-auditor, an AgentCrush Layer 2 sub-agent. You read live pages from agentcrush.xyz plus the brain (STATE.md, Memory.md, Decisions index) and identify content on the live site that no longer matches brain truth.

You write for Kris (founder). He fixes what you flag, so your output drives editorial action. No flattery, no narration — just a flagged list with citations.

═══════════════════════════════════════════════════════════════════════════════
BRAIN TRUTH — STATE.md (canonical product state as of today)
═══════════════════════════════════════════════════════════════════════════════

${inputs.stateMd}

═══════════════════════════════════════════════════════════════════════════════
BRAIN TRUTH — Memory.md (positioning rules + not-now list)
═══════════════════════════════════════════════════════════════════════════════

${inputs.memoryMd}

═══════════════════════════════════════════════════════════════════════════════
DECISIONS INDEX (closed questions — re-litigation on live pages is also stale)
═══════════════════════════════════════════════════════════════════════════════

${inputs.decisionsList}

═══════════════════════════════════════════════════════════════════════════════
WHAT COUNTS AS STALE
═══════════════════════════════════════════════════════════════════════════════

- Numbers that drift from STATE.md (e.g. "1,289 indexed agents" when STATE says 1,338)
- Retired features still mentioned (Bix, Mike persona, ajsa-daily-brief, etc.)
- Methodology versions out of sync (v2.b shown when v2.c-public is live)
- Positioning claims violating Memory.md voice rules (e.g. "trust layer" framing)
- Status claims that no longer apply (e.g. "coming soon" for something shipped, "launching Q3" for past dates)
- Re-litigation of closed decisions (e.g. "we may launch a token" when token was rejected Apr 23)

Do NOT flag:
- Marketing language that's intentionally evergreen
- Items present in STATE.md "Open commitments" (those are deliberately forward-looking)
- Date-stamped content (blog posts) that's expected to be historical

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT
═══════════════════════════════════════════════════════════════════════════════

---FULL AUDIT START---
# Stale content audit — <DATE>

## Summary
<count of stale items found, severity assessment: low | medium | high>

## Stale items

### <route>
- **Quote from live page:** "<exact text>"
- **Brain truth:** <what STATE.md / Memory.md / Decisions actually say>
- **Suggested fix:** <one-line suggestion>

(Group by route. Skip routes with no findings.)

## Routes checked, no findings
<bullet list — keeps a paper trail>
---FULL AUDIT END---
---TELEGRAM START---
<≤1500 chars, only items severity=medium or high. Omit if low and not Monday.>
---TELEGRAM END---

Today's date: ${RUN_DATE}.`;

  return [{ type: 'text', text: cached, cache_control: { type: 'ephemeral' } }];
}

function buildUserPrompt(inputs) {
  const blocks = inputs.routes.map((r) => {
    if (r.error) return `### ${r.route}\n[FETCH ERROR: ${r.error}]`;
    return `### ${r.route}\n<<<\n${r.text}\n>>>`;
  }).join('\n\n');
  return `Live pages fetched ${new Date().toISOString()}:\n\n${blocks}\n\nProduce the stale content audit for ${RUN_DATE}. Begin with the literal delimiter "---FULL AUDIT START---".`;
}

async function callAnthropic({ systemBlocks, userPrompt }) {
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  };
  const BACKOFF_MS = [15_000, 30_000, 60_000, 120_000];
  let lastErr = null;
  for (let attempt = 1; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = await res.json();
      const text = json?.content?.[0]?.text;
      if (!text) throw new Error(`Unexpected response: ${JSON.stringify(json).slice(0, 300)}`);
      const usage = json.usage || {};
      const cacheRead = usage.cache_read_input_tokens ?? 0;
      const cacheCreate = usage.cache_creation_input_tokens ?? 0;
      console.log(`[stale-content-auditor] Anthropic ok on attempt ${attempt}. input: ${usage.input_tokens}, output: ${usage.output_tokens}, cache_read: ${cacheRead}, cache_create: ${cacheCreate}`);

      // Locked Layer 2 cost-log pattern from Memory.md.
      try {
        fsSync.mkdirSync('/var/log/agentcrush', { recursive: true });
        fsSync.appendFileSync('/var/log/agentcrush/anthropic-costs.jsonl', JSON.stringify({
          ts: new Date().toISOString(),
          worker: 'agentcrush-stale-content-auditor',
          model: ANTHROPIC_MODEL,
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          cache_read_input_tokens: cacheRead,
          cache_creation_input_tokens: cacheCreate,
        }) + '\n');
      } catch (e) {
        console.warn(`[stale-content-auditor] cost-log write failed (non-fatal): ${e.message}`);
      }
      return text;
    } catch (err) {
      lastErr = err;
      const wait = attempt < BACKOFF_MS.length ? BACKOFF_MS[attempt - 1] : 0;
      console.warn(`[stale-content-auditor] attempt ${attempt} failed: ${err.message}${wait ? ` — waiting ${wait / 1000}s` : ''}`);
      if (wait) await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`Anthropic failed after retries: ${lastErr?.message}`);
}

function extractDelimited(raw, startD, endD) {
  const re = new RegExp(`${startD}\\n([\\s\\S]*?)\\n${endD}`);
  const m = raw.match(re);
  return m ? m[1].trim() : null;
}

async function pushTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.warn('[stale-content-auditor] Telegram env missing — skip'); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) console.warn(`[stale-content-auditor] Telegram ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  else console.log(`[stale-content-auditor] Telegram sent (msg ${json.result?.message_id})`);
}

async function main() {
  const inputs = await gatherInputs();
  const systemBlocks = buildSystemBlocks(inputs);
  const userPrompt = buildUserPrompt(inputs);
  console.log(`[stale-content-auditor] System: ${systemBlocks[0].text.length} chars (cached). User: ${userPrompt.length} chars.`);

  const raw = await callAnthropic({ systemBlocks, userPrompt });
  const audit = extractDelimited(raw, '---FULL AUDIT START---', '---FULL AUDIT END---');
  const telegram = extractDelimited(raw, '---TELEGRAM START---', '---TELEGRAM END---');
  if (!audit) { console.error('[stale-content-auditor] FATAL: model output missing FULL AUDIT delimiters'); process.exit(1); }

  const outDir = path.join(BRAIN_PATH, 'Agents', 'stale-content-auditor', 'output');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `audit-${RUN_DATE}.md`);
  await fs.writeFile(outPath, audit);
  console.log(`[stale-content-auditor] Wrote ${outPath}`);

  const sevMatch = audit.match(/severity\s+assessment[:\s]+(low|medium|high)/i);
  const severity = sevMatch ? sevMatch[1].toLowerCase() : 'low';
  const isMonday = new Date(RUN_DATE + 'T00:00:00Z').getUTCDay() === 1;

  if (telegram && (severity === 'high' || isMonday || FORCE_PUSH)) {
    const prefix = severity === 'high' ? '🚨 stale-content-auditor HIGH' : isMonday ? '📅 stale-content-auditor (Monday)' : '🔧 stale-content-auditor (forced)';
    await pushTelegram(`${prefix}\n\n${telegram}`);
  } else {
    console.log(`[stale-content-auditor] severity=${severity}, not Monday — skipping push`);
  }
}

main().catch((err) => {
  console.error(`[stale-content-auditor] FATAL: ${err.message}`);
  process.exit(1);
});
