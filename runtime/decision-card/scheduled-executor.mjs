/**
 * scheduled-executor.mjs — Dispatches all approved actions from the decision card queue.
 *
 * Runs on two systemd timers:
 *   07:00 UTC (09:00 Budapest) — mid-morning, after Kris's morning-card tap
 *   21:00 UTC (23:00 Budapest) — overnight safe-ship window
 *
 * What it does:
 *   1. Reads Agents/decision-card/action-queue.json
 *   2. Finds every action with status='approved'
 *   3. Dispatches each via action-dispatcher.mjs
 *   4. Updates status → 'done' (success) or 'error' (failure)
 *   5. Sends a Telegram summary of what ran
 *   6. Saves the updated queue
 *
 * Idempotent: safe to run multiple times per day — only 'approved' items run,
 * 'done' items are skipped, 'pending' items wait for the card.
 *
 * IMPORTANT: This executor intentionally does NOT create new content or make
 * strategic decisions. It only executes what Kris already approved via Telegram.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { dispatch } from './action-dispatcher.mjs';

const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID  = String(process.env.TELEGRAM_CHAT_ID || '');
const BRAIN    = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const QUEUE    = path.join(BRAIN, 'Agents/decision-card/action-queue.json');
const LOG_FILE = path.join(BRAIN, 'Agents/decision-card/executor-log.jsonl');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function tg(method, body) {
  if (!TOKEN || !CHAT_ID) return null;
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

async function sendTg(text) {
  return tg('sendMessage', {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });
}

async function loadQueue() {
  try { return JSON.parse(await fs.readFile(QUEUE, 'utf-8')); }
  catch (_) { return { actions: [] }; }
}

async function saveQueue(q) {
  q.updated_at = new Date().toISOString();
  await fs.mkdir(path.dirname(QUEUE), { recursive: true });
  await fs.writeFile(QUEUE, JSON.stringify(q, null, 2));
}

async function appendLog(entry) {
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  await fs.appendFile(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const RUN_LABEL = process.argv[2] || 'scheduled';  // 'morning' | 'overnight' | 'scheduled'
const UTC_H = new Date().getUTCHours();
const IS_OVERNIGHT = UTC_H >= 20 || UTC_H < 6;

console.log(`[executor] run=${RUN_LABEL} utc_hour=${UTC_H} overnight=${IS_OVERNIGHT}`);

const queue = await loadQueue();
const approved = (queue.actions || []).filter(a => a.status === 'approved');

if (!approved.length) {
  console.log('[executor] no approved actions — nothing to do');
  await appendLog({ run: RUN_LABEL, dispatched: 0, note: 'no approved actions' });
  // No Telegram ping when nothing to do — don't create noise
  process.exit(0);
}

const results = [];
for (const action of approved) {
  console.log(`[executor] dispatching ${action.action_id} type=${action.type}`);
  try {
    const result = await dispatch(action);
    const status = result.ok ? 'done' : 'error';
    action.status     = status;
    action.executed_at = new Date().toISOString();
    action.result_msg  = result.message || '';
    results.push({ ...action, ok: result.ok });
    console.log(`[executor] ${action.action_id} → ${status}: ${result.message}`);
    await appendLog({
      run: RUN_LABEL,
      action_id: action.action_id,
      type: action.type,
      label: action.label,
      ok: result.ok,
      message: result.message,
    });
  } catch (err) {
    action.status      = 'error';
    action.executed_at = new Date().toISOString();
    action.result_msg  = err.message;
    results.push({ ...action, ok: false });
    console.error(`[executor] ${action.action_id} threw: ${err.message}`);
    await appendLog({ run: RUN_LABEL, action_id: action.action_id, type: action.type, ok: false, error: err.message });
  }
}

await saveQueue(queue);

// ── Telegram summary ─────────────────────────────────────────────────────────

const ok   = results.filter(r => r.ok);
const fail = results.filter(r => !r.ok);
const runLabel = RUN_LABEL === 'overnight' ? '🌙 Overnight executor' : '☀️ Mid-morning executor';
const statusLine = fail.length === 0
  ? `✅ ${ok.length} action${ok.length !== 1 ? 's' : ''} dispatched cleanly`
  : `⚠️ ${ok.length} ok · ${fail.length} failed`;

const lines = [`${runLabel} — ${statusLine}`];
for (const r of results) {
  const icon = r.ok ? '✓' : '✗';
  const msg  = (r.result_msg || '').slice(0, 80);
  lines.push(`${icon} *${r.type}* — ${r.label || r.action_id}\n  ↳ ${msg}`);
}
if (fail.length > 0) {
  lines.push(`\n🔴 Failed actions were left as status=error in the queue. Check actions-log.jsonl.`);
}

await sendTg(lines.join('\n'));
console.log(`[executor] done — ok=${ok.length} fail=${fail.length}`);
