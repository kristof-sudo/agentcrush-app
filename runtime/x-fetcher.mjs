/**
 * X (Twitter) fetcher — Layer 1 (deterministic, no LLM)
 *
 * Pulls real X signal for AgentCrush via the X API v2:
 *   1. Mentions of @agentcrush_xyz in the last LOOKBACK_HOURS
 *   2. Keyword-search results for ecosystem terms (recent search)
 *   3. AgentCrush's own recent posts (for engagement context)
 *
 * Writes a single deterministic JSON artifact:
 *   ${BRAIN_PATH}/Fetchers/x-api/output/x-YYYY-MM-DD.json
 *
 * Mirror of runtime/neynar-fetcher.mjs for X. Sub-agents (e.g. social-analyst)
 * read this JSON; they never call the X API themselves.
 *
 * ── STATUS 2026-05-21 ──
 * Blocked on X Bearer Token permissions ("Unauthorized" — known blocker in
 * STATE.md "Open blockers"). Script is structurally complete and ready to
 * run as soon as the token is fixed. Run with --dry-run first to verify
 * the token works.
 *
 * Usage:
 *   node runtime/x-fetcher.mjs                  # default: write today's JSON
 *   node runtime/x-fetcher.mjs --dry-run        # fetch + print summary, no file write
 *   node runtime/x-fetcher.mjs --lookback 48    # 48-hour window instead of 24
 *
 * Env:
 *   X_BEARER_TOKEN      — required, OAuth2 Bearer token
 *   BRAIN_PATH          — path to agentcrush-brain clone (default: ../agentcrush-brain)
 *   X_USER_ID           — numeric X user ID for @agentcrush_xyz (lookup once, set here)
 *   X_HANDLE            — fallback handle if X_USER_ID unset (default: agentcrush_xyz)
 *
 * Cron (Ajsa DO box, 07:46 Budapest — offset 1m from neynar to avoid burst):
 *   46 5 * * *  cd /opt/agentcrush && X_BEARER_TOKEN=... node runtime/x-fetcher.mjs >> /var/log/x-fetcher.log 2>&1
 *
 * Exit codes:
 *   0 — success (all fetches OK, file written)
 *   1 — partial (some fetches failed, file still written with errors[] populated)
 *   2 — total failure (no file written; env missing or all fetches failed)
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const lookbackIdx = args.indexOf('--lookback');
const LOOKBACK_HOURS = lookbackIdx !== -1 ? (parseInt(args[lookbackIdx + 1], 10) || 24) : 24;

// ── Env ───────────────────────────────────────────────────────────────────────

const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const BRAIN_PATH = process.env.BRAIN_PATH || path.resolve(process.cwd(), '..', 'agentcrush-brain');
const X_USER_ID = process.env.X_USER_ID || null;
const X_HANDLE = process.env.X_HANDLE || 'agentcrush_xyz';

if (!X_BEARER_TOKEN) {
  console.error('[x-fetcher] FATAL: X_BEARER_TOKEN not set.');
  process.exit(2);
}

const X_BASE = 'https://api.x.com/2';
// Grouped by purpose for legibility. X API charges per call; keep this list
// curated — each addition adds ~$1/mo at current pay-as-you-go rates.
// Competitor-by-name monitoring belongs in the `competitor-watcher` Layer 2
// sub-agent, not here.
const KEYWORDS = [
  // brand
  'agentcrush', 'AgentCrush',
  // protocols
  'x402', 'ERC-8004', '"MCP agents"', '"A2A protocol"',
  // ecosystems we index
  '"Virtuals Protocol"', 'Agentverse',
  // by-name watch (high-signal projects)
  'aixbt', 'CrewAI',
];

console.log(`[x-fetcher] Mode: ${isDryRun ? 'DRY-RUN' : 'WRITE'}`);
console.log(`[x-fetcher] Handle: @${X_HANDLE}  Lookback: ${LOOKBACK_HOURS}h`);
console.log(`[x-fetcher] Brain path: ${BRAIN_PATH}`);

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function xGet(pathAndQuery) {
  const url = `${X_BASE}${pathAndQuery}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${X_BEARER_TOKEN}`, accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`X ${res.status} on ${pathAndQuery}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ── User ID resolution ────────────────────────────────────────────────────────

async function resolveUserId() {
  if (X_USER_ID) return X_USER_ID;
  const data = await xGet(`/users/by/username/${X_HANDLE}?user.fields=id,name,public_metrics`);
  const id = data?.data?.id;
  if (!id) throw new Error(`Could not resolve user ID for @${X_HANDLE}`);
  return id;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const cutoffIso = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

const POST_FIELDS = 'created_at,public_metrics,author_id,text,conversation_id';
const USER_EXPANSION = '&expansions=author_id&user.fields=username,name,public_metrics,verified';

function normalizePost(p, usersById = {}) {
  const author = usersById[p.author_id] || {};
  return {
    id: p.id,
    author: author.username,
    author_id: p.author_id,
    author_followers: author.public_metrics?.followers_count,
    author_name: author.name,
    text: (p.text || '').slice(0, 600),
    created_at: p.created_at,
    metrics: {
      likes: p.public_metrics?.like_count ?? 0,
      retweets: p.public_metrics?.retweet_count ?? 0,
      replies: p.public_metrics?.reply_count ?? 0,
      quotes: p.public_metrics?.quote_count ?? 0,
      impressions: p.public_metrics?.impression_count ?? 0,
    },
    url: author.username ? `https://x.com/${author.username}/status/${p.id}` : undefined,
  };
}

function indexUsers(includes) {
  const usersById = {};
  for (const u of includes?.users || []) usersById[u.id] = u;
  return usersById;
}

async function fetchMentions(userId) {
  const data = await xGet(
    `/users/${userId}/mentions?max_results=50&start_time=${encodeURIComponent(cutoffIso)}&tweet.fields=${POST_FIELDS}${USER_EXPANSION}`,
  );
  const usersById = indexUsers(data?.includes);
  return (data?.data || []).map((p) => normalizePost(p, usersById));
}

async function fetchKeyword(keyword) {
  const q = encodeURIComponent(`${keyword} -is:retweet lang:en`);
  const data = await xGet(
    `/tweets/search/recent?query=${q}&max_results=25&start_time=${encodeURIComponent(cutoffIso)}&tweet.fields=${POST_FIELDS}${USER_EXPANSION}`,
  );
  const usersById = indexUsers(data?.includes);
  return (data?.data || []).map((p) => normalizePost(p, usersById));
}

async function fetchOurRecentPosts(userId) {
  const data = await xGet(
    `/users/${userId}/tweets?max_results=10&tweet.fields=${POST_FIELDS}${USER_EXPANSION}&exclude=retweets,replies`,
  );
  const usersById = indexUsers(data?.includes);
  return (data?.data || []).map((p) => normalizePost(p, usersById));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const fetchedAt = new Date().toISOString();
  const errors = [];

  let userId;
  try {
    userId = await resolveUserId();
    console.log(`[x-fetcher] Resolved @${X_HANDLE} → user_id ${userId}`);
  } catch (err) {
    console.error(`[x-fetcher] FATAL: user resolution failed: ${err.message}`);
    process.exit(2);
  }

  let mentions = [];
  try {
    mentions = await fetchMentions(userId);
    console.log(`[x-fetcher] Mentions in last ${LOOKBACK_HOURS}h: ${mentions.length}`);
  } catch (err) {
    console.error(`[x-fetcher] Mentions fetch failed: ${err.message}`);
    errors.push({ source: 'mentions', error: err.message });
  }

  const keyword_results = {};
  for (const keyword of KEYWORDS) {
    try {
      const results = await fetchKeyword(keyword);
      keyword_results[keyword] = results;
      console.log(`[x-fetcher] Keyword "${keyword}": ${results.length} posts in lookback`);
    } catch (err) {
      console.error(`[x-fetcher] Keyword "${keyword}" failed: ${err.message}`);
      keyword_results[keyword] = [];
      errors.push({ source: `keyword:${keyword}`, error: err.message });
    }
  }

  let our_recent_posts = [];
  try {
    our_recent_posts = await fetchOurRecentPosts(userId);
    console.log(`[x-fetcher] Our recent posts: ${our_recent_posts.length}`);
  } catch (err) {
    console.error(`[x-fetcher] Our-recent-posts fetch failed: ${err.message}`);
    errors.push({ source: 'our_recent_posts', error: err.message });
  }

  const totalKeywordHits = Object.values(keyword_results).reduce((sum, arr) => sum + arr.length, 0);

  const output = {
    fetched_at: fetchedAt,
    handle: X_HANDLE,
    user_id: userId,
    lookback_hours: LOOKBACK_HOURS,
    mentions,
    keyword_results,
    our_recent_posts,
    stats: {
      mention_count: mentions.length,
      keyword_hit_count: totalKeywordHits,
      our_post_count: our_recent_posts.length,
      error_count: errors.length,
    },
    errors,
    schema_version: 1,
  };

  if (mentions.length === 0 && totalKeywordHits === 0 && our_recent_posts.length === 0 && errors.length > 0) {
    console.error('[x-fetcher] FATAL: every fetch failed. Not writing file.');
    process.exit(2);
  }

  if (isDryRun) {
    console.log('[x-fetcher] DRY-RUN summary:');
    console.log(JSON.stringify(output.stats, null, 2));
    if (errors.length) console.log('[x-fetcher] Errors:', errors);
    process.exit(errors.length ? 1 : 0);
  }

  const date = fetchedAt.slice(0, 10);
  const outDir = path.join(BRAIN_PATH, 'Fetchers', 'x-api', 'output');
  const outPath = path.join(outDir, `x-${date}.json`);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, 2));
  console.log(`[x-fetcher] Wrote ${outPath}`);

  process.exit(errors.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`[x-fetcher] Uncaught: ${err.message}`);
  console.error(err.stack);
  process.exit(2);
});
