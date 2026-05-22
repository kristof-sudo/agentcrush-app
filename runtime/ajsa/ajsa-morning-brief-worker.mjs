/**
 * Ajsa Morning Brief worker — daily Social Brief producer (Phase 1)
 *
 * Reads deterministic Layer 1 fetcher output + brain context, calls Claude
 * Haiku 4.5 to synthesize the Social Brief, writes the full markdown brief
 * to the brain's per-agent silo, and pushes a condensed Telegram-formatted
 * version to Kris via telegram-sender.mjs.
 *
 * This is a STANDALONE Node script — not an OpenClaw agent. The Ajsa silo
 * (agentcrush-brain/Agents/ajsa/) is the artifact namespace; this worker
 * writes there but is itself just a cron job calling the Anthropic API.
 *
 * Replaces the retired Bix Social Brief. The architectural rule: the LLM
 * never scans the web — it only synthesizes structured input from the
 * deterministic fetchers. Hallucinated mentions are not possible because
 * the input space is bounded to the fetcher JSON.
 *
 * Usage:
 *   node runtime/ajsa/ajsa-morning-brief-worker.mjs              # run for today, write + telegram
 *   node runtime/ajsa/ajsa-morning-brief-worker.mjs --dry-run    # no Telegram, no file write — print to stdout
 *   node runtime/ajsa/ajsa-morning-brief-worker.mjs --date YYYY-MM-DD  # run for a specific date
 *   node runtime/ajsa/ajsa-morning-brief-worker.mjs --no-telegram  # write brief but skip push
 *
 * Env (required):
 *   ANTHROPIC_API_KEY    — required, used for Haiku call
 *   BRAIN_PATH           — path to agentcrush-brain clone (default: /opt/agentcrush-brain)
 *
 * Env (passed through to telegram-sender.mjs when called):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *
 * Cost: ~$0.015 per call (Haiku 4.5, ~15K in + 3K out). ~$0.45/month at daily.
 *
 * Exit codes:
 *   0 — success (brief written, Telegram sent or dry-run/no-telegram)
 *   1 — Anthropic API failed AFTER retries; brief NOT written
 *   2 — env / arg / brain-path error; nothing attempted
 *   3 — brief written but Telegram push failed (partial success; incident logged)
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
  console.error(`[ajsa-morning-brief] FATAL: invalid --date "${RUN_DATE}". Expected YYYY-MM-DD.`);
  process.exit(2);
}

// ── Env ───────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';

if (!ANTHROPIC_API_KEY) {
  console.error('[ajsa-morning-brief] FATAL: ANTHROPIC_API_KEY not set.');
  process.exit(2);
}

const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 8192;

console.log(`[ajsa-morning-brief] Date: ${RUN_DATE}  Mode: ${isDryRun ? 'DRY-RUN' : 'WRITE'}  Telegram: ${skipTelegram ? 'OFF' : 'ON'}`);
console.log(`[ajsa-morning-brief] Brain path: ${BRAIN_PATH}  Model: ${ANTHROPIC_MODEL}`);

// ── File helpers ──────────────────────────────────────────────────────────────

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function readJsonIfExists(filePath) {
  const raw = await readIfExists(filePath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[ajsa-morning-brief] WARNING: ${filePath} exists but is invalid JSON: ${err.message}`);
    return null;
  }
}

function previousDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Gather inputs ─────────────────────────────────────────────────────────────

async function gatherInputs() {
  const fetcherDir = path.join(BRAIN_PATH, 'Fetchers');

  // Neynar — try today, fall back to yesterday
  const neynarTodayPath = path.join(fetcherDir, 'neynar', 'output', `farcaster-${RUN_DATE}.json`);
  let neynarData = await readJsonIfExists(neynarTodayPath);
  let neynarSourceDate = RUN_DATE;
  let neynarStaleness = null;
  if (neynarData === null) {
    const yesterday = previousDay(RUN_DATE);
    const neynarYesterdayPath = path.join(fetcherDir, 'neynar', 'output', `farcaster-${yesterday}.json`);
    neynarData = await readJsonIfExists(neynarYesterdayPath);
    neynarSourceDate = yesterday;
    if (neynarData !== null) {
      neynarStaleness = `Today's Neynar fetch is missing — using yesterday's (${yesterday}).`;
      console.warn(`[ajsa-morning-brief] WARNING: ${neynarStaleness}`);
    }
  }
  if (neynarData === null) {
    console.warn(`[ajsa-morning-brief] WARNING: No Neynar data for today or yesterday. Brief will note the gap.`);
  }

  // X — try today only (gated on auth being live); fail gracefully
  const xTodayPath = path.join(fetcherDir, 'x-api', 'output', `x-${RUN_DATE}.json`);
  const xData = await readJsonIfExists(xTodayPath);

  // Brain context
  const stateMd = await readIfExists(path.join(BRAIN_PATH, 'STATE.md'));
  const memoryMd = await readIfExists(path.join(BRAIN_PATH, 'Memory.md'));
  const playbookFormat = await readIfExists(path.join(BRAIN_PATH, 'Playbooks', 'morning-routine.md'));
  const ajsaPlaybook = await readIfExists(path.join(BRAIN_PATH, 'Agents', 'ajsa', 'playbook.md'));

  for (const [name, content] of [
    ['STATE.md', stateMd],
    ['Memory.md', memoryMd],
    ['Playbooks/morning-routine.md', playbookFormat],
  ]) {
    if (!content) {
      console.error(`[ajsa-morning-brief] FATAL: required brain file missing: ${name}`);
      process.exit(2);
    }
  }

  return {
    neynarData,
    neynarSourceDate,
    neynarStaleness,
    xData,
    stateMd,
    memoryMd,
    playbookFormat,
    ajsaPlaybook: ajsaPlaybook || '(empty — no prior learnings yet)',
  };
}

// ── Prompt construction ───────────────────────────────────────────────────────

function buildSystemPrompt(inputs) {
  return `You are Ajsa, the AgentCrush Morning Social Brief producer. You produce a daily brief in a specific format defined in the playbook below. You only assert things traceable to specific rows in the fetcher JSON — you NEVER invent mentions, posts, or engagement metrics. The Bix Social Brief was retired 2026-05-18 for exactly this kind of fabrication; the architecture now isolates you from it by giving you only deterministic JSON inputs.

You are writing for Kris, the founder of AgentCrush. He reads your output on Telegram over coffee, then opens a Claude Code session where the COO verifies your work against ground truth.

═══════════════════════════════════════════════════════════════════════════════
PLAYBOOK — content rules, format, voice (Playbooks/morning-routine.md)
═══════════════════════════════════════════════════════════════════════════════

${inputs.playbookFormat}

═══════════════════════════════════════════════════════════════════════════════
DURABLE BRAND CONTEXT (Memory.md — voice rules, positioning, strategy posture)
═══════════════════════════════════════════════════════════════════════════════

${inputs.memoryMd}

═══════════════════════════════════════════════════════════════════════════════
COMPOUNDING LEARNINGS — past Kris feedback on Ajsa briefs (Agents/ajsa/playbook.md)
═══════════════════════════════════════════════════════════════════════════════

${inputs.ajsaPlaybook}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT
═══════════════════════════════════════════════════════════════════════════════

Output exactly the following structure, with these literal delimiters:

---FULL BRIEF START---
<full markdown brief, all sections per playbook>
---FULL BRIEF END---
---TELEGRAM START---
<condensed plain-text Telegram message, ≤3500 chars, per playbook envelope rules>
---TELEGRAM END---

Do not output anything outside these delimiters. No preamble, no summary at the end, no commentary on what you did.

The full brief is committed to the brain. The Telegram message is what Kris reads on his phone — it must be self-contained and parsable on a small screen.

Every draft action in either output MUST reference a specific cast/post URL or hash from the fetcher JSON. If no URL exists for an item, don't suggest the action.`;
}

function buildUserPrompt(inputs) {
  const stalenessNote = inputs.neynarStaleness ? `\n\n⚠️ DATA NOTE: ${inputs.neynarStaleness}\n` : '';
  const xNote = inputs.xData ? '' : '\n\n📝 NOTE: No X data today. X Bearer Token may not be live yet — proceed with Farcaster only.\n';

  return `Today's date is ${RUN_DATE}.${stalenessNote}${xNote}

═══════════════════════════════════════════════════════════════════════════════
CURRENT PRODUCT STATE (STATE.md — what shipped this week, what's queued)
═══════════════════════════════════════════════════════════════════════════════

${inputs.stateMd}

═══════════════════════════════════════════════════════════════════════════════
FARCASTER SIGNAL (Neynar fetch from ${inputs.neynarSourceDate}, lookback ${inputs.neynarData?.lookback_hours ?? '?'}h)
═══════════════════════════════════════════════════════════════════════════════

${inputs.neynarData ? JSON.stringify(inputs.neynarData, null, 2) : '(NO DATA — fetcher missed today and yesterday. Brief should explicitly note "Farcaster fetch unavailable" in section 1.)'}

${inputs.xData ? `═══════════════════════════════════════════════════════════════════════════════
X SIGNAL (X API fetch, lookback ${inputs.xData.lookback_hours}h)
═══════════════════════════════════════════════════════════════════════════════

${JSON.stringify(inputs.xData, null, 2)}` : ''}

═══════════════════════════════════════════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Generate the Social Brief for ${RUN_DATE}.

Apply every rule from the playbook (section structure, evidence-anchoring, Telegram envelope, etc.) and from the durable brand context (voice rules — first-person founder-style on Farcaster, "we" on X, no hashtags, etc.) and from the compounding learnings.

If today's fetcher data is empty or near-empty (no mentions, no keyword hits, no recent activity), produce a brief that says so explicitly — do not pad with invented signal. The Telegram message in that case is a one-liner per the playbook.

Begin output with the literal delimiter "---FULL BRIEF START---" — no preamble.`;
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callAnthropic({ systemPrompt, userPrompt }) {
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };

  // Retry policy: 4 attempts with exponential backoff [15s, 30s, 60s, 120s].
  // Total window ~3.5 min — covers typical Anthropic transient overloads (HTTP 529).
  // If all attempts fail, caller will send a Telegram failure alert.
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
      if (!text) {
        throw new Error(`Unexpected Anthropic response shape: ${JSON.stringify(json).slice(0, 300)}`);
      }
      const usage = json.usage || {};
      const stopReason = json.stop_reason;
      console.log(`[ajsa-morning-brief] Anthropic ok on attempt ${attempt}. Input tokens: ${usage.input_tokens}, output tokens: ${usage.output_tokens}, stop_reason: ${stopReason}`);
      if (stopReason === 'max_tokens') {
        throw new Error(`Anthropic hit max_tokens (${MAX_OUTPUT_TOKENS}) before completing. Output is truncated and unsafe to parse. Bump MAX_OUTPUT_TOKENS, shorten the prompt, or tighten the brief format spec.`);
      }
      return text;
    } catch (err) {
      lastErr = err;
      const waitMs = attempt < maxAttempts ? BACKOFF_MS[attempt - 1] : 0;
      console.warn(`[ajsa-morning-brief] Anthropic attempt ${attempt}/${maxAttempts} failed: ${err.message}${waitMs ? ` — waiting ${waitMs / 1000}s before retry` : ''}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  throw new Error(`Anthropic failed after ${maxAttempts} attempts (~3.5 min window): ${lastErr?.message}`);
}

// ── Telegram failure alert ────────────────────────────────────────────────────

async function sendFailureAlert(errorMessage) {
  // On total failure, push a short Telegram alert so Kris knows the brief
  // didn't land instead of silently missing it. Best-effort: if this also
  // fails, just log it; the brief incident is already in incidents.md.
  return new Promise((resolve) => {
    const senderPath = '/opt/agentcrush/tools/telegram-sender.mjs';
    const alertText =
      `❌ Morning brief failed for ${RUN_DATE}.\n\n` +
      `Error: ${errorMessage.slice(0, 500)}\n\n` +
      `The worker will be re-attempted by Kris or by the next scheduled run. ` +
      `Incident logged at brain/Agents/ajsa/incidents.md.`;
    const child = spawn(
      'node',
      [senderPath, '--message', alertText, '--header', `⚠️ AgentCrush — morning brief failure ${RUN_DATE}`],
      { stdio: ['ignore', 'inherit', 'inherit'], env: process.env },
    );
    child.on('exit', (code) => {
      if (code === 0) console.log('[ajsa-morning-brief] Failure alert pushed to Telegram.');
      else console.error(`[ajsa-morning-brief] Failure alert send exited with code ${code}; user is unaware.`);
      resolve();
    });
    child.on('error', (err) => {
      console.error(`[ajsa-morning-brief] Failure alert spawn failed: ${err.message}; user is unaware.`);
      resolve();
    });
  });
}

// ── Output parsing ────────────────────────────────────────────────────────────

function parseOutput(text) {
  const fullStart = text.indexOf('---FULL BRIEF START---');
  const fullEnd = text.indexOf('---FULL BRIEF END---');
  const tgStart = text.indexOf('---TELEGRAM START---');
  const tgEnd = text.indexOf('---TELEGRAM END---');

  if (fullStart === -1 || fullEnd === -1 || tgStart === -1 || tgEnd === -1) {
    throw new Error('Anthropic output missing one or more required delimiters. Raw output:\n' + text.slice(0, 500));
  }

  const fullBrief = text.slice(fullStart + '---FULL BRIEF START---'.length, fullEnd).trim();
  const telegramMsg = text.slice(tgStart + '---TELEGRAM START---'.length, tgEnd).trim();

  if (fullBrief.length < 50) {
    throw new Error('Parsed full brief is suspiciously short (<50 chars). Raw output:\n' + text.slice(0, 500));
  }
  if (telegramMsg.length < 20) {
    throw new Error('Parsed Telegram message is suspiciously short (<20 chars).');
  }

  return { fullBrief, telegramMsg };
}

// ── Output writing ────────────────────────────────────────────────────────────

async function writeBriefToBrain(fullBrief) {
  const outDir = path.join(BRAIN_PATH, 'Agents', 'ajsa', 'output');
  const outPath = path.join(outDir, `social-brief-${RUN_DATE}.md`);

  const frontmatter = `---
title: Social Brief — ${RUN_DATE}
date: ${RUN_DATE}
type: social-brief
producer: ajsa-morning-brief-worker.mjs
model: ${ANTHROPIC_MODEL}
generated_at: ${new Date().toISOString()}
---

`;

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, frontmatter + fullBrief + '\n');
  console.log(`[ajsa-morning-brief] Wrote ${outPath}`);
  return outPath;
}

async function appendIncident(message) {
  const incidentsPath = path.join(BRAIN_PATH, 'Agents', 'ajsa', 'incidents.md');
  const entry = `\n## ${new Date().toISOString()} — ${message.slice(0, 80)}\n\n${message}\n`;
  try {
    await fs.appendFile(incidentsPath, entry);
    console.log(`[ajsa-morning-brief] Incident logged to ${incidentsPath}`);
  } catch (err) {
    console.error(`[ajsa-morning-brief] Failed to log incident: ${err.message}`);
  }
}

// ── Telegram send ─────────────────────────────────────────────────────────────

async function sendTelegram(telegramMsg) {
  return new Promise((resolve, reject) => {
    const senderPath = '/opt/agentcrush/tools/telegram-sender.mjs';
    const headerText = `📱 AgentCrush social brief — ${RUN_DATE}`;
    const child = spawn(
      'node',
      [senderPath, '--message', telegramMsg, '--header', headerText],
      { stdio: ['ignore', 'inherit', 'inherit'], env: process.env },
    );
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`telegram-sender exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const inputs = await gatherInputs();
  const systemPrompt = buildSystemPrompt(inputs);
  const userPrompt = buildUserPrompt(inputs);

  console.log(`[ajsa-morning-brief] System prompt: ${systemPrompt.length} chars. User prompt: ${userPrompt.length} chars.`);

  let rawOutput;
  try {
    rawOutput = await callAnthropic({ systemPrompt, userPrompt });
  } catch (err) {
    console.error(`[ajsa-morning-brief] FATAL: ${err.message}`);
    if (!isDryRun) {
      await appendIncident(`Anthropic call failed: ${err.message}`);
      if (!skipTelegram) await sendFailureAlert(err.message);
    }
    process.exit(1);
  }

  let parsed;
  try {
    parsed = parseOutput(rawOutput);
  } catch (err) {
    console.error(`[ajsa-morning-brief] FATAL: ${err.message}`);
    if (!isDryRun) await appendIncident(`Output parse failed: ${err.message}\n\nRaw output:\n${rawOutput.slice(0, 1000)}`);
    process.exit(1);
  }

  console.log(`[ajsa-morning-brief] Parsed. Full brief: ${parsed.fullBrief.length} chars. Telegram: ${parsed.telegramMsg.length} chars.`);

  if (isDryRun) {
    console.log('═══ FULL BRIEF ═══');
    console.log(parsed.fullBrief);
    console.log('═══ TELEGRAM ═══');
    console.log(parsed.telegramMsg);
    process.exit(0);
  }

  await writeBriefToBrain(parsed.fullBrief);

  if (skipTelegram) {
    console.log('[ajsa-morning-brief] --no-telegram: skipping push.');
    process.exit(0);
  }

  try {
    await sendTelegram(parsed.telegramMsg);
    console.log('[ajsa-morning-brief] Telegram push ok.');
    process.exit(0);
  } catch (err) {
    console.error(`[ajsa-morning-brief] Telegram push failed: ${err.message}`);
    await appendIncident(`Telegram push failed (brief still written): ${err.message}`);
    process.exit(3);
  }
}

main().catch((err) => {
  console.error(`[ajsa-morning-brief] Uncaught: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
