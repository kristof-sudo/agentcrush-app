/**
 * Build Suggestions worker — Layer 3 daily "what to DO with the brief"
 *
 * Reads today's Ajsa social brief + STATE.md + Queue/open.md + Memory.md +
 * (optionally) today's competitor-watcher output, calls Haiku 4.5 to
 * synthesize 3-5 tagged concrete actions, writes to brain Inbox/, optionally
 * pings Telegram.
 *
 * Closes the gap Kris flagged 2026-05-23: the social brief tells him what's
 * hot in the ecosystem, but not what to DO with it. This is the execution
 * layer above the observation layer.
 *
 * Architecture: same Layer 2 pattern as ajsa-morning-brief-worker.mjs —
 * standalone Node + Anthropic API + prompt caching (cached prefix = role +
 * playbook + Memory.md + format spec; uncached suffix = today's brief +
 * STATE.md + Queue/open.md + competitor output).
 *
 * Usage:
 *   node runtime/build-suggestions-worker.mjs              # write to brain + telegram
 *   node runtime/build-suggestions-worker.mjs --dry-run    # stdout only
 *   node runtime/build-suggestions-worker.mjs --date YYYY-MM-DD
 *   node runtime/build-suggestions-worker.mjs --no-telegram
 *
 * Env (required):
 *   ANTHROPIC_API_KEY
 *   BRAIN_PATH (default: /opt/agentcrush-brain)
 *
 * Env (telegram, optional):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *
 * Cost: ~$0.012 per call (Haiku 4.5, ~12K in + 2K out). ~$0.36/month at daily.
 *
 * Exit codes:
 *   0 — success
 *   1 — Anthropic failed after retries; output NOT written
 *   2 — env/arg/brain-path error; nothing attempted
 *   3 — written but Telegram push failed
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipTelegram = args.includes('--no-telegram');
const dateIdx = args.indexOf('--date');
const RUN_DATE = dateIdx !== -1 ? args[dateIdx + 1] : new Date().toISOString().slice(0, 10);

if (!/^\d{4}-\d{2}-\d{2}$/.test(RUN_DATE)) {
  console.error(`[build-suggestions] FATAL: invalid --date "${RUN_DATE}". Expected YYYY-MM-DD.`);
  process.exit(2);
}

// ── Env ───────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';

if (!ANTHROPIC_API_KEY) {
  console.error('[build-suggestions] FATAL: ANTHROPIC_API_KEY not set.');
  process.exit(2);
}

const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 4096;

console.log(`[build-suggestions] Date: ${RUN_DATE}  Mode: ${isDryRun ? 'DRY-RUN' : 'WRITE'}  Telegram: ${skipTelegram ? 'OFF' : 'ON'}`);
console.log(`[build-suggestions] Brain path: ${BRAIN_PATH}  Model: ${ANTHROPIC_MODEL}`);

// ── File helpers ──────────────────────────────────────────────────────────────

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function ensureBrain() {
  try {
    const stat = await fs.stat(BRAIN_PATH);
    if (!stat.isDirectory()) throw new Error('not a directory');
  } catch (err) {
    console.error(`[build-suggestions] FATAL: BRAIN_PATH "${BRAIN_PATH}" not usable: ${err.message}`);
    process.exit(2);
  }
}

// ── Input gathering ───────────────────────────────────────────────────────────

async function gatherInputs() {
  const briefPath = path.join(BRAIN_PATH, 'Agents', 'ajsa', 'output', `social-brief-${RUN_DATE}.md`);
  const briefMd = await readIfExists(briefPath);
  if (!briefMd) {
    console.error(`[build-suggestions] FATAL: today's brief not found at ${briefPath}. Run after the morning brief lands.`);
    process.exit(2);
  }

  const stateMd = await readIfExists(path.join(BRAIN_PATH, 'STATE.md'));
  const memoryMd = await readIfExists(path.join(BRAIN_PATH, 'Memory.md'));
  const queueMd = await readIfExists(path.join(BRAIN_PATH, 'Queue', 'open.md'));
  const playbook = await readIfExists(path.join(BRAIN_PATH, 'Playbooks', 'build-suggestions.md'));
  const compoundingLearnings = await readIfExists(path.join(BRAIN_PATH, 'Agents', 'build-suggestions', 'playbook.md'));

  // Optional: today's competitor-watcher report (file naming follows the same
  // YYYY-MM-DD convention used by other sub-agents). Best-effort; absent is fine.
  const competitorPath = path.join(BRAIN_PATH, 'Agents', 'competitor-watcher', 'output', `report-${RUN_DATE}.md`);
  const competitorMd = await readIfExists(competitorPath);

  const missing = [];
  if (!stateMd) missing.push('STATE.md');
  if (!memoryMd) missing.push('Memory.md');
  if (!queueMd) missing.push('Queue/open.md');
  if (!playbook) missing.push('Playbooks/build-suggestions.md');
  if (missing.length) {
    console.error(`[build-suggestions] FATAL: missing brain inputs: ${missing.join(', ')}`);
    process.exit(2);
  }

  return { briefMd, stateMd, memoryMd, queueMd, playbook, compoundingLearnings, competitorMd };
}

// ── Prompt construction ───────────────────────────────────────────────────────

// Two-block system prompt for prompt caching:
//   [0] CACHED — role intro + playbook (format spec) + Memory.md + compounding
//       learnings. Stable across runs; changes only when Kris edits the
//       playbook or Memory.md.
//   [1] UNCACHED — the day's actual inputs (brief, STATE, Queue, competitor).
//       Volatile; new every run.
function buildSystemBlocks(inputs) {
  const cached = `You are the AgentCrush Build Suggestions producer. Your job is to convert the morning's signal (today's social brief, current product state, queued work, competitor moves) into 3-5 concrete actionable items the COO can triage in under 30 seconds. You produce execution-planning, not commentary.

You are writing for Kris, the founder of AgentCrush. He reads the social brief on Telegram over coffee. Then he reads YOUR output to decide what to actually work on today. Quality of your picks compounds — if you surface noise, his next session wastes time; if you surface specifics, you save him hours.

Hard rule, same as Ajsa: never invent data. Every claim you make about today's signal must trace to a specific row in the inputs (brief, STATE.md, Queue, competitor output). If you need a number to justify a pick and don't have it, say "verify before acting" — don't fabricate.

═══════════════════════════════════════════════════════════════════════════════
PLAYBOOK — format & rules (Playbooks/build-suggestions.md)
═══════════════════════════════════════════════════════════════════════════════

${inputs.playbook}

═══════════════════════════════════════════════════════════════════════════════
DURABLE OPERATING CONTEXT (Memory.md — positioning, strategy posture, constraints)
═══════════════════════════════════════════════════════════════════════════════

${inputs.memoryMd}

═══════════════════════════════════════════════════════════════════════════════
COMPOUNDING LEARNINGS — past Kris feedback on build suggestions (Agents/build-suggestions/playbook.md)
═══════════════════════════════════════════════════════════════════════════════

${inputs.compoundingLearnings || '(no entries yet — first runs)'}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT
═══════════════════════════════════════════════════════════════════════════════

Output exactly the following structure, with these literal delimiters:

---FULL FILE START---
<the full markdown file as specified in the playbook — frontmatter + sections>
---FULL FILE END---
---TELEGRAM START---
<condensed plain-text Telegram summary, ≤1200 chars: one line per Top Pick with tag + title, then a 1-line tldr at the bottom>
---TELEGRAM END---

No preamble. No summary commentary. Begin with the literal delimiter.`;

  return [
    { type: 'text', text: cached, cache_control: { type: 'ephemeral' } },
  ];
}

function buildUserPrompt(inputs) {
  return `Today's date is ${RUN_DATE}.

═══════════════════════════════════════════════════════════════════════════════
TODAY'S SOCIAL BRIEF (Agents/ajsa/output/social-brief-${RUN_DATE}.md)
═══════════════════════════════════════════════════════════════════════════════

${inputs.briefMd}

═══════════════════════════════════════════════════════════════════════════════
CURRENT PRODUCT STATE (STATE.md)
═══════════════════════════════════════════════════════════════════════════════

${inputs.stateMd}

═══════════════════════════════════════════════════════════════════════════════
OPEN QUEUE (Queue/open.md — DO NOT duplicate items already queued)
═══════════════════════════════════════════════════════════════════════════════

${inputs.queueMd}

${inputs.competitorMd ? `═══════════════════════════════════════════════════════════════════════════════
TODAY'S COMPETITOR WATCHER REPORT (Agents/competitor-watcher/output/report-${RUN_DATE}.md)
═══════════════════════════════════════════════════════════════════════════════

${inputs.competitorMd}

` : ''}═══════════════════════════════════════════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Generate today's build-suggestions file. 3-5 Top Picks, each tagged, with specific URL/path citations. Defer section for tempting-but-skip ideas. Apply every rule from the playbook. Cross-check against Queue/open.md to avoid duplicates.

If today's brief is genuinely thin (no novel signal, no actionable competitor moves, no STATE.md inflections), it is honest to ship a short file with 1-2 picks + Notes acknowledging the slow day. Padding with weak picks is worse than a short file.

Begin output with the literal delimiter "---FULL FILE START---" — no preamble.`;
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callAnthropic({ systemBlocks, userPrompt }) {
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  };

  const BACKOFF_MS = [15_000, 30_000, 60_000, 120_000];
  const maxAttempts = BACKOFF_MS.length;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 300)}`);
      }
      const json = await res.json();
      const text = json?.content?.[0]?.text;
      if (!text) throw new Error(`Unexpected response shape: ${JSON.stringify(json).slice(0, 300)}`);

      const usage = json.usage || {};
      const cacheRead = usage.cache_read_input_tokens ?? 0;
      const cacheCreate = usage.cache_creation_input_tokens ?? 0;
      console.log(`[build-suggestions] Anthropic ok on attempt ${attempt}. Input: ${usage.input_tokens}, Output: ${usage.output_tokens}, cache_read: ${cacheRead}, cache_create: ${cacheCreate}, stop_reason: ${json.stop_reason}`);

      // Cost-monitor log (best-effort, never throws)
      try {
        const { appendFileSync, mkdirSync } = await import('node:fs');
        mkdirSync('/var/log/agentcrush', { recursive: true });
        appendFileSync('/var/log/agentcrush/anthropic-costs.jsonl', JSON.stringify({
          ts: new Date().toISOString(),
          worker: 'agentcrush-build-suggestions',
          model: ANTHROPIC_MODEL,
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          cache_read_input_tokens: cacheRead,
          cache_creation_input_tokens: cacheCreate,
          stop_reason: json.stop_reason,
        }) + '\n');
      } catch { /* swallow */ }

      if (json.stop_reason === 'max_tokens') {
        throw new Error(`Anthropic hit max_tokens (${MAX_OUTPUT_TOKENS}) before completing. Bump MAX_OUTPUT_TOKENS or tighten the playbook.`);
      }
      return text;
    } catch (err) {
      lastErr = err;
      const wait = BACKOFF_MS[attempt - 1];
      if (attempt < maxAttempts) {
        console.warn(`[build-suggestions] Attempt ${attempt} failed: ${err.message}. Retrying in ${wait / 1000}s.`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw new Error(`Anthropic failed after ${maxAttempts} attempts: ${lastErr?.message}`);
}

// ── Output parsing ────────────────────────────────────────────────────────────

function parseOutput(text) {
  const fileMatch = text.match(/---FULL FILE START---([\s\S]*?)---FULL FILE END---/);
  const tgMatch = text.match(/---TELEGRAM START---([\s\S]*?)---TELEGRAM END---/);
  if (!fileMatch || !tgMatch) {
    throw new Error('Output missing required delimiters. Raw:\n' + text.slice(0, 500));
  }
  const fileBody = fileMatch[1].trim();
  const telegram = tgMatch[1].trim();
  if (fileBody.length < 100) throw new Error('Parsed file body suspiciously short. Raw:\n' + text.slice(0, 500));
  return { fileBody, telegram };
}

// ── Writers ───────────────────────────────────────────────────────────────────

async function writeToInbox(fileBody) {
  const outPath = path.join(BRAIN_PATH, 'Inbox', `${RUN_DATE}-build-suggestions.md`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, fileBody + '\n', 'utf-8');
  console.log(`[build-suggestions] Wrote ${outPath}`);
  return outPath;
}

function sendTelegram(message) {
  return new Promise((resolve, reject) => {
    const senderPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'telegram-sender.mjs');
    const child = spawn('node', [senderPath], {
      stdio: ['pipe', 'inherit', 'inherit'],
      env: process.env,
    });
    child.stdin.write(message);
    child.stdin.end();
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`telegram-sender exited ${code}`));
    });
    child.on('error', reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await ensureBrain();
  const inputs = await gatherInputs();

  const systemBlocks = buildSystemBlocks(inputs);
  const userPrompt = buildUserPrompt(inputs);

  const systemChars = systemBlocks.reduce((n, b) => n + b.text.length, 0);
  console.log(`[build-suggestions] System chars: ${systemChars} (cached prefix)  User chars: ${userPrompt.length}`);

  const raw = await callAnthropic({ systemBlocks, userPrompt });
  const { fileBody, telegram } = parseOutput(raw);

  if (isDryRun) {
    console.log('\n──── DRY RUN — FILE BODY ────');
    console.log(fileBody);
    console.log('\n──── DRY RUN — TELEGRAM ────');
    console.log(telegram);
    return;
  }

  await writeToInbox(fileBody);

  if (skipTelegram) {
    console.log('[build-suggestions] Telegram push skipped (--no-telegram).');
    return;
  }

  const tgMessage = `🛠️ AgentCrush build suggestions — ${RUN_DATE}\n\n${telegram}\n\nFull file: brain/Inbox/${RUN_DATE}-build-suggestions.md`;
  try {
    await sendTelegram(tgMessage);
    console.log('[build-suggestions] Telegram sent.');
  } catch (err) {
    console.error(`[build-suggestions] WARNING: Telegram push failed: ${err.message}`);
    process.exit(3);
  }
}

main().catch((err) => {
  console.error(`[build-suggestions] FATAL: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
