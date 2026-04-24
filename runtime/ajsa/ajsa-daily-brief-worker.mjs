/**
 * Ajsa Daily Brief Worker
 *
 * Read-only query of Supabase. Optional single Telegram send.
 * Never writes to Supabase.
 *
 * Usage:
 *   node ajsa-daily-brief-worker.mjs              -- dry-run (default)
 *   node ajsa-daily-brief-worker.mjs --dry-run    -- dry-run (explicit)
 *   node ajsa-daily-brief-worker.mjs --send       -- send to Telegram once
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Arg check ──────────────────────────────────────────────────────────────

const hasDryRun = process.argv.includes('--dry-run');
const hasSend   = process.argv.includes('--send');

if (hasDryRun && hasSend) {
  console.error('[ajsa] ERROR: Cannot combine --dry-run and --send.');
  process.exit(1);
}

const isSend = hasSend;
const MODE   = isSend ? 'SEND' : 'DRY-RUN';
console.log(`[ajsa] Mode: ${MODE}`);

// ── Env loading ────────────────────────────────────────────────────────────

const SUPABASE_ENV_CANDIDATES = [
  '/opt/agentcrush/selector/.env',
  '/opt/agentcrush/briefing/.env',
  '/opt/agentcrush/copydesk/.env',
];

const TELEGRAM_ENV_CANDIDATES = [
  '/opt/agentcrush/selector/.env',
  '/opt/agentcrush/briefing/.env',
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadSupabaseEnv() {
  for (const envPath of SUPABASE_ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    if (parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY) {
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v;
      }
      console.log(`[ajsa] Supabase env from ${path.basename(path.dirname(envPath))}/.env`);
      return;
    }
  }
  throw new Error(
    `[ajsa] Could not find SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in any of:\n  ${SUPABASE_ENV_CANDIDATES.join('\n  ')}`
  );
}

async function loadTelegramEnv() {
  for (const envPath of TELEGRAM_ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    if (parsed.TELEGRAM_BOT_TOKEN && parsed.TELEGRAM_CHAT_ID) {
      if (!process.env.TELEGRAM_BOT_TOKEN) process.env.TELEGRAM_BOT_TOKEN = parsed.TELEGRAM_BOT_TOKEN;
      if (!process.env.TELEGRAM_CHAT_ID)   process.env.TELEGRAM_CHAT_ID   = parsed.TELEGRAM_CHAT_ID;
      console.log(`[ajsa] Telegram env from ${path.basename(path.dirname(envPath))}/.env`);
      return true;
    }
  }
  return false;
}

await loadSupabaseEnv();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL)              { console.error('[ajsa] ERROR: SUPABASE_URL missing.'); process.exit(1); }
if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('[ajsa] ERROR: SUPABASE_SERVICE_ROLE_KEY missing.'); process.exit(1); }

// ── Supabase client ────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Query helpers ──────────────────────────────────────────────────────────

const TODAY     = new Date().toISOString().slice(0, 10);
const MAX_ITEMS = 5;

async function countBriefItems(status) {
  let query = supabase
    .from('ajsa_brief_items')
    .select('*', { count: 'exact', head: true })
    .eq('brief_date', TODAY);

  if (status) query = query.eq('status', status);

  const { count, error } = await query;
  if (error) {
    console.warn(`[ajsa] WARN: count failed for status=${status ?? 'all'}: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

async function getBriefItems(status, limit = MAX_ITEMS) {
  const { data, error } = await supabase
    .from('ajsa_brief_items')
    .select('id, title, summary, recommendation, source_key, source_type, url, score, status, evidence, payload')
    .eq('brief_date', TODAY)
    .eq('status', status)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`[ajsa] WARN: query failed for ajsa_brief_items status=${status}: ${error.message}`);
    return [];
  }
  return data ?? [];
}

// ── Brief formatting helpers ───────────────────────────────────────────────

function cleanLine(value, fallback = 'No detail available.') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function displayTitle(item) {
  const title = cleanLine(item.title, 'Untitled signal');
  const parts = title.split('|').map(p => p.trim()).filter(Boolean);
  if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    return parts[0];
  }
  return title;
}

function keywordSet(item) {
  return new Set((item.evidence?.matched_keywords ?? []).map(k => String(k).toLowerCase()));
}

function inferTheme(items) {
  const kws = new Set();
  for (const item of items) for (const k of keywordSet(item)) kws.add(k);

  const themes = [];
  if (kws.has('x402') || kws.has('agent payment') || kws.has('agent payments') || kws.has('usdc')) {
    themes.push('payment-standard / x402');
  }
  if (kws.has('erc-8004') || kws.has('erc8004') || kws.has('identity registry') || kws.has('validation registry')) {
    themes.push('ERC-8004 identity/trust');
  }
  if (kws.has('a2a') || kws.has('agent-to-agent') || kws.has('agent economy')) {
    themes.push('agent-to-agent economy');
  }

  return themes.length > 0
    ? `Today's useful signals are mostly ${themes.slice(0, 2).join(' / ')} movement.`
    : "Today's useful signals are limited; treat this as watchlist maintenance, not a strategy shift.";
}

function signalText(item) {
  const hnPoints  = item.evidence?.hn_points;
  const hnComments = item.evidence?.hn_comments;
  const sourceKey = item.source_key ?? '';
  if (hnPoints != null) {
    return `Community signal: ${displayTitle(item)} drew ${hnPoints} HN points and ${hnComments ?? 0} comments.`;
  }
  if (sourceKey === 'erc8004_scan') {
    return 'Live ERC-8004 explorer should be checked for new agents, implementations, or adoption changes.';
  }
  return cleanLine(item.summary, item.title);
}

function whyItMatters(item) {
  const kws = keywordSet(item);
  if (kws.has('x402') || kws.has('agent payment') || kws.has('agent payments')) {
    return 'AgentCrush needs crisp positioning around agent payments before x402/AP2 narratives harden.';
  }
  if (kws.has('erc-8004') || kws.has('erc8004')) {
    return 'ERC-8004 can affect how AgentCrush tracks agent identity, trust, listings, and registry metadata.';
  }
  if (kws.has('a2a') || kws.has('agent-to-agent')) {
    return 'A2A traction may change what AgentCrush treats as protocol-level infrastructure versus app noise.';
  }
  return cleanLine(item.recommendation, 'Potential market signal for AgentCrush prioritization.');
}

function suggestedAction(item) {
  const title  = cleanLine(item.title, 'this item');
  const titleL = title.toLowerCase();
  const kws    = keywordSet(item);

  if (titleL.includes('stripe') || titleL.includes('payment agent')) {
    return 'Investigate: extract payment-agent UX language and update the x402/AP2 positioning note.';
  }
  if (titleL.includes('ap2') || titleL.includes('agent payments protocol')) {
    return 'Ship: write the AP2 vs x402 comparison brief and decide what AgentCrush should track.';
  }
  if ((item.source_key ?? '').includes('8004')) {
    return 'Add/check listing: inspect 8004scan for new live ERC-8004 agents or implementations.';
  }
  if (kws.has('erc-8004') || kws.has('erc8004')) {
    return 'Investigate: map whether this changes AgentCrush registry fields or trust metadata.';
  }
  return cleanLine(item.recommendation, `Investigate: decide whether ${title} changes the AgentCrush build queue.`);
}

function executionRecommendation(items) {
  if (items.length === 0) return 'Wait. No selected signal is strong enough for founder action today.';

  const strongest = [...items].sort((a, b) => {
    const actionA = suggestedAction(a);
    const actionB = suggestedAction(b);
    const rank = action => {
      if (/^Ship:/i.test(action)) return 0;
      if (/^Add\/check listing:/i.test(action)) return 1;
      if (/^Investigate:/i.test(action)) return 2;
      return 3;
    };
    const rankDiff = rank(actionA) - rank(actionB);
    if (rankDiff !== 0) return rankDiff;
    return (b.evidence?.hn_points ?? b.score ?? 0) - (a.evidence?.hn_points ?? a.score ?? 0);
  })[0];
  const action = suggestedAction(strongest);
  if (/^Ship:/i.test(action))             return `Ship. Strongest action: ${action.replace(/^Ship:\s*/i, '')}`;
  if (/^Add\/check listing:/i.test(action)) return `Investigate. Strongest action: ${action}`;
  if (/^Investigate:/i.test(action))      return `Investigate. Strongest action: ${action.replace(/^Investigate:\s*/i, '')}`;
  return `Investigate. Strongest action: ${action}`;
}

// ── Brief text builder ─────────────────────────────────────────────────────

function buildBriefText({ briefItems, selectorHasRun, selectedCount, totalCount, dismissedCount, candidateCount, fallbackNote }) {
  const lines = [];

  lines.push(`Ajsa Daily Brief — ${TODAY}`);
  lines.push('');
  lines.push('Executive read:');
  lines.push(`- ${selectorHasRun ? selectedCount : 0} selected signals from ${totalCount} candidates.`);
  if (fallbackNote) lines.push(`- ${fallbackNote}`);
  lines.push(`- ${inferTheme(briefItems)}`);
  lines.push('');
  lines.push('Selected signals:');

  if (briefItems.length === 0) {
    lines.push("No selected signals. Wait; do not create founder action from today's feed yet.");
  } else {
    for (const [idx, item] of briefItems.entries()) {
      lines.push('');
      lines.push(`${idx + 1}. ${displayTitle(item)}`);
      lines.push(`   Signal: ${signalText(item)}`);
      lines.push(`   Why it matters: ${whyItMatters(item)}`);
      lines.push(`   Action: ${suggestedAction(item)}`);
      lines.push(`   Source: ${item.source_key}`);
      lines.push(`   Link: ${item.url ?? 'none'}`);
    }
  }

  lines.push('');
  lines.push('Execution recommendation:');
  lines.push(`- ${executionRecommendation(briefItems)}`);
  lines.push('');
  lines.push('Noise filtered:');
  lines.push(`- ${dismissedCount} dismissed.`);
  lines.push(`- ${candidateCount} candidates still unselected.`);
  lines.push('- Static reference pages are filtered unless there is movement evidence.');

  return lines.join('\n');
}

// ── Telegram send ──────────────────────────────────────────────────────────

const TELEGRAM_MAX_CHARS = 4096;

async function sendTelegramMessage(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('[ajsa] ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing after env load.');
    return false;
  }

  let message  = text;
  let truncated = false;

  if (message.length > TELEGRAM_MAX_CHARS) {
    const cutoff = message.lastIndexOf('\n', TELEGRAM_MAX_CHARS - 25);
    message  = message.slice(0, cutoff > 0 ? cutoff : TELEGRAM_MAX_CHARS - 25) + '\n[brief truncated]';
    truncated = true;
    console.warn(`[ajsa] WARN: Brief truncated to fit Telegram ${TELEGRAM_MAX_CHARS}-char limit.`);
  }

  console.log(`[ajsa] Sending brief (${message.length} chars) to configured founder chat...`);

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    }
  );

  const data = await res.json().catch(() => ({}));

  if (data.ok) {
    console.log(`[ajsa] Telegram: sent OK (message_id: ${data.result?.message_id ?? '?'})`);
    if (truncated) console.warn('[ajsa] WARN: Sent message was truncated — brief was over 4096 chars.');
    return true;
  } else {
    console.error(`[ajsa] Telegram: send FAILED — HTTP ${res.status} — ${data.description ?? 'unknown error'}`);
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

const selectedCount  = await countBriefItems('selected');
const candidateCount = await countBriefItems('candidate');
const dismissedCount = await countBriefItems('dismissed');
const totalCount     = await countBriefItems(null);

let selectedItems = await getBriefItems('selected', MAX_ITEMS);
const selectorHasRun = selectedItems.length > 0;

if (!selectorHasRun) {
  selectedItems = await getBriefItems('candidate', MAX_ITEMS);
}

const briefItems   = selectedItems.slice(0, MAX_ITEMS);
const fallbackNote = selectorHasRun
  ? null
  : 'Selector has not run for today; falling back to top candidate items.';

const briefText = buildBriefText({
  briefItems,
  selectorHasRun,
  selectedCount,
  totalCount,
  dismissedCount,
  candidateCount,
  fallbackNote,
});

if (isSend) {
  // ── Send mode ────────────────────────────────────────────────────────────
  if (!selectorHasRun) {
    console.error('[ajsa] ABORT: Selector has not produced selected items for today.');
    console.error('[ajsa]        Run the selector worker first, then retry --send.');
    process.exit(1);
  }

  const telegramLoaded = await loadTelegramEnv();
  if (!telegramLoaded) {
    console.error('[ajsa] ERROR: Could not find TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in any env file.');
    console.error(`[ajsa]        Searched: ${TELEGRAM_ENV_CANDIDATES.map(p => path.basename(path.dirname(p)) + '/.env').join(', ')}`);
    process.exit(1);
  }

  const ok = await sendTelegramMessage(briefText);
  if (!ok) process.exit(1);

} else {
  // ── Dry-run mode ─────────────────────────────────────────────────────────
  console.log('');
  console.log(briefText);
  console.log('');
  console.log('[DRY RUN — Telegram NOT sent. No writes to Supabase.]');
  console.log('');
}
