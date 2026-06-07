/**
 * midday-check.mjs — Lightweight 13:00 Budapest (11:00 UTC) status check.
 *
 * Runs once daily. Sends a compact Telegram status message:
 *   - Queue snapshot: N approved, N pending, N deferred
 *   - Last deploy: when + success/fail
 *   - Cost pace: 24h vs monthly cap
 *   - Any ERROR items in the queue (need attention)
 *
 * This is an info-only push. Kris can reply with "status" to the decision card
 * bot for an on-demand version. This one fires automatically so it shows up
 * in Telegram context at a time when Kris might glance at his phone.
 *
 * No LLM calls — pure data read + format. Zero cost.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');
const BRAIN   = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const QUEUE   = path.join(BRAIN, 'Agents/decision-card/action-queue.json');
const COST_LOG = '/var/log/agentcrush/anthropic-costs.jsonl';

// Skip midday check on Sundays (weekly digest + retrospective covers it)
const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function tgSend(text) {
  if (!TOKEN || !CHAT_ID) { console.log('[midday]', text); return; }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  });
  return res.json().catch(() => ({}));
}

async function readQueue() {
  try { return JSON.parse(await fs.readFile(QUEUE, 'utf-8')); }
  catch (_) { return { actions: [] }; }
}

async function readRecentCosts() {
  try {
    const raw = await fs.readFile(COST_LOG, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const yesterday = Date.now() - 86400 * 1000;
    let cost24h = 0;
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (new Date(e.ts).getTime() > yesterday) cost24h += e.cost_usd || 0;
      } catch (_) {}
    }
    // Project monthly from recent 24h pace
    const projectedMonthly = cost24h * 30;
    return { cost24h: cost24h.toFixed(4), projectedMonthly: projectedMonthly.toFixed(2) };
  } catch (_) {
    return { cost24h: 'n/a', projectedMonthly: 'n/a' };
  }
}

async function readRecentExecutorLog() {
  const logPath = path.join(BRAIN, 'Agents/decision-card/executor-log.jsonl');
  try {
    const raw = await fs.readFile(logPath, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean).slice(-20);
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = lines
      .map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
      .filter(e => e && e.ts?.startsWith(today));
    return todayEntries;
  } catch (_) { return []; }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`[midday-check] ${dayName} ${new Date().toISOString()}`);

if (isWeekend) {
  console.log('[midday-check] weekend — skipping (weekly digest covers it)');
  process.exit(0);
}

const [queue, costs, executorLog] = await Promise.all([readQueue(), readRecentCosts(), readRecentExecutorLog()]);

const actions = queue.actions || [];
const byStatus = { approved: 0, pending: 0, deferred: 0, done: 0, error: 0 };
for (const a of actions) {
  const s = a.status || 'pending';
  byStatus[s] = (byStatus[s] || 0) + 1;
}
const errorItems = actions.filter(a => a.status === 'error');

const dispatchedToday = executorLog.filter(e => e.ok !== undefined);
const okToday = dispatchedToday.filter(e => e.ok).length;
const failToday = dispatchedToday.filter(e => !e.ok).length;

// ── Format message ────────────────────────────────────────────────────────────

const lines = [`📊 *${dayName} midday check* — ${new Date().toISOString().slice(11, 16)} UTC`];
lines.push('');

// Queue
lines.push('*Queue*');
const queueParts = [];
if (byStatus.approved > 0) queueParts.push(`${byStatus.approved} approved (will run at 23:00)`);
if (byStatus.pending  > 0) queueParts.push(`${byStatus.pending} pending`);
if (byStatus.deferred > 0) queueParts.push(`${byStatus.deferred} deferred`);
if (byStatus.done     > 0) queueParts.push(`${byStatus.done} done today`);
if (byStatus.error    > 0) queueParts.push(`🔴 ${byStatus.error} errors`);
lines.push(queueParts.length ? queueParts.join(' · ') : 'empty');

// Executor
if (dispatchedToday.length > 0) {
  lines.push('');
  lines.push(`*Dispatched today:* ${okToday} ok${failToday > 0 ? ` · ${failToday} failed` : ''}`);
}

// Errors
if (errorItems.length > 0) {
  lines.push('');
  lines.push('*🔴 Error items (need attention):*');
  for (const e of errorItems.slice(0, 3)) {
    lines.push(`• ${e.type} — ${(e.label || e.action_id || '').slice(0, 60)}`);
    if (e.result_msg) lines.push(`  ${e.result_msg.slice(0, 80)}`);
  }
}

// Cost
lines.push('');
lines.push(`*Cost:* \$${costs.cost24h}/24h → \$${costs.projectedMonthly}/mo pace`);

// Tip if nothing queued
if (byStatus.approved === 0 && byStatus.pending === 0 && errorItems.length === 0) {
  lines.push('');
  lines.push('_Nothing pending — system running clean._');
}

await tgSend(lines.join('\n'));
console.log('[midday-check] sent');
