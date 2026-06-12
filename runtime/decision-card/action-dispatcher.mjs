/**
 * Action dispatcher — executes approved actions from the Decision Card queue.
 *
 * Each action has a `type` matched against a handler in the HANDLERS registry.
 * Handlers are intentionally small + auditable. Anything irreversibly public
 * (posting, deploying, paying) flows through here so we have ONE choke-point
 * to log + rate-limit.
 *
 * Usage:
 *   import { dispatch } from './action-dispatcher.mjs';
 *   await dispatch(action);  // action = { action_id, type, payload, ... }
 *
 * Exposes: dispatch(action) → { ok, message, details? }
 *
 * Registry (v2 — X posting fully wired):
 *   post-x          — post to X via API v2 with OAuth 1.0a signing
 *   post-fc         — post to Farcaster via Neynar (needs NEYNAR_SIGNER_UUID)
 *   reply-x         — reply to an X post (executes via OAuth 1.0a)
 *   quote-x         — quote-tweet an X post
 *   build-suggestion — log a Kris-approved build-suggestion item to brain Queue
 *   noop            — for testing; just logs
 *
 * Required env vars for X posting (all present on VPS in copydesk/.env):
 *   X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';

// ── Logging helpers ──────────────────────────────────────────────────────────

const ACTIONS_LOG = path.join(BRAIN_PATH, 'Agents/decision-card/actions-log.jsonl');

async function logAction(record) {
  await fs.mkdir(path.dirname(ACTIONS_LOG), { recursive: true });
  await fs.appendFile(ACTIONS_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n');
}

// ── X OAuth 1.0a signing ─────────────────────────────────────────────────────
// Ported from runtime/copydesk/x-publisher.mjs. No external deps — pure Node crypto.

function enc(str) {
  return encodeURIComponent(String(str))
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function xOauthHeader({ method, url }) {
  const {
    X_CONSUMER_KEY:         consumerKey,
    X_CONSUMER_SECRET:      consumerSecret,
    X_ACCESS_TOKEN:         token,
    X_ACCESS_TOKEN_SECRET:  tokenSecret,
  } = process.env;

  if (!consumerKey || !consumerSecret || !token || !tokenSecret) {
    throw new Error('X OAuth credentials missing (need X_CONSUMER_KEY/SECRET + X_ACCESS_TOKEN/SECRET)');
  }

  const oauth = {
    oauth_consumer_key:     consumerKey,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            token,
    oauth_version:          '1.0',
  };

  // For JSON-body POST requests, only oauth params go in the signature base string
  // (no body params — per Twitter API v2 with Content-Type: application/json)
  const paramString = Object.keys(oauth).sort()
    .map(k => `${enc(k)}=${enc(oauth[k])}`)
    .join('&');

  const baseString = [method.toUpperCase(), enc(url), enc(paramString)].join('&');
  const signingKey = `${enc(consumerSecret)}&${enc(tokenSecret)}`;

  oauth.oauth_signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  return 'OAuth ' + Object.keys(oauth).sort()
    .map(k => `${enc(k)}="${enc(oauth[k])}"`)
    .join(', ');
}

async function xPost(body) {
  // HARD RULE (Kris, 2026-06-12): no autonomous posting, ever — his account was
  // suspended for automation. This function is intentionally disabled so no
  // code path (handlers, executors, future workers) can post programmatically.
  // Drafts go to Telegram via trustFallPost; Kris posts manually.
  throw new Error(
    `AUTONOMOUS POSTING DISABLED by hard rule 2026-06-12 — deliver a draft to Kris instead. Attempted payload: ${JSON.stringify(body).slice(0, 120)}`
  );
}

// ── Quality gate — basic safety checks before any public post ────────────────
// Returns { ok: true } or { ok: false, reason }

const BLOCK_PATTERNS = [
  /\bsponsor(ed|ship)\b/i,
  /\bpartner(ship)?\b/i,
  /\bpaid\b/i,
  /\bgiveaway\b/i,
  /\bnot financial advice\b/i,
  /\bDM(s?) (me|us)\b/i,
];

function qualityGate(text) {
  for (const pat of BLOCK_PATTERNS) {
    if (pat.test(text)) return { ok: false, reason: `blocked pattern: ${pat.source}` };
  }
  if (text.length > 280) return { ok: false, reason: `text too long (${text.length} chars, max 280)` };
  if (text.trim().length < 10) return { ok: false, reason: 'text too short' };
  return { ok: true };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleNoop(action) {
  return { ok: true, message: `noop: ${action.label}` };
}

async function handlePostX(action) {
  const text = action.payload?.text;
  if (!text) return { ok: false, message: 'no text in payload' };

  const gate = qualityGate(text);
  if (!gate.ok) {
    await logAction({ action_id: action.action_id, type: 'post-x', status: 'blocked', reason: gate.reason, text });
    return { ok: false, message: `quality gate blocked: ${gate.reason}` };
  }

  const json = await xPost({ text });
  const tweetId = json?.data?.id;
  await logAction({ action_id: action.action_id, type: 'post-x', status: 'posted', tweet_id: tweetId, text });
  return {
    ok: true,
    message: 'posted to X',
    details: { tweet_id: tweetId, url: tweetId ? `https://x.com/agentcrush_xyz/status/${tweetId}` : null },
  };
}

async function handleReplyX(action) {
  const text = action.payload?.text;
  const replyToId = action.payload?.reply_to_tweet_id;

  if (!text) return { ok: false, message: 'no text in payload' };

  // If no tweet ID to reply to, fall back to logging (engagement executor queues these)
  if (!replyToId) {
    const inboxPath = path.join(BRAIN_PATH, 'Inbox', `${new Date().toISOString().slice(0, 10)}-approved-replies.md`);
    await fs.mkdir(path.dirname(inboxPath), { recursive: true });
    await fs.appendFile(inboxPath, `- [${new Date().toISOString()}] ${text}\n`);
    await logAction({ action_id: action.action_id, type: 'reply-x', status: 'queued-no-target', text });
    return { ok: true, message: 'logged to approved-replies.md (no reply_to_tweet_id — engagement executor will pick up)' };
  }

  const gate = qualityGate(text);
  if (!gate.ok) {
    await logAction({ action_id: action.action_id, type: 'reply-x', status: 'blocked', reason: gate.reason });
    return { ok: false, message: `quality gate blocked: ${gate.reason}` };
  }

  const json = await xPost({ text, reply: { in_reply_to_tweet_id: replyToId } });
  const tweetId = json?.data?.id;
  await logAction({ action_id: action.action_id, type: 'reply-x', status: 'posted', tweet_id: tweetId, reply_to: replyToId });
  return { ok: true, message: 'reply posted to X', details: { tweet_id: tweetId } };
}

async function handleQuoteX(action) {
  const text = action.payload?.text;
  const quoteUrl = action.payload?.quote_tweet_url || action.payload?.url;

  if (!text) return { ok: false, message: 'no text in payload' };

  const gate = qualityGate(text);
  if (!gate.ok) {
    await logAction({ action_id: action.action_id, type: 'quote-x', status: 'blocked', reason: gate.reason });
    return { ok: false, message: `quality gate blocked: ${gate.reason}` };
  }

  // Quote tweet: for API v2, include the quoted tweet URL in the text itself
  // (v2 doesn't have a dedicated quote_tweet_id param in the same way; appending URL works)
  const fullText = quoteUrl ? `${text}\n${quoteUrl}` : text;
  if (fullText.length > 280) {
    // Truncate gracefully
    const truncated = text.slice(0, 280 - (quoteUrl?.length || 0) - 2) + '\n' + (quoteUrl || '');
    return handleQuoteX({ ...action, payload: { ...action.payload, text: truncated } });
  }

  const json = await xPost({ text: fullText });
  const tweetId = json?.data?.id;
  await logAction({ action_id: action.action_id, type: 'quote-x', status: 'posted', tweet_id: tweetId, quote_url: quoteUrl });
  return { ok: true, message: 'quote tweet posted', details: { tweet_id: tweetId } };
}

async function handlePostFC(action) {
  const text = action.payload?.text;
  const NEYNAR = process.env.NEYNAR_API_KEY;
  const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;

  if (!text) return { ok: false, message: 'no text in payload' };

  if (!NEYNAR || !SIGNER_UUID) {
    // Log and give Kris the signer provisioning reminder
    await logAction({ action_id: action.action_id, type: 'post-fc', status: 'queued-no-signer', text });
    return {
      ok: true,
      message: 'queued (NEYNAR_SIGNER_UUID missing — provision at neynar.com/managed-signers, add to fetchers/.env)',
    };
  }

  const gate = qualityGate(text);
  if (!gate.ok) {
    await logAction({ action_id: action.action_id, type: 'post-fc', status: 'blocked', reason: gate.reason });
    return { ok: false, message: `quality gate blocked: ${gate.reason}` };
  }

  const res = await fetch('https://api.neynar.com/v2/farcaster/cast', {
    method: 'POST',
    headers: { 'api_key': NEYNAR, 'content-type': 'application/json' },
    body: JSON.stringify({ signer_uuid: SIGNER_UUID, text }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: `Neynar ${res.status}: ${JSON.stringify(json).slice(0, 200)}` };
  }
  await logAction({ action_id: action.action_id, type: 'post-fc', status: 'posted', cast_hash: json?.cast?.hash, text });
  return { ok: true, message: 'cast published', details: { hash: json?.cast?.hash } };
}

async function handleBuildSuggestion(action) {
  const description = action.payload?.description || action.label;
  const queuePath = path.join(BRAIN_PATH, 'Queue/open.md');
  const entry = `\n## ${new Date().toISOString().slice(0, 10)} — Approved from Decision Card\n- [ ] ${description}\n`;
  try {
    const existing = await fs.readFile(queuePath, 'utf-8');
    await fs.writeFile(queuePath, existing + entry);
  } catch (_) {
    await fs.writeFile(queuePath, entry);
  }
  await logAction({ action_id: action.action_id, type: 'build-suggestion', status: 'queued', description });
  return { ok: true, message: 'added to brain Queue/open.md' };
}

// Trust-fall: auto-posts without card approval for tightly-scoped events.
// Called by trust-fall-checker.mjs, not via the approval queue.
export async function trustFallPost({ text, platform = 'x', reason }) {
  // ── HARD RULE (Kris, 2026-06-12): NO AUTONOMOUS POSTING, EVER. ──────────────
  // Kris's X account was suspended months ago because of automated posting.
  // He personally copies and pushes every post. This function therefore
  // delivers a DRAFT to his Telegram instead of posting — same signature,
  // same quality gate, so every caller (ghost-index, tier-promotion,
  // agent-of-week, claim-outreach) keeps working without modification.
  const gate = qualityGate(text);
  if (!gate.ok) throw new Error(`trust-fall quality gate: ${gate.reason}`);

  const label = platform === 'fc' ? 'Farcaster' : 'X';
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT  = process.env.TELEGRAM_CHAT_ID;
  if (TOKEN && CHAT) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT,
        text: `📝 DRAFT ${label} post (${reason || 'scheduled worker'}) — copy & post manually:\n\n${text}`,
        disable_web_page_preview: true,
      }),
    }).catch(() => {});
  }
  await logAction({ type: `trust-fall-DRAFT-${platform}`, status: 'drafted_to_telegram', reason, text });
  return { ok: true, drafted: true, tweet_id: null, cast_hash: null, url: null };
}

// ── Registry ─────────────────────────────────────────────────────────────────

const HANDLERS = {
  'noop':             handleNoop,
  'post-x':           handlePostX,
  'post-fc':          handlePostFC,
  'reply-x':          handleReplyX,
  'quote-x':          handleQuoteX,
  'build-suggestion': handleBuildSuggestion,
};

// ── Public entry ─────────────────────────────────────────────────────────────

export async function dispatch(action) {
  const handler = HANDLERS[action.type];
  if (!handler) {
    return { ok: false, message: `unknown action type: ${action.type}` };
  }
  try {
    const result = await handler(action);
    return result;
  } catch (err) {
    await logAction({ action_id: action.action_id, type: action.type, status: 'error', error: err.message });
    return { ok: false, message: `handler error: ${err.message}` };
  }
}

export { HANDLERS };
