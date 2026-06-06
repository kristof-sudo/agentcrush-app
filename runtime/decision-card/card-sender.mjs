/**
 * Decision Card sender — pipes JSON card from card-builder.mjs to Telegram with inline buttons.
 *
 * Usage (chained):
 *   node card-builder.mjs --type morning | node card-sender.mjs
 *
 * Or standalone:
 *   node card-sender.mjs --json '{"text":"...","reply_markup":{...}}'
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

import { stdin } from 'node:process';

const args = process.argv.slice(2);
const flagValue = (n) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : null; };
const literalJson = flagValue('--json');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
if (!TOKEN || !CHAT_ID) {
  console.error('[card-sender] FATAL: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID required');
  process.exit(2);
}

async function readStdin() {
  let raw = '';
  for await (const chunk of stdin) raw += chunk;
  return raw.trim();
}

async function send({ text, reply_markup }) {
  // Telegram cap is 4096 chars. We deliberately keep cards under that; if the
  // card overflows, split into chunks BUT only attach reply_markup to the LAST
  // chunk so buttons stay one-per-card.
  const MAX = 4000;
  if (text.length <= MAX) {
    return await sendOne(text, reply_markup);
  }
  const chunks = [];
  let r = text;
  while (r.length > MAX) {
    const slice = r.slice(0, MAX);
    const cut = slice.lastIndexOf('\n');
    const at = cut > MAX * 0.5 ? cut : MAX;
    chunks.push(r.slice(0, at));
    r = r.slice(at).trimStart();
  }
  if (r) chunks.push(r);
  const ids = [];
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const labeled = chunks.length > 1 ? `(${i + 1}/${chunks.length})\n${chunks[i]}` : chunks[i];
    ids.push(await sendOne(labeled, isLast ? reply_markup : null));
    await new Promise(r => setTimeout(r, 250));
  }
  return ids[ids.length - 1];
}

async function sendOne(text, reply_markup) {
  const body = {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  };
  if (reply_markup) body.reply_markup = reply_markup;
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    // Markdown parse errors common — fallback once without parse_mode
    if (json.description && /can't parse|parse_mode/i.test(json.description)) {
      delete body.parse_mode;
      const res2 = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j2 = await res2.json();
      if (!res2.ok || !j2.ok) throw new Error(`Telegram ${res2.status}: ${JSON.stringify(j2)}`);
      return j2.result?.message_id;
    }
    throw new Error(`Telegram ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.result?.message_id;
}

async function main() {
  const raw = literalJson || await readStdin();
  if (!raw) { console.error('[card-sender] no input'); process.exit(2); }
  const card = JSON.parse(raw);
  if (!card.text) { console.error('[card-sender] missing text'); process.exit(2); }
  const id = await send({ text: card.text, reply_markup: card.reply_markup });
  console.error(`[card-sender] sent card_id=${card.card_id || '?'} msg_id=${id}`);
}

main().catch((err) => {
  console.error(`[card-sender] FATAL: ${err.message}`);
  process.exit(1);
});
