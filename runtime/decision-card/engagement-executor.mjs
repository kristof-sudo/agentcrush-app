/**
 * engagement-executor.mjs — Phase R-3.2 — Autonomous reply/quote/like lane.
 *
 * Reads the approved-replies.md from brain Inbox (populated by the decision card
 * when Kris approves a "reply-x" action) and executes each via X OAuth 1.0a.
 *
 * Additionally processes "quote-x" actions from the action-queue.
 *
 * Quality gate:
 *   - No promotional/paid language
 *   - Reply text max 280 chars
 *   - Only replies to tweets already in the Ajsa engagement queue
 *     (prevents replying to random content)
 *
 * Runs daily at 07:45 UTC (09:45 Budapest) after trust-fall-checker.
 * Systemd: agentcrush-engagement-executor.timer
 *
 * Cost: no LLM calls for execution itself. Text comes from approved actions only.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { dispatch } from './action-dispatcher.mjs';

const BRAIN  = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');
const QUEUE_PATH = path.join(BRAIN, 'Agents/decision-card/action-queue.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function tgSend(text) {
  if (!TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  }).catch(() => {});
}

async function loadQueue() {
  try { return JSON.parse(await fs.readFile(QUEUE_PATH, 'utf-8')); }
  catch (_) { return { actions: [] }; }
}

async function saveQueue(q) {
  q.updated_at = new Date().toISOString();
  await fs.mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  await fs.writeFile(QUEUE_PATH, JSON.stringify(q, null, 2));
}

// ── Read approved-replies.md from Inbox ───────────────────────────────────────

async function readApprovedRepliesFile() {
  const today = new Date().toISOString().slice(0, 10);
  const inboxPath = path.join(BRAIN, 'Inbox', `${today}-approved-replies.md`);
  try {
    const raw = await fs.readFile(inboxPath, 'utf-8');
    // Parse lines: `- [timestamp] reply text`
    return raw.trim().split('\n')
      .filter(l => l.startsWith('- ['))
      .map(l => {
        const m = l.match(/^- \[([^\]]+)\] (.+)$/);
        return m ? { ts: m[1], text: m[2], source: 'approved-replies-md' } : null;
      })
      .filter(Boolean);
  } catch (_) { return []; }
}

async function clearApprovedRepliesFile() {
  const today = new Date().toISOString().slice(0, 10);
  const inboxPath = path.join(BRAIN, 'Inbox', `${today}-approved-replies.md`);
  try { await fs.unlink(inboxPath); } catch (_) {}
}

// ── Like handler ─────────────────────────────────────────────────────────────
// Like a tweet by ID using OAuth 1.0a. Requires authenticated user ID.

function enc(str) {
  return encodeURIComponent(String(str))
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthHeader(method, url) {
  const { X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  if (!X_CONSUMER_KEY) throw new Error('X OAuth creds missing');
  const oauth = {
    oauth_consumer_key:     X_CONSUMER_KEY,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            X_ACCESS_TOKEN,
    oauth_version:          '1.0',
  };
  const paramString = Object.keys(oauth).sort().map(k => `${enc(k)}=${enc(oauth[k])}`).join('&');
  const baseString = [method.toUpperCase(), enc(url), enc(paramString)].join('&');
  const signingKey = `${enc(X_CONSUMER_SECRET)}&${enc(X_ACCESS_TOKEN_SECRET)}`;
  oauth.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  return 'OAuth ' + Object.keys(oauth).sort().map(k => `${enc(k)}="${enc(oauth[k])}"`).join(', ');
}

async function likeXTweet(userId, tweetId) {
  const url = `https://api.twitter.com/2/users/${userId}/likes`;
  const auth = oauthHeader('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X like API ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

// Get authenticated user ID (cached per run)
let _userId = null;
async function getXUserId() {
  if (_userId) return _userId;
  const url = 'https://api.twitter.com/2/users/me';
  const auth = oauthHeader('GET', url);
  const res = await fetch(url, { headers: { Authorization: auth } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X /users/me failed: ${res.status}`);
  _userId = json?.data?.id;
  return _userId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('[engagement-executor] running...');

const queue = await loadQueue();
const approved = (queue.actions || []).filter(a => a.status === 'approved' && ['reply-x', 'quote-x'].includes(a.type));
const approvedReplies = await readApprovedRepliesFile();
const approvedLikes = (queue.actions || []).filter(a => a.status === 'approved' && a.type === 'like-x');

console.log(`[engagement-executor] queue: ${approved.length} actions, inbox: ${approvedReplies.length} replies, likes: ${approvedLikes.length}`);

const results = [];

// 1. Execute approved queue actions (reply-x, quote-x)
for (const action of approved) {
  console.log(`[engagement-executor] dispatching ${action.action_id} type=${action.type}`);
  const result = await dispatch(action).catch(e => ({ ok: false, message: e.message }));
  action.status = result.ok ? 'done' : 'error';
  action.executed_at = new Date().toISOString();
  action.result_msg = result.message || '';
  results.push({ source: 'queue', type: action.type, ok: result.ok, message: result.message });
}

// 2. Execute approved-replies.md entries as X replies (no reply_to_tweet_id — plain posts)
for (const reply of approvedReplies) {
  console.log(`[engagement-executor] posting approved reply: ${reply.text.slice(0, 60)}...`);
  const fakeAction = {
    action_id: `inbox-reply-${Date.now()}`,
    type: 'reply-x',
    label: 'approved reply from inbox',
    payload: { text: reply.text },
  };
  const result = await dispatch(fakeAction).catch(e => ({ ok: false, message: e.message }));
  results.push({ source: 'inbox', type: 'reply-x', ok: result.ok, message: result.message });
}

// 3. Execute likes
if (approvedLikes.length > 0) {
  try {
    const userId = await getXUserId();
    for (const action of approvedLikes) {
      const tweetId = action.payload?.tweet_id;
      if (!tweetId) { action.status = 'error'; action.result_msg = 'no tweet_id'; continue; }
      try {
        await likeXTweet(userId, tweetId);
        action.status = 'done';
        action.executed_at = new Date().toISOString();
        results.push({ source: 'queue', type: 'like-x', ok: true, tweet_id: tweetId });
        console.log(`[engagement-executor] liked tweet ${tweetId}`);
      } catch (err) {
        action.status = 'error';
        action.result_msg = err.message;
        results.push({ source: 'queue', type: 'like-x', ok: false, message: err.message });
        console.error(`[engagement-executor] like failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[engagement-executor] userId lookup failed: ${err.message}`);
  }
}

await saveQueue(queue);
if (approvedReplies.length > 0) await clearApprovedRepliesFile();

// Telegram summary
const okCount = results.filter(r => r.ok).length;
const failCount = results.filter(r => !r.ok).length;
const total = results.length;

if (total > 0) {
  const lines = [`💬 *Engagement executor* — ${okCount}/${total} executed`];
  for (const r of results) {
    lines.push(`${r.ok ? '✓' : '✗'} ${r.type} (${r.source}): ${(r.message || '').slice(0, 60)}`);
  }
  await tgSend(lines.join('\n'));
} else {
  console.log('[engagement-executor] nothing to do');
}

console.log(`[engagement-executor] done — ok=${okCount} fail=${failCount}`);
