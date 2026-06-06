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
 * Registry (v1):
 *   post-x          — post to X via API v2 (requires X_BEARER + X_API_KEY)
 *   post-fc         — post to Farcaster via Neynar
 *   reply-x         — reply to an X post (queued, not auto-posted in v1 — logs intent)
 *   build-suggestion — log a Kris-approved build-suggestion item to brain Queue
 *   noop            — for testing; just logs
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';

// ── Logging helpers ──────────────────────────────────────────────────────────

const ACTIONS_LOG = path.join(BRAIN_PATH, 'Agents/decision-card/actions-log.jsonl');

async function logAction(record) {
  await fs.mkdir(path.dirname(ACTIONS_LOG), { recursive: true });
  await fs.appendFile(ACTIONS_LOG, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n');
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleNoop(action) {
  return { ok: true, message: `noop: ${action.label}` };
}

async function handlePostX(action) {
  const text = action.payload?.text;
  if (!text) return { ok: false, message: 'no text in payload' };

  const bearer = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;
  // v2 post requires OAuth 1.0a user context. Most setups have bearer for read,
  // user-context tokens for write. Until X writing is wired end-to-end, we LOG
  // the intent + queue for human review and return ok-with-warning.
  if (!process.env.X_OAUTH_USER_TOKEN) {
    await logAction({ action_id: action.action_id, type: 'post-x', status: 'queued-for-write-impl', text });
    return {
      ok: true,
      message: 'queued (X write API not yet wired — text logged to actions-log.jsonl for manual post)',
      details: { text: text.slice(0, 100) + '…' },
    };
  }

  // Real write path (TODO: implement OAuth 1.0a signing or use a 3rd-party SDK)
  // For now, this branch is dead-code until X write credentials are provisioned.
  return { ok: false, message: 'X write path not yet implemented (no X_OAUTH_USER_TOKEN handler)' };
}

async function handlePostFC(action) {
  const text = action.payload?.text;
  const NEYNAR = process.env.NEYNAR_API_KEY;
  const FID = process.env.NEYNAR_SIGNER_FID;
  const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;
  if (!text) return { ok: false, message: 'no text in payload' };
  if (!NEYNAR || !SIGNER_UUID) {
    await logAction({ action_id: action.action_id, type: 'post-fc', status: 'queued-no-signer', text });
    return { ok: true, message: 'queued (Neynar signer UUID missing — logged)' };
  }
  const res = await fetch('https://api.neynar.com/v2/farcaster/cast', {
    method: 'POST',
    headers: {
      'api_key': NEYNAR,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ signer_uuid: SIGNER_UUID, text }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: `Neynar ${res.status}: ${JSON.stringify(json).slice(0, 200)}` };
  }
  await logAction({ action_id: action.action_id, type: 'post-fc', status: 'posted', cast_hash: json?.cast?.hash, text });
  return { ok: true, message: 'cast published', details: { hash: json?.cast?.hash } };
}

async function handleReplyX(action) {
  // v1: log to actions-log + Inbox so it appears in next morning brief as visible queue
  const description = action.payload?.description || action.label;
  const inboxPath = path.join(BRAIN_PATH, 'Inbox', `${new Date().toISOString().slice(0, 10)}-approved-replies.md`);
  await fs.mkdir(path.dirname(inboxPath), { recursive: true });
  const line = `- [${new Date().toISOString()}] ${description}\n`;
  await fs.appendFile(inboxPath, line);
  await logAction({ action_id: action.action_id, type: 'reply-x', status: 'approved-queued', description });
  return { ok: true, message: 'reply approved + queued to engagement executor (when built)' };
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

// ── Registry ─────────────────────────────────────────────────────────────────

const HANDLERS = {
  'noop': handleNoop,
  'post-x': handlePostX,
  'post-fc': handlePostFC,
  'reply-x': handleReplyX,
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
