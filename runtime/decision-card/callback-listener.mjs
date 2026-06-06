/**
 * Decision Card callback listener — long-polls Telegram for button taps + text replies.
 *
 * Runs as a persistent systemd service. Polls getUpdates with
 * allowed_updates=[callback_query, message], dispatches each.
 *
 * Button callback_data format:
 *   "approve:<action_id>" | "reject:<action_id>" | "defer:<action_id>"
 *
 * Text commands (case-insensitive):
 *   status         — quick summary of queue + costs
 *   costs          — projected monthly + 24h
 *   skip N         — reject pending action #N (1-indexed)
 *   defer N        — defer pending action #N
 *   help           — list commands
 *
 * State:
 *   - Action queue at <BRAIN_PATH>/Agents/decision-card/action-queue.json
 *   - Update offset persisted at /var/lib/agentcrush/tg-update-offset.json
 *   - Action log appended to <BRAIN_PATH>/Agents/decision-card/actions-log.jsonl
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { dispatch } from './action-dispatcher.mjs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');
const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const OFFSET_PATH = process.env.OFFSET_PATH || '/var/lib/agentcrush/tg-update-offset.json';
const QUEUE_PATH = path.join(BRAIN_PATH, 'Agents/decision-card/action-queue.json');
const POLL_TIMEOUT_S = 25; // long-poll timeout

if (!TOKEN || !CHAT_ID) {
  console.error('[callback-listener] FATAL: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID required');
  process.exit(2);
}

// ── State helpers ────────────────────────────────────────────────────────────

async function readOffset() {
  try { return JSON.parse(await fs.readFile(OFFSET_PATH, 'utf-8')).offset || 0; }
  catch (_) { return 0; }
}
async function writeOffset(offset) {
  await fs.mkdir(path.dirname(OFFSET_PATH), { recursive: true });
  await fs.writeFile(OFFSET_PATH, JSON.stringify({ offset, updated_at: new Date().toISOString() }));
}

async function loadQueue() {
  try { return JSON.parse(await fs.readFile(QUEUE_PATH, 'utf-8')); }
  catch (_) { return { actions: [] }; }
}
async function saveQueue(queue) {
  queue.updated_at = new Date().toISOString();
  await fs.mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

// ── Telegram helpers ─────────────────────────────────────────────────────────

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

async function answerCallback(callback_query_id, text) {
  return tg('answerCallbackQuery', { callback_query_id, text, show_alert: false });
}

async function reply(text, reply_to_message_id) {
  return tg('sendMessage', {
    chat_id: CHAT_ID,
    text,
    reply_to_message_id,
    disable_web_page_preview: true,
  });
}

// ── Command handlers ─────────────────────────────────────────────────────────

async function cmdStatus() {
  const q = await loadQueue();
  const pending = q.actions.filter(a => a.status === 'pending');
  const lines = [
    `Queue: ${pending.length} pending`,
  ];
  pending.slice(0, 5).forEach((a, i) => lines.push(`  ${i + 1}. [${a.type}] ${a.label.slice(0, 80)}`));
  return lines.join('\n');
}

async function cmdCosts() {
  // Reuse the cost-summary logic from card-builder. Simpler: just import or rerun.
  const COST_LOG = '/var/log/agentcrush/anthropic-costs.jsonl';
  try {
    const raw = await fs.readFile(COST_LOG, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const now = Date.now(); const DAY = 24 * 3600 * 1000;
    let l24 = 0, l7 = 0;
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        const ts = new Date(e.ts).getTime();
        const cost = ((e.input_tokens ?? 0) * 1e-6) + ((e.output_tokens ?? 0) * 5e-6)
          + ((e.cache_read_input_tokens ?? 0) * 0.1e-6) + ((e.cache_creation_input_tokens ?? 0) * 1.25e-6);
        const age = now - ts;
        if (age < DAY) l24 += cost;
        if (age < 7 * DAY) l7 += cost;
      } catch (_) {}
    }
    const projected = l7 * (30 / 7);
    return `Costs: 24h $${l24.toFixed(3)} · 7d $${l7.toFixed(2)} · projected monthly $${projected.toFixed(2)} of $10 cap (${(projected / 10 * 100).toFixed(0)}%)`;
  } catch (e) {
    return `Costs: log unreadable (${e.message})`;
  }
}

async function cmdSkipOrDefer(idx, mode) {
  const q = await loadQueue();
  const pending = q.actions.filter(a => a.status === 'pending');
  if (idx < 1 || idx > pending.length) return `No item #${idx}. Use 'status' to see queue.`;
  const target = pending[idx - 1];
  if (mode === 'skip') {
    target.status = 'rejected';
    target.acted_at = new Date().toISOString();
    target.acted_via = 'text-reply';
    await saveQueue(q);
    return `✓ Rejected #${idx}: ${target.label.slice(0, 80)}`;
  } else {
    // defer = keep status=pending, but mark as deferred so next card flags it
    target.deferred = (target.deferred || 0) + 1;
    target.last_deferred_at = new Date().toISOString();
    await saveQueue(q);
    return `⏭ Deferred #${idx}: will resurface in next card`;
  }
}

// ── Update handlers ──────────────────────────────────────────────────────────

async function handleCallbackQuery(cq) {
  const data = cq.data || '';
  const m = data.match(/^(approve|reject|defer):([a-f0-9]+)$/);
  if (!m) {
    await answerCallback(cq.id, 'unknown callback');
    return;
  }
  const [, verb, action_id] = m;
  const q = await loadQueue();
  const target = q.actions.find(a => a.action_id === action_id);
  if (!target) {
    await answerCallback(cq.id, 'action not found in queue');
    return;
  }
  if (target.status !== 'pending') {
    await answerCallback(cq.id, `already ${target.status}`);
    return;
  }
  if (verb === 'approve') {
    const result = await dispatch(target);
    target.status = result.ok ? 'executed' : 'failed';
    target.acted_at = new Date().toISOString();
    target.acted_via = 'button';
    target.result = result;
    await saveQueue(q);
    await answerCallback(cq.id, result.ok ? `✓ ${result.message.slice(0, 60)}` : `✗ ${result.message.slice(0, 60)}`);
    await reply(`${result.ok ? '✅' : '❌'} ${target.label}\n→ ${result.message}`, cq.message?.message_id);
  } else if (verb === 'reject') {
    target.status = 'rejected';
    target.acted_at = new Date().toISOString();
    target.acted_via = 'button';
    await saveQueue(q);
    await answerCallback(cq.id, 'rejected');
    await reply(`❌ Rejected: ${target.label}`, cq.message?.message_id);
  } else if (verb === 'defer') {
    target.deferred = (target.deferred || 0) + 1;
    target.last_deferred_at = new Date().toISOString();
    await saveQueue(q);
    await answerCallback(cq.id, 'deferred to next card');
    await reply(`⏭ Deferred: ${target.label}`, cq.message?.message_id);
  }
}

async function handleMessage(msg) {
  if (!msg.text) return;
  if (String(msg.chat?.id) !== CHAT_ID) return; // ignore other chats

  const text = msg.text.trim().toLowerCase();
  let response = null;

  if (text === 'status' || text === '/status') {
    response = await cmdStatus();
  } else if (text === 'costs' || text === '/costs') {
    response = await cmdCosts();
  } else if (text === 'help' || text === '/help') {
    response = [
      'Commands:',
      '  status              — pending queue',
      '  costs               — monthly spend',
      '  skip N              — reject item N',
      '  defer N             — defer item N to next card',
      '  help                — this list',
      'Or use inline buttons on cards.',
    ].join('\n');
  } else {
    const skipMatch = text.match(/^skip\s+(\d+)$/);
    const deferMatch = text.match(/^defer\s+(\d+)$/);
    if (skipMatch) response = await cmdSkipOrDefer(Number(skipMatch[1]), 'skip');
    else if (deferMatch) response = await cmdSkipOrDefer(Number(deferMatch[1]), 'defer');
  }

  if (response) await reply(response, msg.message_id);
}

// ── Main poll loop ───────────────────────────────────────────────────────────

async function pollOnce() {
  const offset = await readOffset();
  const res = await tg('getUpdates', {
    offset,
    timeout: POLL_TIMEOUT_S,
    allowed_updates: ['callback_query', 'message'],
  });
  if (!res.ok) {
    console.error(`[callback-listener] getUpdates failed: ${JSON.stringify(res).slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 5000));
    return;
  }
  const updates = res.result || [];
  for (const u of updates) {
    try {
      if (u.callback_query) await handleCallbackQuery(u.callback_query);
      else if (u.message) await handleMessage(u.message);
    } catch (err) {
      console.error(`[callback-listener] update ${u.update_id} error: ${err.message}`);
    }
    await writeOffset(u.update_id + 1);
  }
}

async function main() {
  console.log(`[callback-listener] starting. chat=${CHAT_ID} brain=${BRAIN_PATH}`);
  let consecutiveErrors = 0;
  while (true) {
    try {
      await pollOnce();
      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      console.error(`[callback-listener] poll error #${consecutiveErrors}: ${err.message}`);
      const backoff = Math.min(60_000, 1000 * Math.pow(2, consecutiveErrors));
      await new Promise(r => setTimeout(r, backoff));
    }
  }
}

main().catch((err) => {
  console.error(`[callback-listener] FATAL: ${err.message}`);
  process.exit(1);
});
