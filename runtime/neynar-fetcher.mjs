/**
 * Neynar Farcaster fetcher — Layer 1 (deterministic, no LLM)
 *
 * Pulls real Farcaster signal for AgentCrush from the Neynar API:
 *   1. Mentions of @agentcrush (FID 3295190) in the last LOOKBACK_HOURS
 *   2. Keyword-search results for ecosystem terms
 *   3. AgentCrush's own recent casts (for engagement context)
 *
 * Writes a single deterministic JSON artifact:
 *   ${BRAIN_PATH}/Fetchers/neynar/output/farcaster-YYYY-MM-DD.json
 *
 * This script is the replacement for the Bix Social Brief's hallucinated
 * "scan." Sub-agents (e.g. social-analyst) read this JSON; they never call
 * the API themselves. If the API fails, this script fails loudly — it never
 * silently returns fabricated data.
 *
 * Usage:
 *   node runtime/neynar-fetcher.mjs                    # default: write today's JSON
 *   node runtime/neynar-fetcher.mjs --dry-run          # fetch + print summary, no file write
 *   node runtime/neynar-fetcher.mjs --lookback 48      # 48-hour window instead of 24
 *
 * Env:
 *   NEYNAR_API_KEY    — required, X-API-KEY header value
 *   BRAIN_PATH        — path to agentcrush-brain clone (default: ../agentcrush-brain)
 *   AGENTCRUSH_FID    — defaults to 3295190
 *
 * Cron (Ajsa DO box, 07:45 Budapest):
 *   45 5 * * *  cd /opt/agentcrush && NEYNAR_API_KEY=... node runtime/neynar-fetcher.mjs >> /var/log/neynar-fetcher.log 2>&1
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

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const BRAIN_PATH = process.env.BRAIN_PATH || path.resolve(process.cwd(), '..', 'agentcrush-brain');
const AGENTCRUSH_FID = parseInt(process.env.AGENTCRUSH_FID || '3295190', 10);

if (!NEYNAR_API_KEY) {
  console.error('[neynar-fetcher] FATAL: NEYNAR_API_KEY not set.');
  process.exit(2);
}

const NEYNAR_BASE = 'https://api.neynar.com';
const KEYWORDS = ['agentcrush', 'x402', 'ERC-8004', 'MCP agents', 'AgentCrush'];

console.log(`[neynar-fetcher] Mode: ${isDryRun ? 'DRY-RUN' : 'WRITE'}`);
console.log(`[neynar-fetcher] FID: ${AGENTCRUSH_FID}  Lookback: ${LOOKBACK_HOURS}h`);
console.log(`[neynar-fetcher] Brain path: ${BRAIN_PATH}`);

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function neynarGet(pathAndQuery) {
  const url = `${NEYNAR_BASE}${pathAndQuery}`;
  const res = await fetch(url, {
    headers: { 'x-api-key': NEYNAR_API_KEY, accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Neynar ${res.status} on ${pathAndQuery}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const cutoffTs = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;

function withinLookback(cast) {
  const t = Date.parse(cast?.timestamp || cast?.published_at || 0);
  return Number.isFinite(t) && t >= cutoffTs;
}

async function fetchMentions() {
  // Neynar's notifications endpoint returns mentions + replies + likes for a FID.
  // We filter to mention type within the lookback window.
  const data = await neynarGet(
    `/v2/farcaster/notifications/?fid=${AGENTCRUSH_FID}&type=mentions&limit=25`,
  );
  const all = data?.notifications || data?.result?.notifications || [];
  const recent = all.filter((n) => {
    const cast = n.cast || n;
    return withinLookback(cast);
  });
  return recent.map((n) => {
    const cast = n.cast || n;
    return {
      hash: cast.hash,
      author: cast.author?.username || cast.author?.fname,
      author_fid: cast.author?.fid,
      author_followers: cast.author?.follower_count,
      text: (cast.text || '').slice(0, 600),
      timestamp: cast.timestamp,
      reactions: {
        likes: cast.reactions?.likes_count ?? cast.reactions?.likes ?? 0,
        recasts: cast.reactions?.recasts_count ?? cast.reactions?.recasts ?? 0,
        replies: cast.replies?.count ?? 0,
      },
      url: cast.hash ? `https://warpcast.com/~/conversations/${cast.hash}` : undefined,
    };
  });
}

async function fetchKeyword(keyword) {
  const q = encodeURIComponent(keyword);
  const data = await neynarGet(`/v2/farcaster/cast/search?q=${q}&limit=25`);
  const casts = data?.result?.casts || data?.casts || [];
  return casts.filter(withinLookback).map((cast) => ({
    hash: cast.hash,
    author: cast.author?.username || cast.author?.fname,
    author_fid: cast.author?.fid,
    author_followers: cast.author?.follower_count,
    text: (cast.text || '').slice(0, 600),
    timestamp: cast.timestamp,
    reactions: {
      likes: cast.reactions?.likes_count ?? cast.reactions?.likes ?? 0,
      recasts: cast.reactions?.recasts_count ?? cast.reactions?.recasts ?? 0,
      replies: cast.replies?.count ?? 0,
    },
    url: cast.hash ? `https://warpcast.com/~/conversations/${cast.hash}` : undefined,
  }));
}

async function fetchOurRecentCasts() {
  const data = await neynarGet(
    `/v2/farcaster/feed/user/casts?fid=${AGENTCRUSH_FID}&limit=10`,
  );
  const casts = data?.casts || data?.result?.casts || [];
  return casts.map((cast) => ({
    hash: cast.hash,
    text: (cast.text || '').slice(0, 600),
    timestamp: cast.timestamp,
    reactions: {
      likes: cast.reactions?.likes_count ?? cast.reactions?.likes ?? 0,
      recasts: cast.reactions?.recasts_count ?? cast.reactions?.recasts ?? 0,
      replies: cast.replies?.count ?? 0,
    },
    url: cast.hash ? `https://warpcast.com/~/conversations/${cast.hash}` : undefined,
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const fetchedAt = new Date().toISOString();
  const errors = [];

  // Mentions
  let mentions = [];
  try {
    mentions = await fetchMentions();
    console.log(`[neynar-fetcher] Mentions in last ${LOOKBACK_HOURS}h: ${mentions.length}`);
  } catch (err) {
    console.error(`[neynar-fetcher] Mentions fetch failed: ${err.message}`);
    errors.push({ source: 'mentions', error: err.message });
  }

  // Keyword scans
  const keyword_results = {};
  for (const keyword of KEYWORDS) {
    try {
      const results = await fetchKeyword(keyword);
      keyword_results[keyword] = results;
      console.log(`[neynar-fetcher] Keyword "${keyword}": ${results.length} casts in lookback`);
    } catch (err) {
      console.error(`[neynar-fetcher] Keyword "${keyword}" failed: ${err.message}`);
      keyword_results[keyword] = [];
      errors.push({ source: `keyword:${keyword}`, error: err.message });
    }
  }

  // Our own recent casts
  let our_recent_casts = [];
  try {
    our_recent_casts = await fetchOurRecentCasts();
    console.log(`[neynar-fetcher] Our recent casts: ${our_recent_casts.length}`);
  } catch (err) {
    console.error(`[neynar-fetcher] Our-recent-casts fetch failed: ${err.message}`);
    errors.push({ source: 'our_recent_casts', error: err.message });
  }

  const totalKeywordHits = Object.values(keyword_results).reduce((sum, arr) => sum + arr.length, 0);

  const output = {
    fetched_at: fetchedAt,
    fid: AGENTCRUSH_FID,
    lookback_hours: LOOKBACK_HOURS,
    mentions,
    keyword_results,
    our_recent_casts,
    stats: {
      mention_count: mentions.length,
      keyword_hit_count: totalKeywordHits,
      our_cast_count: our_recent_casts.length,
      error_count: errors.length,
    },
    errors,
    schema_version: 1,
  };

  // Total failure: no data at all
  if (mentions.length === 0 && totalKeywordHits === 0 && our_recent_casts.length === 0 && errors.length > 0) {
    console.error('[neynar-fetcher] FATAL: every fetch failed. Not writing file.');
    process.exit(2);
  }

  if (isDryRun) {
    console.log('[neynar-fetcher] DRY-RUN summary:');
    console.log(JSON.stringify(output.stats, null, 2));
    if (errors.length) console.log('[neynar-fetcher] Errors:', errors);
    process.exit(errors.length ? 1 : 0);
  }

  // Write to brain
  const date = fetchedAt.slice(0, 10);
  const outDir = path.join(BRAIN_PATH, 'Fetchers', 'neynar', 'output');
  const outPath = path.join(outDir, `farcaster-${date}.json`);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, 2));
  console.log(`[neynar-fetcher] Wrote ${outPath}`);

  process.exit(errors.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`[neynar-fetcher] Uncaught: ${err.message}`);
  console.error(err.stack);
  process.exit(2);
});
