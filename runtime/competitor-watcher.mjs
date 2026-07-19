/**
 * competitor-watcher — Layer 2 sub-agent (Phase 3 #1)
 *
 * Reads github-events fetcher output + brain competitor landscape (Memory.md
 * section "Competitor landscape summary"), calls Claude Haiku 4.5 to produce
 * a structured summary of competitor moves worth Kris's attention. Writes
 * to Agents/competitor-watcher/output/competitor-YYYY-MM-DD.md, pushes
 * Telegram digest weekly (Mondays) or on a `crit`-level move.
 *
 * Follows the locked Layer 2 pattern from Memory.md:
 *   - Prompt caching: cached prefix (role + competitor landscape + voice rules)
 *     + uncached suffix (today's GitHub events JSON)
 *   - Cost logging: appends to /var/log/agentcrush/anthropic-costs.jsonl
 *   - Best-effort writes: failures never block subsequent pipeline steps
 *
 * Env:
 *   ANTHROPIC_API_KEY       — required
 *   BRAIN_PATH              — default /opt/agentcrush-brain
 *   TELEGRAM_BOT_TOKEN      — required for Monday digest / crit alerts
 *   TELEGRAM_CHAT_ID        — required for Monday digest / crit alerts
 *   COMPETITOR_FORCE_PUSH   — "1" to force Telegram push (smoke test)
 *
 * Schedule: daily 09:15 Budapest (after github-events fetcher at 09:05).
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RUN_DATE = process.env.RUN_DATE || new Date().toISOString().slice(0, 10);
const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 4096;
const FORCE_PUSH = process.env.COMPETITOR_FORCE_PUSH === '1';

if (!ANTHROPIC_API_KEY) {
  console.error('[competitor-watcher] FATAL: ANTHROPIC_API_KEY not set');
  process.exit(2);
}

async function readIfExists(p) {
  try { return await fs.readFile(p, 'utf-8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

async function fetchWebSources(webSources) {
  const results = [];
  for (const src of webSources) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(src.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'AgentCrush-competitor-watcher/1.0' },
        redirect: 'follow',
      });
      clearTimeout(timer);
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})["']/i);
      results.push({
        id: src.id,
        label: src.label,
        url: src.url,
        notes: src.notes || null,
        status: res.status,
        title: titleMatch ? titleMatch[1].trim().slice(0, 200) : null,
        meta_description: descMatch ? descMatch[1].trim() : null,
        text_snippet: text,
        fetched_at: new Date().toISOString(),
      });
      console.log(`[competitor-watcher] web: ${src.label} → ${res.status} (${text.length} chars)`);
    } catch (err) {
      console.warn(`[competitor-watcher] web fetch failed for ${src.label}: ${err.message}`);
      results.push({ id: src.id, label: src.label, url: src.url, error: err.message, fetched_at: new Date().toISOString() });
    }
  }
  return results;
}

async function gatherInputs() {
  const eventsPath = path.join(BRAIN_PATH, 'Fetchers', 'github-events', 'output', `github-${RUN_DATE}.json`);
  const eventsRaw = await readIfExists(eventsPath);
  const memoryMd = await readIfExists(path.join(BRAIN_PATH, 'Memory.md'));
  const watcherPlaybook = await readIfExists(path.join(BRAIN_PATH, 'Agents', 'competitor-watcher', 'playbook.md'));

  if (!memoryMd) {
    console.error('[competitor-watcher] FATAL: Memory.md not found');
    process.exit(2);
  }

  if (!eventsRaw) {
    console.warn(`[competitor-watcher] no github-events output for ${RUN_DATE} — nothing to summarize today`);
    return null;
  }

  let webSnapshots = [];
  try {
    const configPath = path.join(BRAIN_PATH, 'Fetchers', 'github-events', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    const webSources = Array.isArray(config.web_sources) ? config.web_sources : [];
    if (webSources.length > 0) {
      console.log(`[competitor-watcher] fetching ${webSources.length} web source(s)`);
      webSnapshots = await fetchWebSources(webSources);
    }
  } catch (e) {
    console.warn(`[competitor-watcher] could not read web_sources config: ${e.message}`);
  }

  return {
    githubEvents: eventsRaw,
    memoryMd,
    watcherPlaybook: watcherPlaybook || '(empty — no prior learnings yet)',
    webSnapshots,
  };
}

function buildSystemBlocks(inputs) {
  const cached = `You are competitor-watcher, an AgentCrush Layer 2 sub-agent. You read raw GitHub events from competitor repos + the brain's competitor landscape context, and produce a tight summary of moves Kris should know about.

You write for Kris (founder). He reads on Telegram or in the brain. He does not need narration — he needs signal.

═══════════════════════════════════════════════════════════════════════════════
DURABLE COMPETITOR CONTEXT (Memory.md — positioning, competitor landscape)
═══════════════════════════════════════════════════════════════════════════════

${inputs.memoryMd}

═══════════════════════════════════════════════════════════════════════════════
COMPOUNDING LEARNINGS — past Kris feedback (Agents/competitor-watcher/playbook.md)
═══════════════════════════════════════════════════════════════════════════════

${inputs.watcherPlaybook}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT
═══════════════════════════════════════════════════════════════════════════════

Output exactly:

---FULL REPORT START---
# Competitor watch — <DATE>

## Severity assessment
<one of: info | warn | crit — see severity rules below>

## Notable moves
<bullets, one per competitor with activity. For GitHub repos: cite specific repos/commits/releases. For web sources: cite headline claims, agent counts, feature changes visible in the page text. Skip competitors with no notable activity.>

## Strategic read
<2-4 sentences: what these moves mean for AgentCrush positioning, if anything>

## No-action items (logged for context)
<bullets of minor activity — keeps a paper trail without cluttering signal section>
---FULL REPORT END---
---TELEGRAM START---
<≤1500 chars, only the most-actionable items. Omit if severity=info AND not Monday — caller will skip the push.>
---TELEGRAM END---

Severity rules:
- crit: competitor shipped a feature that directly overlaps with our planned/active scope (e.g. "agentic.market launched a rankings page")
- warn: meaningful competitive move (new release, blog-worthy commit, notable fork) that's adjacent but not direct overlap
- info: routine activity, dependency bumps, internal refactors

No flattery. No "interesting" or "exciting". State what shipped, who shipped it, and whether it matters. If nothing matters, say so.

Today's date: ${RUN_DATE}.`;

  return [{ type: 'text', text: cached, cache_control: { type: 'ephemeral' } }];
}

function buildUserPrompt(inputs) {
  const webSection = inputs.webSnapshots && inputs.webSnapshots.length > 0
    ? `\n\nToday's competitor web snapshots (direct-competitor sites without a public GitHub repo):\n\n\`\`\`json\n${JSON.stringify(inputs.webSnapshots, null, 2)}\n\`\`\``
    : '';

  return `Today's GitHub events from configured competitor repos / users:

\`\`\`json
${inputs.githubEvents}
\`\`\`${webSection}

Produce the competitor watch report for ${RUN_DATE}. Begin with the literal delimiter "---FULL REPORT START---".`;
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
      if (!text) throw new Error(`Unexpected Anthropic response: ${JSON.stringify(json).slice(0, 300)}`);
      const usage = json.usage || {};
      const cacheRead = usage.cache_read_input_tokens ?? 0;
      const cacheCreate = usage.cache_creation_input_tokens ?? 0;
      console.log(`[competitor-watcher] Anthropic ok on attempt ${attempt}. Input tokens: ${usage.input_tokens}, output tokens: ${usage.output_tokens}, cache_read: ${cacheRead}, cache_create: ${cacheCreate}`);

      // Structured cost log — read by runtime/cost-monitor.mjs. Pattern from Memory.md.
      try {
        fsSync.mkdirSync('/var/log/agentcrush', { recursive: true });
        fsSync.appendFileSync('/var/log/agentcrush/anthropic-costs.jsonl', JSON.stringify({
          ts: new Date().toISOString(),
          worker: 'agentcrush-competitor-watcher',
          model: ANTHROPIC_MODEL,
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          cache_read_input_tokens: cacheRead,
          cache_creation_input_tokens: cacheCreate,
        }) + '\n');
      } catch (e) {
        console.warn(`[competitor-watcher] cost-log write failed (non-fatal): ${e.message}`);
      }

      return text;
    } catch (err) {
      lastErr = err;
      const wait = attempt < BACKOFF_MS.length ? BACKOFF_MS[attempt - 1] : 0;
      console.warn(`[competitor-watcher] attempt ${attempt} failed: ${err.message}${wait ? ` — waiting ${wait / 1000}s` : ''}`);
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
  if (!token || !chat) { console.warn('[competitor-watcher] Telegram env missing — skipping push'); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) console.warn(`[competitor-watcher] Telegram ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  else console.log(`[competitor-watcher] Telegram sent (msg ${json.result?.message_id})`);
}

async function main() {
  const inputs = await gatherInputs();
  if (!inputs) return; // no fetcher output today, nothing to do

  const systemBlocks = buildSystemBlocks(inputs);
  const userPrompt = buildUserPrompt(inputs);
  const sysChars = systemBlocks.reduce((n, b) => n + b.text.length, 0);
  console.log(`[competitor-watcher] System: ${sysChars} chars (cached). User: ${userPrompt.length} chars.`);

  const raw = await callAnthropic({ systemBlocks, userPrompt });
  const report = extractDelimited(raw, '---FULL REPORT START---', '---FULL REPORT END---');
  const telegram = extractDelimited(raw, '---TELEGRAM START---', '---TELEGRAM END---');
  if (!report) { console.error('[competitor-watcher] FATAL: model output missing FULL REPORT delimiters'); process.exit(1); }

  const outDir = path.join(BRAIN_PATH, 'Agents', 'competitor-watcher', 'output');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `competitor-${RUN_DATE}.md`);
  await fs.writeFile(outPath, report);
  console.log(`[competitor-watcher] Wrote ${outPath}`);

  const severityMatch = report.match(/##\s+Severity assessment\s*\n(crit|warn|info)/i);
  const severity = severityMatch ? severityMatch[1].toLowerCase() : 'info';
  const isMonday = new Date(RUN_DATE + 'T00:00:00Z').getUTCDay() === 1;

  if (telegram && (severity === 'crit' || isMonday || FORCE_PUSH)) {
    const prefix = severity === 'crit' ? '🚨 competitor-watcher CRIT' : isMonday ? '📅 competitor-watcher (Monday digest)' : '🔧 competitor-watcher (forced)';
    await pushTelegram(`${prefix}\n\n${telegram}`);
  } else {
    console.log(`[competitor-watcher] severity=${severity} and not Monday — skipping push`);
  }
}

main().catch((err) => {
  console.error(`[competitor-watcher] FATAL: ${err.message}`);
  process.exit(1);
});
