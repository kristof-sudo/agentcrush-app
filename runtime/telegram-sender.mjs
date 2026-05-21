/**
 * Telegram sender — generic, used by cron-driven reminders
 *
 * Reads a Markdown file (typically a playbook from the brain repo) and posts
 * its content to a Telegram chat via the Bot API. Designed to be the single
 * sender used by any recurring reminder (Tuesday VPS health check today;
 * future Wed stale-content audit, Sun eval re-run, etc.).
 *
 * Usage:
 *   node runtime/telegram-sender.mjs --file <path>
 *   node runtime/telegram-sender.mjs --file <path> --extract-prompt-block
 *   node runtime/telegram-sender.mjs --message "literal text"
 *
 * Flags:
 *   --file <path>             Read message body from this file
 *   --message <text>          Use literal text as message body
 *   --extract-prompt-block    Extract the first ``` fenced block from the file
 *                             (useful when the playbook wraps the prompt in
 *                             a code fence — we only send the prompt itself)
 *   --header <text>           Prepend a short header line (e.g. "📋 Tuesday VPS health check")
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN  — required
 *   TELEGRAM_CHAT_ID    — required (numeric chat ID; for a user DM this is
 *                         the user's Telegram ID)
 *
 * Exit codes:
 *   0 — message sent (Telegram returned ok:true)
 *   1 — Telegram API returned an error (rate limit, bad chat, etc.)
 *   2 — env or arg error; nothing sent
 */

import fs from 'node:fs/promises';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flagValue(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

const filePath = flagValue('--file');
const literalMessage = flagValue('--message');
const header = flagValue('--header');
const extractBlock = args.includes('--extract-prompt-block');

if (!filePath && !literalMessage) {
  console.error('[telegram-sender] FATAL: must specify --file <path> or --message <text>');
  process.exit(2);
}
if (filePath && literalMessage) {
  console.error('[telegram-sender] FATAL: cannot specify both --file and --message');
  process.exit(2);
}

// ── Env ───────────────────────────────────────────────────────────────────────

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN) {
  console.error('[telegram-sender] FATAL: TELEGRAM_BOT_TOKEN not set');
  process.exit(2);
}
if (!CHAT_ID) {
  console.error('[telegram-sender] FATAL: TELEGRAM_CHAT_ID not set');
  process.exit(2);
}

// ── Body resolution ───────────────────────────────────────────────────────────

async function resolveBody() {
  if (literalMessage) return literalMessage;

  const raw = await fs.readFile(filePath, 'utf-8');

  if (!extractBlock) return raw;

  // Extract the first fenced code block. Matches ```...``` (with optional language tag).
  const match = raw.match(/```[^\n]*\n([\s\S]*?)```/);
  if (!match) {
    console.error(`[telegram-sender] FATAL: --extract-prompt-block set but no fenced block found in ${filePath}`);
    process.exit(2);
  }
  return match[1].trim();
}

// ── Telegram send ─────────────────────────────────────────────────────────────

const TELEGRAM_MAX_MESSAGE = 4096;

async function send(text) {
  // If over Telegram's 4096-char limit, split on newline boundaries.
  if (text.length <= TELEGRAM_MAX_MESSAGE) {
    return [await sendOne(text)];
  }

  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= TELEGRAM_MAX_MESSAGE) {
      chunks.push(remaining);
      break;
    }
    // Find the last newline before the limit; fall back to hard cut.
    const slice = remaining.slice(0, TELEGRAM_MAX_MESSAGE);
    const lastNewline = slice.lastIndexOf('\n');
    const cutAt = lastNewline > TELEGRAM_MAX_MESSAGE * 0.5 ? lastNewline : TELEGRAM_MAX_MESSAGE;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).trimStart();
  }

  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const labeled = `(${i + 1}/${chunks.length})\n${chunks[i]}`;
    results.push(await sendOne(labeled));
    await new Promise((r) => setTimeout(r, 250)); // gentle rate limit
  }
  return results;
}

async function sendOne(text) {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(`Telegram ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.result?.message_id;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let body = await resolveBody();
  if (header) body = `${header}\n\n${body}`;

  const ids = await send(body);
  console.log(`[telegram-sender] Sent ${ids.length} message(s). IDs: ${ids.join(', ')}`);
}

main().catch((err) => {
  console.error(`[telegram-sender] FATAL: ${err.message}`);
  process.exit(1);
});
