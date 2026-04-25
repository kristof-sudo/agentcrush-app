/**
 * Ajsa PH + Farcaster Ingest Worker
 *
 * Ingests Product Hunt AI agent launches and Farcaster channel casts
 * as brief candidates into ajsa_brief_items.
 *
 * Usage:
 *   node ajsa-ingest-ph-farcaster.mjs --dry-run [--limit N]
 *   node ajsa-ingest-ph-farcaster.mjs --write   [--limit N]
 *
 * --limit  max posts per PH query / max casts per Farcaster channel (default 20)
 *
 * Credentials (optional — source is skipped cleanly if missing):
 *   PRODUCTHUNT_ACCESS_TOKEN or PRODUCT_HUNT_ACCESS_TOKEN  → Product Hunt
 *   NEYNAR_API_KEY                                         → Farcaster
 *
 * Never sends Telegram. Never prints secrets.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Source IDs (from ajsa_sources table) ─────────────────────────────────────

const PH_SOURCE_ID  = 'af9a614a-4977-4e6e-8a3c-138e13cdffa6';
const PH_SOURCE_KEY = 'product_hunt_agent_launches';

const FC_SOURCE_ID  = '51bfa840-52a7-48a0-b497-6d0de778b96c';
const FC_SOURCE_KEY = 'farcaster_ai_agents_channels';

const YZI_SOURCE_ID  = 'f1a38088-8706-4280-aad5-212bc93f1b3c';
const YZI_SOURCE_KEY = 'yzi_labs_blog';
const YC_SOURCE_ID   = '940c2919-5232-4cd4-8816-f015df61801d';
const YC_SOURCE_KEY  = 'ycombinator_blog_rss';

const YZI_BLOG_BASE     = 'https://www.yzilabs.com';
const YZI_LOOKBACK_DAYS = 30;
const YC_RSS_URL        = 'https://www.ycombinator.com/blog/rss.xml';

// ── Config ────────────────────────────────────────────────────────────────────

const PH_GRAPHQL_URL         = 'https://api.producthunt.com/v2/api/graphql';
const NEYNAR_FEED_URL        = 'https://api.neynar.com/v2/farcaster/feed';
// parent_url fallback map — add entries when confirmed from Neynar channel metadata
const NEYNAR_CHANNEL_PARENT_URLS = {};
const FETCH_TIMEOUT_MS       = 15000;
const UA                     = 'AgentCrush-Ajsa-PH-Farcaster/1.0 (+https://agentcrush.com)';
const PH_VOTES_THRESHOLD     = 50;
const PH_LOOKBACK_DAYS       = 7;

// Strong AI-agent terms for recent_posts relevance gating.
// "agent" alone is NOT in this list — must be paired with AI/automation/dev context.
const PH_STRONG_AGENT_TERMS = [
  'ai agent',
  'agentic',
  'autonomous agent',
  'agent workflow',
  'multi-agent',
  'agent builder',
  'ai automation',
  'copilot agent',
  'browser agent',
  'coding agent',
  'research agent',
  'agent marketplace',
  'x402',
  'erc-8004',
  'agent payments',
];
// Ambiguous/generic names that only qualify via exact domain corroboration.
const INDEXED_MATCH_DENYLIST = new Set([
  'dune', 'gemini', 'claude', 'twenty', 'rank', 'ask', 'magic', 'monid', 'instantdb',
]);

// YZI Labs strategic radar terms.
// Unknown-date posts only qualify if at least one of these matches.
// Known-date posts within cutoff also require a match.
const YZI_STRATEGIC_TERMS = [
  'ai agent',
  'agentic',
  'autonomous agent',
  'agent infrastructure',
  'crypto ai',
  'ai infrastructure',
  'x402',
  'erc-8004',
  'agent payment',
  'stablecoin',
  'wallet',
  'identity',
  'reputation',
  'verification',
  'decentralized ai',
  'virtuals',
  'fetch.ai',
  'asi alliance',
  'kite ai',
  'coinbase',
  'base',
  'rwa',
  'tokenization',
];

const PH_DELAY_MS            = 1000;
const NEYNAR_DELAY_MS        = 500;
const BLOG_DELAY_MS          = 1200;

// Channels always fetched in addition to what the DB source config says
const FARCASTER_EXTRA_CHANNELS = ['base'];

// ── Args ──────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite  = args.includes('--write');
const limitIdx = args.indexOf('--limit');
const LIMIT    = limitIdx !== -1 ? (parseInt(args[limitIdx + 1], 10) || 20) : 20;

if (!isDryRun && !isWrite) {
  console.error('[ajsa-ph-fc] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[ajsa-ph-fc] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[ajsa-ph-fc] Mode: ${MODE}  Limit: ${LIMIT} per query/channel`);

// ── Env loading ───────────────────────────────────────────────────────────────

const ENV_CANDIDATES = [
  '/opt/agentcrush/selector/.env',
  '/opt/agentcrush/briefing/.env',
  '/opt/agentcrush/copydesk/.env',
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

async function loadEnv() {
  let supabaseEnvLabel = null;
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
    if (!supabaseEnvLabel && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabaseEnvLabel = path.basename(path.dirname(envPath));
    }
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      `[ajsa-ph-fc] Could not find SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in:\n  ${ENV_CANDIDATES.join('\n  ')}`
    );
  }
  if (supabaseEnvLabel) {
    console.log(`[ajsa-ph-fc] Supabase env found in ${supabaseEnvLabel}/.env`);
  }
}

await loadEnv();

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── Keyword scoring ───────────────────────────────────────────────────────────
//
// Extends the base Ajsa keyword set with AgentCrush-ecosystem and
// Farcaster-specific terms the base ingest worker doesn't need.
//
// Each entry: [keyword, useWordBoundary]

const KEYWORDS = [
  // x402 / payment protocols
  ['x402',                         false],
  ['agent payment',                false],
  ['agent payments',               false],
  ['agentic commerce',             false],
  ['agent commerce protocol',      false],
  ['onchain commerce',             false],
  ['autonomous economic activity', false],
  ['agent economy',                false],
  // ERC-8004
  ['erc-8004',                     false],
  ['erc8004',                      false],
  // A2A / coordination
  ['agent-to-agent',               false],
  ['agent coordination',           false],
  ['agent network',                false],
  ['agent services',               false],
  // identity / reputation / wallets
  ['identity registry',            false],
  ['validation registry',          false],
  ['agent identity',               false],
  ['agent reputation',             false],
  ['agent wallet',                 false],
  ['reputation',                   false],
  // general agent economy
  ['autonomous agent',             false],
  ['marketplace',                  false],
  ['discovery',                    false],
  ['stablecoin',                   false],
  ['agentverse',                   false],
  ['bankr',                        false],
  // AgentCrush ecosystem + Farcaster-specific
  ['agentcrush',                   false],
  ['bazaar',                       false],
  ['coinbase cdp',                 false],
  ['agent launch',                 false],
  ['agent launches',               false],
  // short acronyms — whole-word only
  ['a2a',                          true],
  ['acp',                          true],
  ['usdc',                         true],
  ['mcp',                          true],
  ['kite',                         true],
];

function scoreText(text) {
  const lower = text.toLowerCase();
  const matched = [];
  for (const [kw, wordBoundary] of KEYWORDS) {
    let hit;
    if (wordBoundary) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      hit = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(lower);
    } else {
      hit = lower.includes(kw);
    }
    if (hit && !matched.includes(kw)) matched.push(kw);
  }
  return { score: Math.min(matched.length * 10, 100), matchedKeywords: matched };
}

function buildRecommendation(matchedKeywords) {
  if (matchedKeywords.some(k => ['agentcrush', 'bazaar'].includes(k))) {
    return 'Direct mention of AgentCrush/Bazaar — review for narrative or positioning opportunity.';
  }
  if (matchedKeywords.some(k => [
    'x402', 'erc-8004', 'erc8004', 'agent payment', 'agent payments',
    'agentic commerce', 'agent commerce protocol', 'acp', 'onchain commerce',
  ].includes(k))) {
    return 'Review for AgentCrush x402/ERC-8004/ACP docs or update opportunity.';
  }
  if (matchedKeywords.some(k => [
    'agent-to-agent', 'a2a', 'agent coordination', 'agent network',
    'autonomous economic activity', 'agent economy',
  ].includes(k))) {
    return 'Evaluate for A2A/agent coordination signal — potential AgentCrush ecosystem update.';
  }
  if (matchedKeywords.some(k => [
    'marketplace', 'discovery', 'agentverse', 'kite', 'bankr',
    'agent launch', 'agent launches',
  ].includes(k))) {
    return 'Check whether this introduces a new agent/service category AgentCrush should track.';
  }
  if (matchedKeywords.some(k => [
    'coinbase cdp', 'usdc', 'stablecoin', 'identity registry', 'validation registry',
  ].includes(k))) {
    return 'Evaluate for AgentCrush ecosystem signal — payment/identity infrastructure detected.';
  }
  if (matchedKeywords.some(k => [
    'autonomous agent', 'agent wallet', 'mcp', 'agent services',
    'agent identity', 'agent reputation', 'reputation',
  ].includes(k))) {
    return 'Consider adding related agents/services to AgentCrush index.';
  }
  return 'Monitor for emerging agent economy signals.';
}

function priorityFromScore(score) {
  if (score >= 50) return 1;
  if (score >= 30) return 2;
  if (score >= 10) return 3;
  return 4;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchJSON(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: ctrl.signal, ...options });
    clearTimeout(timer);
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      return { ok: false, status: resp.status, error: `HTTP ${resp.status}: ${body.slice(0, 200)}` };
    }
    const json = await resp.json();
    return { ok: true, status: resp.status, data: json };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

async function fetchText(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: ctrl.signal, ...options });
    clearTimeout(timer);
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: `HTTP ${resp.status}` };
    }
    const text = await resp.text();
    return { ok: true, status: resp.status, data: text };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Strip CDATA wrapper if present, otherwise return as-is
function parseCdataValue(s) {
  return (s ?? '').replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
}

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRe.exec(xml)) !== null) {
    const block = itemMatch[1];
    const get = (tag) => {
      const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
      return m ? parseCdataValue(m[1]) : null;
    };
    items.push({
      title:       get('title'),
      link:        get('link'),
      description: get('description'),
      pubDate:     get('pubDate'),
      guid:        get('guid'),
    });
  }
  return items;
}

function decodeHtmlEntities(str) {
  return (str ?? '')
    .replace(/&amp;/gi,  '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi,  "'")
    .replace(/&lt;/gi,   '<')
    .replace(/&gt;/gi,   '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// Try multiple HTML date sources in priority order.
// Returns { raw, source } or null.
function parseYziDate(html) {
  // 1. JSON-LD datePublished / dateModified
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jm;
  while ((jm = jsonLdRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(jm[1]);
      for (const key of ['datePublished', 'dateModified']) {
        if (obj[key]) {
          const ms = new Date(obj[key]).getTime();
          if (!isNaN(ms)) return { raw: obj[key], source: 'json_ld' };
        }
      }
    } catch {}
  }

  // 2. meta property="article:published_time" / "article:modified_time" / "og:updated_time"
  const metaProp = (prop) => {
    const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pats = [
      new RegExp(`<meta[^>]+property="${esc}"[^>]+content="([^"]*)"`, 'i'),
      new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${esc}"`, 'i'),
    ];
    for (const re of pats) {
      const m = re.exec(html);
      if (m && !isNaN(new Date(m[1]).getTime())) return m[1].trim();
    }
    return null;
  };
  for (const prop of ['article:published_time', 'article:modified_time', 'og:updated_time']) {
    const v = metaProp(prop);
    if (v) return { raw: v, source: prop };
  }

  // 3. meta name="date" / "publish_date" / "published_time"
  const metaName = (name) => {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pats = [
      new RegExp(`<meta[^>]+name="${esc}"[^>]+content="([^"]*)"`, 'i'),
      new RegExp(`<meta[^>]+content="([^"]*)"[^>]+name="${esc}"`, 'i'),
    ];
    for (const re of pats) {
      const m = re.exec(html);
      if (m && !isNaN(new Date(m[1]).getTime())) return m[1].trim();
    }
    return null;
  };
  for (const name of ['date', 'publish_date', 'published_time']) {
    const v = metaName(name);
    if (v) return { raw: v, source: `meta:${name}` };
  }

  // 4. <time datetime="...">
  const tm = /<time[^>]*datetime=["']([^"']+)["']/i.exec(html);
  if (tm) {
    const ms = new Date(tm[1]).getTime();
    if (!isNaN(ms)) return { raw: tm[1], source: 'time_element' };
  }

  // 5. Visible date: Month DD, YYYY — year restricted to 2020–2039
  const months = 'January|February|March|April|May|June|July|August|September|October|November|December';
  const vdr = new RegExp(`\\b(${months})\\s+(\\d{1,2}),?\\s+(20[23]\\d)\\b`, 'i');
  const vm = vdr.exec(html);
  if (vm) {
    const d = new Date(vm[0]);
    if (!isNaN(d.getTime())) return { raw: vm[0].replace(',', ''), source: 'visible_date' };
  }

  return null;
}

// Check YZI_STRATEGIC_TERMS in combined text.
function auditYziRelevance(text) {
  const lower = (text ?? '').toLowerCase();
  const terms = YZI_STRATEGIC_TERMS.filter(t => lower.includes(t));
  return { relevant: terms.length > 0, terms };
}

// ── Product Hunt ──────────────────────────────────────────────────────────────

// topics(query:) supports free-text search; posts() does NOT accept query arg.
// Strategy A: discover slugs via topics(), then posts(topic: $slug, ...).
// Strategy B (fallback): posts(first:, postedAfter:, order: VOTES) + local filter.

const PH_GQL_DISCOVER_TOPICS = `
  query DiscoverTopics($query: String!) {
    topics(query: $query) {
      edges {
        node { slug name }
      }
    }
  }
`.trim();

const PH_GQL_POSTS_BY_TOPIC = `
  query PostsByTopic($topicSlug: String!, $first: Int!, $postedAfter: DateTime) {
    posts(first: $first, topic: $topicSlug, postedAfter: $postedAfter, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          slug
          votesCount
          commentsCount
          createdAt
          topics {
            edges {
              node { slug name }
            }
          }
        }
      }
    }
  }
`.trim();

const PH_GQL_POSTS_RECENT = `
  query RecentPosts($first: Int!, $postedAfter: DateTime) {
    posts(first: $first, postedAfter: $postedAfter, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          slug
          votesCount
          commentsCount
          createdAt
          topics {
            edges {
              node { slug name }
            }
          }
        }
      }
    }
  }
`.trim();

function phGraphQL(token, gqlQuery, variables) {
  return fetchJSON(PH_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify({ query: gqlQuery, variables }),
  });
}

async function fetchPHTopics(token, query) {
  const result = await phGraphQL(token, PH_GQL_DISCOVER_TOPICS, { query });
  if (!result.ok) return result;
  const errors = result.data?.errors;
  if (errors?.length) return { ok: false, error: errors.map(e => e.message).join('; ') };
  const edges = result.data?.data?.topics?.edges ?? [];
  return { ok: true, topics: edges.map(e => e.node) };
}

async function fetchPHPostsByTopic(token, topicSlug, limit, postedAfter) {
  const result = await phGraphQL(token, PH_GQL_POSTS_BY_TOPIC, { topicSlug, first: limit, postedAfter });
  if (!result.ok) return result;
  const errors = result.data?.errors;
  if (errors?.length) return { ok: false, error: errors.map(e => e.message).join('; ') };
  const edges = result.data?.data?.posts?.edges ?? [];
  return { ok: true, posts: edges.map(e => e.node) };
}

async function fetchPHRecentPosts(token, limit, postedAfter) {
  const result = await phGraphQL(token, PH_GQL_POSTS_RECENT, { first: limit, postedAfter });
  if (!result.ok) return result;
  const errors = result.data?.errors;
  if (errors?.length) return { ok: false, error: errors.map(e => e.message).join('; ') };
  const edges = result.data?.data?.posts?.edges ?? [];
  return { ok: true, posts: edges.map(e => e.node) };
}

function phCanonicalUrl(post) {
  if (post.slug) return `https://www.producthunt.com/posts/${post.slug}`;
  if (post.id)   return `https://www.producthunt.com/posts/${post.id}`;
  return post.url ?? '';
}

// ── Farcaster / Neynar ────────────────────────────────────────────────────────

function channelSlugFromUrl(channelUrl) {
  // Handles: "/ai", "warpcast /ai", "https://warpcast.com/~/channel/ai"
  const str = String(channelUrl ?? '').trim();
  const parts = str.replace(/\/$/, '').split(/[/\s]+/);
  return parts[parts.length - 1].toLowerCase() || null;
}

async function fetchFarcasterChannel(apiKey, channelId, limit) {
  const headers = { 'api_key': apiKey, 'Accept': 'application/json', 'User-Agent': UA };

  // Primary: feed_type=filter&filter_type=channel_id
  const primaryUrl = `${NEYNAR_FEED_URL}?feed_type=filter&filter_type=channel_id&channel_id=${encodeURIComponent(channelId)}&limit=${limit}`;
  const primary = await fetchJSON(primaryUrl, { headers });

  if (primary.ok) return { ok: true, casts: primary.data?.casts ?? [] };
  if (primary.status === 402) return { ok: false, paidPlanRequired: true, error: primary.error };

  // Fallback: parent_url mode (if channel_id param is rejected)
  if (primary.status === 400 || primary.status === 404) {
    const parentUrl = NEYNAR_CHANNEL_PARENT_URLS[channelId] ?? null;
    if (!parentUrl) {
      return {
        ok: false, noFallback: true,
        error: `channel_id filter returned ${primary.status}; parent_url fallback not configured for /${channelId}`,
      };
    }
    const fallbackUrl = `${NEYNAR_FEED_URL}?feed_type=filter&filter_type=parent_url&parent_url=${encodeURIComponent(parentUrl)}&limit=${limit}`;
    const fallback = await fetchJSON(fallbackUrl, { headers });
    if (fallback.ok) return { ok: true, casts: fallback.data?.casts ?? [], usedFallback: true };
    if (fallback.status === 402) return { ok: false, paidPlanRequired: true, error: fallback.error };
    return { ok: false, error: `channel_id(${primary.status}): ${primary.error} | parent_url fallback: ${fallback.error}` };
  }

  return primary;
}

// ── Credentials ───────────────────────────────────────────────────────────────

const phToken   = process.env.PRODUCTHUNT_ACCESS_TOKEN || process.env.PRODUCT_HUNT_ACCESS_TOKEN || null;
const neynarKey = process.env.NEYNAR_API_KEY || null;

if (!phToken) {
  console.warn('[ajsa-ph-fc] WARN: PRODUCTHUNT_ACCESS_TOKEN / PRODUCT_HUNT_ACCESS_TOKEN not set — skipping Product Hunt.');
  console.warn(`             Set PRODUCTHUNT_ACCESS_TOKEN in one of: ${ENV_CANDIDATES.join(', ')}`);
}
if (!neynarKey) {
  console.warn('[ajsa-ph-fc] WARN: NEYNAR_API_KEY not set — skipping Farcaster.');
  console.warn(`             Set NEYNAR_API_KEY in one of: ${ENV_CANDIDATES.join(', ')}`);
}

// ── Load source configs ───────────────────────────────────────────────────────

const TODAY   = new Date().toISOString().slice(0, 10);
const NOW_ISO = new Date().toISOString();

const { data: phSrc, error: phSrcErr } = await supabase
  .from('ajsa_sources')
  .select('id, source_key, source_type, display_name, config')
  .eq('id', PH_SOURCE_ID)
  .maybeSingle();

if (phSrcErr) console.warn('[ajsa-ph-fc] WARN: could not load PH source config:', phSrcErr.message);

const { data: fcSrc, error: fcSrcErr } = await supabase
  .from('ajsa_sources')
  .select('id, source_key, source_type, display_name, config')
  .eq('id', FC_SOURCE_ID)
  .maybeSingle();

if (fcSrcErr) console.warn('[ajsa-ph-fc] WARN: could not load Farcaster source config:', fcSrcErr.message);

const { data: yziSrc, error: yziSrcErr } = await supabase
  .from('ajsa_sources')
  .select('id, source_key, source_type, display_name, config')
  .eq('id', YZI_SOURCE_ID)
  .maybeSingle();

if (yziSrcErr) console.warn('[ajsa-ph-fc] WARN: could not load YZI source config:', yziSrcErr.message);

const { data: ycSrc, error: ycSrcErr } = await supabase
  .from('ajsa_sources')
  .select('id, source_key, source_type, display_name, config')
  .eq('id', YC_SOURCE_ID)
  .maybeSingle();

if (ycSrcErr) console.warn('[ajsa-ph-fc] WARN: could not load YC source config:', ycSrcErr.message);

// PH queries: from DB config or sensible defaults
const phQueries = phSrc?.config?.queries ?? [
  'agent', 'AI agent', 'agent marketplace', 'automation agent', 'agent wallet',
];

// Farcaster channels: DB config slugs + extras hardcoded in this worker
const fcConfigChannels = (fcSrc?.config?.channels ?? [])
  .map(c => channelSlugFromUrl(c.url))
  .filter(Boolean);

const hasTierC = !!(fcSrc?.config?.tier_c_accounts?.length);
console.log(hasTierC
  ? `[ajsa-ph-fc] INFO: Farcaster Tier C account list found (${fcSrc.config.tier_c_accounts.length} accounts).`
  : '[ajsa-ph-fc] INFO: No Tier C Farcaster account list found in source config — skipping account monitoring.'
);

const fcChannels = [...new Set([...fcConfigChannels, ...FARCASTER_EXTRA_CHANNELS])];

// ── Indexed agent records (populated below, used in classifyIndexedAgentMatch) ─

let indexedAgentRecords   = []; // [{ handle, display_name, website_url, github_full_name }]
let indexedPackageRecords = []; // [{ package_name, agent_handle }]

if (phToken) {
  // Try extended fields; fall back if a column is missing.
  let rawAgents = null;
  {
    let { data, error } = await supabase
      .from('agents')
      .select('handle, display_name, website_url, github_full_name');
    if (error) {
      console.warn('[ajsa-ph-fc] WARN: agents extended query failed, retrying basic:', error.message);
      ({ data, error } = await supabase.from('agents').select('handle, display_name, website_url'));
    }
    if (error) {
      console.warn('[ajsa-ph-fc] WARN: could not load agents:', error.message);
    } else {
      rawAgents = data ?? [];
    }
  }
  indexedAgentRecords = (rawAgents ?? []).filter(a => a.handle || a.display_name);

  let rawPkgs = null;
  {
    let { data, error } = await supabase
      .from('agent_package_mapping_latest')
      .select('package_name, agent_handle');
    if (error) {
      // agent_handle column may not exist
      console.warn('[ajsa-ph-fc] WARN: packages extended query failed, retrying basic:', error.message);
      ({ data, error } = await supabase.from('agent_package_mapping_latest').select('package_name'));
    }
    if (error) {
      console.warn('[ajsa-ph-fc] WARN: could not load agent_package_mapping_latest:', error.message);
    } else {
      rawPkgs = data ?? [];
    }
  }
  indexedPackageRecords = (rawPkgs ?? []).filter(p => p.package_name);

  console.log(`[ajsa-ph-fc] Indexed agents: ${indexedAgentRecords.length} records  ${indexedPackageRecords.length} packages`);
}

console.log(`\n[ajsa-ph-fc] PH queries (${phQueries.length}): ${phToken ? 'token ok' : 'SKIPPED — no token'}`);
console.log(`[ajsa-ph-fc] Farcaster channels (${fcChannels.join(', ')}): ${neynarKey ? 'key ok' : 'SKIPPED — no key'}\n`);

// ── Product Hunt relevance helpers ───────────────────────────────────────────

/**
 * Audit PH post for AI-agent relevance.
 * Returns { relevant, terms, field }
 *   terms — all PH_STRONG_AGENT_TERMS found (de-duped, in discovery order)
 *   field — first field that produced a match: title | tagline | description | topics
 */
function auditPhAgentRelevance(post) {
  const checks = [
    { key: 'title',       text: post.name        ?? '' },
    { key: 'tagline',     text: post.tagline      ?? '' },
    { key: 'description', text: post.description  ?? '' },
    { key: 'topics',      text: (post.topics?.edges ?? []).map(e => `${e.node?.slug ?? ''} ${e.node?.name ?? ''}`).join(' ') },
  ];
  const foundTerms = [];
  let primaryField = null;
  for (const { key, text } of checks) {
    const lower   = text.toLowerCase();
    const matches = PH_STRONG_AGENT_TERMS.filter(t => lower.includes(t) && !foundTerms.includes(t));
    if (matches.length > 0) {
      matches.forEach(t => foundTerms.push(t));
      if (!primaryField) primaryField = key;
    }
  }
  return { relevant: foundTerms.length > 0, terms: foundTerms, field: primaryField };
}

function normStr(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractDomain(url) {
  if (!url) return null;
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : 'https://' + url.replace(/^\/\//, '');
    return new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
  } catch { return null; }
}

function wbMatch(text, term) {
  if (!term) return false;
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'i').test(text);
}

/**
 * Classify an indexed-agent match for a PH post.
 *
 * Returns null (no match) or a descriptor:
 *   { isStrong, agentHandle, agentDisplayName, agentGithubFullName, packageName,
 *     matchedField, matchedValue, exactMatchType }
 *
 * Strong: exact_title | exact_slug | exact_domain | normalized_title
 * Weak:   weak_text (word-boundary hit anywhere in combined text)
 *
 * INDEXED_MATCH_DENYLIST names are downgraded to weak unless a domain match corroborates.
 */
function classifyIndexedAgentMatch(post) {
  const titleNorm  = normStr(post.name  ?? '');
  const slugNorm   = normStr(post.slug  ?? '');
  const postDomain = extractDomain(post.url ?? '');
  const titleLower = (post.name ?? '').toLowerCase();
  const combined   = [post.name ?? '', post.tagline ?? '', post.description ?? '', post.url ?? '']
                       .join(' ').toLowerCase();

  function mkr(isStrong, agent, matchedField, matchedValue, exactMatchType, pkgName) {
    return {
      isStrong,
      agentHandle:         agent?.handle          ?? null,
      agentDisplayName:    agent?.display_name     ?? null,
      agentGithubFullName: agent?.github_full_name ?? null,
      packageName:         pkgName                ?? null,
      matchedField,
      matchedValue,
      exactMatchType,
    };
  }

  function denyCheck(r, agentDomain) {
    if (!INDEXED_MATCH_DENYLIST.has(normStr(r.matchedValue))) return r;
    if (r.exactMatchType === 'exact_domain') return r;
    if (agentDomain && postDomain && agentDomain === postDomain) {
      return Object.assign({}, r, { isStrong: true, exactMatchType: 'exact_domain' });
    }
    return Object.assign({}, r, { isStrong: false });
  }

  let weakFallback = null;

  // ── Agent records ─────────────────────────────────────────────────────────
  for (const agent of indexedAgentRecords) {
    const handle      = (agent.handle      ?? '').toLowerCase();
    const dispName    = (agent.display_name ?? '').toLowerCase();
    const agentDomain = extractDomain(agent.website_url ?? '');

    // Exact domain — highest confidence, overrides denylist
    if (agentDomain && postDomain && agentDomain === postDomain) {
      return mkr(true, agent, 'domain', agentDomain, 'exact_domain', null);
    }

    // exact_title on display_name
    if (dispName && titleNorm === normStr(dispName)) {
      const r = denyCheck(mkr(true, agent, 'display_name', agent.display_name, 'exact_title', null), agentDomain);
      if (r.isStrong) return r;
      if (!weakFallback) weakFallback = r;
    }

    // exact_title on handle
    if (handle && titleNorm === normStr(handle)) {
      const r = denyCheck(mkr(true, agent, 'handle', agent.handle, 'exact_title', null), agentDomain);
      if (r.isStrong) return r;
      if (!weakFallback) weakFallback = r;
    }

    // exact_slug on handle
    if (handle && slugNorm && slugNorm === normStr(handle)) {
      const r = denyCheck(mkr(true, agent, 'handle', agent.handle, 'exact_slug', null), agentDomain);
      if (r.isStrong) return r;
      if (!weakFallback) weakFallback = r;
    }

    // normalized_title: multi-word display_name (≥ 6 chars) at word boundary in title
    if (dispName.length >= 6 && dispName.includes(' ') && wbMatch(titleLower, dispName)) {
      const r = denyCheck(mkr(true, agent, 'display_name', agent.display_name, 'normalized_title', null), agentDomain);
      if (r.isStrong) return r;
      if (!weakFallback) weakFallback = r;
    }

    // weak_text: word-boundary hit in full combined text
    if (handle && !weakFallback && wbMatch(combined, handle)) {
      weakFallback = mkr(false, agent, 'handle', agent.handle, 'weak_text', null);
    }
    if (dispName.length >= 4 && !weakFallback && wbMatch(combined, dispName)) {
      weakFallback = mkr(false, agent, 'display_name', agent.display_name, 'weak_text', null);
    }
  }

  // ── Package records ───────────────────────────────────────────────────────
  for (const pkg of indexedPackageRecords) {
    const pkgLower = (pkg.package_name ?? '').toLowerCase();
    const pkgNorm  = normStr(pkgLower);
    if (!pkgNorm) continue;

    // exact_title on package_name
    if (titleNorm === pkgNorm) {
      const r = denyCheck(mkr(true, null, 'package_name', pkg.package_name, 'exact_title', pkg.package_name), null);
      if (!r.agentHandle) r.agentHandle = pkg.agent_handle ?? null;
      if (r.isStrong) return r;
      if (!weakFallback) weakFallback = r;
    }

    // exact_slug on package_name
    if (slugNorm && slugNorm === pkgNorm) {
      const r = denyCheck(mkr(true, null, 'package_name', pkg.package_name, 'exact_slug', pkg.package_name), null);
      if (!r.agentHandle) r.agentHandle = pkg.agent_handle ?? null;
      if (r.isStrong) return r;
      if (!weakFallback) weakFallback = r;
    }

    // weak_text
    if (!weakFallback && wbMatch(combined, pkgLower)) {
      weakFallback = mkr(false, null, 'package_name', pkg.package_name, 'weak_text', pkg.package_name);
      weakFallback.agentHandle = pkg.agent_handle ?? null;
    }
  }

  return weakFallback;
}

// ── Product Hunt ingest ───────────────────────────────────────────────────────

const phCandidates    = [];
const phSkipped       = [];
const phFailures      = [];
const seenPHIds       = new Set();
let   phStrategyUsed           = null;
let   phTopicSlugsFound        = [];
let   phPostsSeen              = 0;
let   phStrongIndexedCount     = 0;
let   phAiRelevantVotesCount   = 0;
let   phSkippedNotRelevant     = 0;
let   phSkippedBelowVotes      = 0;
let   phSkippedWeakIndexed     = 0;

if (phToken) {
  const postedAfter = new Date(Date.now() - PH_LOOKBACK_DAYS * 86400_000).toISOString();

  // Phase 1: discover topic slugs via topics(query: ...) for each configured term
  const discoveredTopics = new Map(); // slug → name

  console.log(`[ajsa-ph-fc] Product Hunt — topic discovery (${phQueries.length} term(s)) · last ${PH_LOOKBACK_DAYS}d · ≥${PH_VOTES_THRESHOLD} votes threshold\n`);

  for (const term of phQueries) {
    process.stdout.write(`  [PH:topics] "${term}" ... `);
    const result = await fetchPHTopics(phToken, term);

    if (!result.ok) {
      console.log(`FAILED (${result.error})`);
      await sleep(PH_DELAY_MS);
      continue;
    }

    const newTopics = result.topics.filter(t => !discoveredTopics.has(t.slug));
    newTopics.forEach(t => discoveredTopics.set(t.slug, t.name));
    const newSlugs = newTopics.map(t => t.slug).join(', ') || '(none new)';
    console.log(`${result.topics.length} topic(s)  new: ${newSlugs}`);
    await sleep(PH_DELAY_MS);
  }

  phTopicSlugsFound = [...discoveredTopics.keys()];

  // Phase 2: choose strategy
  if (phTopicSlugsFound.length > 0) {
    phStrategyUsed = 'topic_posts';
    console.log(`\n[ajsa-ph-fc] PH strategy: topic_posts — ${phTopicSlugsFound.length} slug(s): ${phTopicSlugsFound.join(', ')}\n`);
  } else {
    phStrategyUsed = 'recent_posts';
    console.log('\n[ajsa-ph-fc] PH strategy: recent_posts (no topics discovered — local keyword filtering applied)\n');
  }

  // Phase 3: fetch posts
  const postsToProcess = []; // { post, label }

  if (phStrategyUsed === 'topic_posts') {
    for (const topicSlug of phTopicSlugsFound) {
      process.stdout.write(`  [PH] topic="${topicSlug}" ... `);
      const result = await fetchPHPostsByTopic(phToken, topicSlug, LIMIT, postedAfter);

      if (!result.ok) {
        console.log(`FAILED (${result.error})`);
        phFailures.push({ query: `topic:${topicSlug}`, error: result.error });
        await sleep(PH_DELAY_MS);
        continue;
      }

      const newPosts = result.posts.filter(p => !seenPHIds.has(p.id));
      newPosts.forEach(p => { seenPHIds.add(p.id); postsToProcess.push({ post: p, label: `topic:${topicSlug}` }); });
      console.log(`${result.posts.length} posts  ${newPosts.length} new`);
      await sleep(PH_DELAY_MS);
    }
  } else {
    // recent_posts fallback
    process.stdout.write(`  [PH] recent posts (last ${PH_LOOKBACK_DAYS}d) ... `);
    const result = await fetchPHRecentPosts(phToken, LIMIT, postedAfter);

    if (!result.ok) {
      console.log(`FAILED (${result.error})`);
      phFailures.push({ query: 'recent_posts', error: result.error });
    } else {
      const newPosts = result.posts.filter(p => !seenPHIds.has(p.id));
      newPosts.forEach(p => { seenPHIds.add(p.id); postsToProcess.push({ post: p, label: 'recent' }); });
      console.log(`${result.posts.length} posts  ${newPosts.length} new`);
    }
  }

  // Phase 4: score and filter
  phPostsSeen = postsToProcess.length;

  for (const { post, label } of postsToProcess) {
    const scoringText   = [post.name ?? '', post.tagline ?? '', post.description ?? ''].join(' ');
    const { score, matchedKeywords } = scoreText(scoringText);
    const highVotes     = (post.votesCount ?? 0) >= PH_VOTES_THRESHOLD;
    const relevanceAudit = auditPhAgentRelevance(post);
    const agentRelevant  = relevanceAudit.relevant;
    const matchInfo     = classifyIndexedAgentMatch(post);
    const isStrongMatch = matchInfo?.isStrong === true;
    const isWeakMatch   = matchInfo !== null && matchInfo.isStrong === false;

    const strongQualifies = isStrongMatch;
    const votesQualifies  = agentRelevant && highVotes;

    let qualifyReason = null;
    if (strongQualifies && votesQualifies) {
      qualifyReason = 'both';
      phStrongIndexedCount++;
      phAiRelevantVotesCount++;
    } else if (strongQualifies) {
      qualifyReason = 'strong_indexed_agent_match';
      phStrongIndexedCount++;
    } else if (votesQualifies) {
      qualifyReason = 'ai_agent_relevant_and_votes>=50';
      phAiRelevantVotesCount++;
    }

    const qualifies = qualifyReason !== null;

    if (!qualifies) {
      if (isWeakMatch) {
        phSkippedWeakIndexed++;
        phSkipped.push({ query: label, id: post.id, name: post.name, reason: 'weak_indexed_match', matchInfo });
        console.log(`  [PH:SKIP]  "${post.name}"  reason=weak_indexed_match  votes=${post.votesCount ?? 0}  field=${matchInfo.matchedField}  value="${matchInfo.matchedValue}"  type=${matchInfo.exactMatchType}`);
      } else if (!agentRelevant) {
        phSkippedNotRelevant++;
        phSkipped.push({ query: label, id: post.id, name: post.name, reason: 'not_agent_relevant' });
        console.log(`  [PH:SKIP]  "${post.name}"  reason=not_agent_relevant  votes=${post.votesCount ?? 0}`);
      } else {
        phSkippedBelowVotes++;
        phSkipped.push({ query: label, id: post.id, name: post.name, reason: 'below_vote_threshold', votes: post.votesCount ?? 0 });
        console.log(`  [PH:SKIP]  "${post.name}"  reason=below_vote_threshold  votes=${post.votesCount ?? 0}`);
      }
      continue;
    }

    const effectiveScore = score > 0 ? score : 10;
    const recommendation = buildRecommendation(matchedKeywords);
    // High-vote posts are always at most P2 regardless of keyword score
    const priority = highVotes
      ? Math.min(priorityFromScore(effectiveScore), 2)
      : priorityFromScore(effectiveScore);

    const postUrl = phCanonicalUrl(post);
    const topics  = (post.topics?.edges ?? []).map(e => e.node?.slug).filter(Boolean);

    phCandidates.push({
      brief_date:   TODAY,
      source_id:    PH_SOURCE_ID,
      source_key:   PH_SOURCE_KEY,
      source_type:  'search',
      title:        post.name,
      url:          postUrl,
      summary:      [post.tagline, post.description].filter(Boolean).join(' — ').slice(0, 400) || null,
      recommendation,
      priority,
      score:        effectiveScore,
      status:       'candidate',
      occurred_at:  post.createdAt ?? null,
      published_at: post.createdAt ?? null,
      evidence: {
        matched_keywords:      matchedKeywords,
        ph_votes:              post.votesCount ?? 0,
        ph_comments:           post.commentsCount ?? 0,
        ph_id:                 post.id,
        ph_slug:               post.slug ?? null,
        query:                 label,
        qualify_reason:        qualifyReason,
        ph_relevance_terms:    relevanceAudit.terms,
        ph_relevance_field:    relevanceAudit.field,
        // Strong-match agent fields: only populated when strong_indexed_agent_match contributed
        ...(isStrongMatch ? {
          matched_agent_handle:  matchInfo.agentHandle         ?? null,
          matched_agent_display: matchInfo.agentDisplayName    ?? null,
          matched_agent_github:  matchInfo.agentGithubFullName ?? null,
          matched_package:       matchInfo.packageName         ?? null,
          matched_field:         matchInfo.matchedField        ?? null,
          matched_value:         matchInfo.matchedValue        ?? null,
          exact_match_type:      matchInfo.exactMatchType      ?? null,
        } : {}),
        // Weak incidental match — kept for audit but never qualifies
        ...(isWeakMatch ? {
          weak_indexed_match: {
            matched_field:         matchInfo.matchedField,
            matched_value:         matchInfo.matchedValue,
            exact_match_type:      matchInfo.exactMatchType,
            matched_agent_handle:  matchInfo.agentHandle         ?? null,
            matched_agent_display: matchInfo.agentDisplayName    ?? null,
            matched_agent_github:  matchInfo.agentGithubFullName ?? null,
            matched_package:       matchInfo.packageName         ?? null,
          },
        } : {}),
        ph_strategy:           phStrategyUsed,
        ph_topic_slugs:        phTopicSlugsFound,
      },
      payload: {
        display_name:    phSrc?.display_name ?? 'Product Hunt Agent Launches',
        ph_name:         post.name,
        ph_tagline:      post.tagline ?? null,
        ph_slug:         post.slug ?? null,
        ph_topics:       topics,
        ph_external_url: post.url ?? null,
      },
    });
  }
}

// ── Farcaster ingest ──────────────────────────────────────────────────────────

const fcCandidates      = [];
const fcSkipped         = [];
const fcFailures        = [];
const fcPaidPlanSkipped = [];
let   fcPaidPlanGated   = false;
const seenCastHashes    = new Set();

if (neynarKey) {
  console.log(`\n[ajsa-ph-fc] Farcaster — ${fcChannels.length} channel(s): /${fcChannels.join(', /')}\n`);

  for (const channelId of fcChannels) {
    process.stdout.write(`  [FC] /${channelId} ... `);

    if (fcPaidPlanGated) {
      console.log('skipped (paid plan required)');
      fcPaidPlanSkipped.push({ channel: channelId });
      continue;
    }

    const result = await fetchFarcasterChannel(neynarKey, channelId, LIMIT);

    if (!result.ok) {
      if (result.paidPlanRequired) {
        console.log('skipped (paid plan required)');
        fcPaidPlanSkipped.push({ channel: channelId });
        console.warn('[ajsa-ph-fc] WARN: Farcaster channel monitoring requires paid Neynar access; skipping channels.');
        fcPaidPlanGated = true;
        continue;
      }
      if (result.noFallback) {
        console.log(`skipped (${result.error})`);
        fcFailures.push({ channel: channelId, error: result.error });
        await sleep(NEYNAR_DELAY_MS);
        continue;
      }
      console.log(`FAILED (${result.error})`);
      fcFailures.push({ channel: channelId, error: result.error });
      await sleep(NEYNAR_DELAY_MS);
      continue;
    }

    if (result.usedFallback) {
      process.stdout.write('(parent_url fallback) ');
    }

    const newCasts = result.casts.filter(c => !seenCastHashes.has(c.hash));
    newCasts.forEach(c => seenCastHashes.add(c.hash));

    let scoredCount = 0;
    for (const cast of newCasts) {
      const castText = cast.text ?? '';
      const { score, matchedKeywords } = scoreText(castText);

      if (score <= 0) {
        fcSkipped.push({ channel: channelId, hash: cast.hash });
        continue;
      }

      const recommendation = buildRecommendation(matchedKeywords);
      const priority       = priorityFromScore(score);
      const username       = cast.author?.username ?? 'unknown';
      // Warpcast canonical URL uses the cast hash (full hex string)
      const castUrl = `https://warpcast.com/${username}/${cast.hash ?? 'unknown'}`;

      fcCandidates.push({
        brief_date:   TODAY,
        source_id:    FC_SOURCE_ID,
        source_key:   FC_SOURCE_KEY,
        source_type:  'community',
        title:        `/${channelId} @${username}: ${castText.slice(0, 80)}${castText.length > 80 ? '…' : ''}`,
        url:          castUrl,
        summary:      castText.slice(0, 400) || null,
        recommendation,
        priority,
        score,
        status:       'candidate',
        occurred_at:  cast.timestamp ?? null,
        published_at: cast.timestamp ?? null,
        evidence: {
          matched_keywords: matchedKeywords,
          cast_hash:        cast.hash ?? null,
          cast_likes:       cast.reactions?.likes_count ?? 0,
          cast_recasts:     cast.reactions?.recasts_count ?? 0,
          channel:          channelId,
          fid:              cast.author?.fid ?? null,
        },
        payload: {
          display_name:    fcSrc?.display_name ?? 'Farcaster AI Agents',
          fc_username:     username,
          fc_display_name: cast.author?.display_name ?? null,
          fc_channel:      channelId,
          fc_hash:         cast.hash ?? null,
          fc_text:         castText.slice(0, 500),
        },
      });
      scoredCount++;
    }

    console.log(`${result.casts.length} casts  ${newCasts.length} new  ${scoredCount} candidate(s)`);
    await sleep(NEYNAR_DELAY_MS);
  }
}

// ── YZI Labs ingest ───────────────────────────────────────────────────────────

const yziCandidates = [];
const yziSkipped    = [];
const yziFailures   = [];
let yziPostsSeen                     = 0;
let yziSkippedOld                    = 0;
let yziSkippedUnknownDateNotRelevant = 0;
let yziUnknownDateRelevant           = 0;
let yziDateParseSuccess              = 0;
let yziDateParseFailed               = 0;

{
  const lookbackDays = yziSrc?.config?.lookback_days ?? YZI_LOOKBACK_DAYS;
  const cutoff       = new Date(Date.now() - lookbackDays * 86400_000);
  const listingUrl   = `${YZI_BLOG_BASE}/blog`;

  console.log(`\n[ajsa-ph-fc] YZI Labs — scraping ${listingUrl}  lookback=${lookbackDays}d\n`);

  process.stdout.write('  [YZI] Fetching listing page ... ');
  const listResult = await fetchText(listingUrl, { headers: { 'User-Agent': UA } });

  if (!listResult.ok) {
    console.log(`FAILED (${listResult.error})`);
    yziFailures.push({ step: 'listing', error: listResult.error });
  } else {
    const slugSet = new Set();
    const slugRe  = /href=["'](\/blog\/[a-z0-9][a-z0-9-]*[a-z0-9])["']/gi;
    let m;
    while ((m = slugRe.exec(listResult.data)) !== null) {
      slugSet.add(m[1]);
    }
    const slugs = [...slugSet];
    console.log(`${slugs.length} slug(s) found`);

    for (const slug of slugs) {
      yziPostsSeen++;
      const postUrl = `${YZI_BLOG_BASE}${slug}`;
      process.stdout.write(`  [YZI] ${slug} ... `);
      await sleep(BLOG_DELAY_MS);
      const postResult = await fetchText(postUrl, { headers: { 'User-Agent': UA } });

      if (!postResult.ok) {
        console.log(`FAILED (${postResult.error})`);
        yziFailures.push({ step: 'post', slug, error: postResult.error });
        continue;
      }

      const html = postResult.data;

      const metaGet = (property) => {
        const esc = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pats = [
          new RegExp(`<meta[^>]+property="${esc}"[^>]+content="([^"]*)"`, 'i'),
          new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${esc}"`, 'i'),
          new RegExp(`<meta[^>]+property='${esc}'[^>]+content='([^']*)'`, 'i'),
          new RegExp(`<meta[^>]+content='([^']*)'[^>]+property='${esc}'`, 'i'),
        ];
        for (const re of pats) {
          const match = re.exec(html);
          if (match) return match[1].trim();
        }
        return null;
      };

      const ogTitle = decodeHtmlEntities(metaGet('og:title') ?? '');
      const ogDesc  = decodeHtmlEntities(metaGet('og:description') ?? '');
      const title   = ogTitle || decodeHtmlEntities(slug.replace('/blog/', '').replace(/-/g, ' '));

      // Multi-source date parsing
      const dateResult = parseYziDate(html);
      const dateKnown  = dateResult !== null;
      const pubMs      = dateKnown ? new Date(dateResult.raw).getTime() : null;

      if (dateKnown) {
        yziDateParseSuccess++;
      } else {
        yziDateParseFailed++;
      }

      // Strategic relevance check
      const relevanceAudit = auditYziRelevance([title, ogDesc].join(' '));

      if (dateKnown) {
        if (new Date(pubMs) < cutoff) {
          console.log(`skip  date=${dateResult.raw.slice(0, 10)}  src=${dateResult.source}  reason=before_cutoff`);
          yziSkippedOld++;
          yziSkipped.push({ slug, reason: 'before_cutoff', pubDate: dateResult.raw });
          continue;
        }
        if (!relevanceAudit.relevant) {
          console.log(`skip  date=${dateResult.raw.slice(0, 10)}  src=${dateResult.source}  reason=not_strategic_relevant`);
          yziSkipped.push({ slug, reason: 'not_strategic_relevant', pubDate: dateResult.raw });
          continue;
        }
        console.log(`include  date=${dateResult.raw.slice(0, 10)}  src=${dateResult.source}  terms=[${relevanceAudit.terms.join(', ')}]`);
      } else {
        if (!relevanceAudit.relevant) {
          console.log('skip  date=unknown  reason=unknown_date_not_relevant');
          yziSkippedUnknownDateNotRelevant++;
          yziSkipped.push({ slug, reason: 'unknown_date_not_relevant' });
          continue;
        }
        yziUnknownDateRelevant++;
        console.log(`include  date=unknown  reason=unknown_date_relevant  terms=[${relevanceAudit.terms.join(', ')}]`);
      }

      const scoringText    = [title, ogDesc].join(' ');
      const { score, matchedKeywords } = scoreText(scoringText);
      const effectiveScore = score > 0 ? score : 10;
      const recommendation = buildRecommendation(matchedKeywords);
      const priority       = priorityFromScore(effectiveScore);
      const pubIso         = pubMs && !isNaN(pubMs) ? new Date(pubMs).toISOString() : null;
      const relevanceReason = dateKnown ? 'date_known_and_relevant' : 'unknown_date_relevant';

      yziCandidates.push({
        brief_date:   TODAY,
        source_id:    YZI_SOURCE_ID,
        source_key:   YZI_SOURCE_KEY,
        source_type:  'blog',
        title,
        url:          postUrl,
        summary:      ogDesc.slice(0, 400) || null,
        recommendation,
        priority,
        score:        effectiveScore,
        status:       'candidate',
        occurred_at:  pubIso,
        published_at: pubIso,
        evidence: {
          matched_keywords:    matchedKeywords,
          slug,
          pub_date:            dateResult?.raw ?? null,
          date_source:         dateResult?.source ?? null,
          yzi_relevance_terms: relevanceAudit.terms,
          relevance_reason:    relevanceReason,
        },
        payload: {
          display_name: yziSrc?.display_name ?? 'YZI Labs Blog',
          slug,
        },
      });
    }
  }

  const yziTierC = yziSrc?.config?.tier_c_x_accounts ?? [];
  if (yziTierC.length > 0) {
    console.log(`\n[ajsa-ph-fc] YZI Labs X/Tier C: ${yziTierC.join(', ')} — configured but pending (no X/Nitter fetcher available)`);
  }
}

// ── Y Combinator RSS ingest ───────────────────────────────────────────────────

const ycCandidates = [];
const ycSkipped    = [];
const ycFailures   = [];

{
  const lookbackDays = ycSrc?.config?.lookback_days ?? 7;
  const cutoff       = new Date(Date.now() - lookbackDays * 86400_000);
  const rssUrl       = ycSrc?.config?.rss_url ?? YC_RSS_URL;

  console.log(`\n[ajsa-ph-fc] Y Combinator — ${rssUrl}  lookback=${lookbackDays}d\n`);

  process.stdout.write('  [YC] Fetching RSS ... ');
  const rssResult = await fetchText(rssUrl, { headers: { 'User-Agent': UA } });

  if (!rssResult.ok) {
    console.log(`FAILED (${rssResult.error})`);
    ycFailures.push({ step: 'rss', error: rssResult.error });
  } else {
    const items = parseRssItems(rssResult.data);
    console.log(`${items.length} item(s)`);

    for (const item of items) {
      const title  = item.title ?? '';
      const link   = item.link ?? item.guid ?? '';
      const desc   = item.description ?? '';
      const pubMs  = item.pubDate ? new Date(item.pubDate).getTime() : null;

      if (!title && !link) {
        ycSkipped.push({ reason: 'no_title_or_link' });
        continue;
      }

      if (pubMs && !isNaN(pubMs) && new Date(pubMs) < cutoff) {
        console.log(`  [YC:skip]  "${title.slice(0, 60)}"  reason=before_cutoff  pub=${item.pubDate}`);
        ycSkipped.push({ reason: 'before_cutoff', title, pubDate: item.pubDate });
        continue;
      }

      const scoringText    = [title, desc].join(' ');
      const { score, matchedKeywords } = scoreText(scoringText);
      const effectiveScore = score > 0 ? score : 10;
      const recommendation = buildRecommendation(matchedKeywords);
      const priority       = priorityFromScore(effectiveScore);
      const pubIso         = pubMs && !isNaN(pubMs) ? new Date(pubMs).toISOString() : null;

      console.log(`  [YC]  "${title.slice(0, 60)}"  score=${effectiveScore}  keys=[${matchedKeywords.join(', ')}]`);

      ycCandidates.push({
        brief_date:   TODAY,
        source_id:    YC_SOURCE_ID,
        source_key:   YC_SOURCE_KEY,
        source_type:  'blog',
        title,
        url:          link,
        summary:      desc.slice(0, 400) || null,
        recommendation,
        priority,
        score:        effectiveScore,
        status:       'candidate',
        occurred_at:  pubIso,
        published_at: pubIso,
        evidence: {
          matched_keywords: matchedKeywords,
          pub_date:         item.pubDate ?? null,
          rss_guid:         item.guid ?? null,
        },
        payload: {
          display_name: ycSrc?.display_name ?? 'Y Combinator Blog',
          yc_title:     title,
          yc_link:      link,
        },
      });
    }
  }

  const ycTierC = ycSrc?.config?.tier_c_x_accounts ?? [];
  if (ycTierC.length > 0) {
    console.log(`\n[ajsa-ph-fc] YC X/Tier C: ${ycTierC.join(', ')} — configured but pending (no X/Nitter fetcher available)`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

const allCandidates = [...phCandidates, ...fcCandidates, ...yziCandidates, ...ycCandidates];

console.log(`\n${'─'.repeat(60)}`);
if (phToken) {
  const topicLabel = phStrategyUsed === 'topic_posts' ? `  Topics: ${phTopicSlugsFound.join(', ')}` : '';
  console.log(`  PH  Strategy: ${phStrategyUsed ?? 'N/A'}${topicLabel}`);
  console.log(`      ph_posts_seen=${phPostsSeen}  ph_candidates=${phCandidates.length}`);
  console.log(`      strong_indexed_agent_matches=${phStrongIndexedCount}  ai_agent_relevant_and_votes_matches=${phAiRelevantVotesCount}`);
  console.log(`      weak_indexed_agent_matches_skipped=${phSkippedWeakIndexed}  skipped_not_agent_relevant=${phSkippedNotRelevant}  skipped_weak_indexed_match=${phSkippedWeakIndexed}  skipped_below_vote_threshold=${phSkippedBelowVotes}  failures=${phFailures.length}`);
}
if (neynarKey) {
  const paidTag = fcPaidPlanSkipped.length > 0 ? `  Skipped paid-plan: ${fcPaidPlanSkipped.length}` : '';
  console.log(`  Farcaster  Channels: ${fcChannels.length}  Candidates: ${fcCandidates.length}${paidTag}  No-signal: ${fcSkipped.length}  Failed: ${fcFailures.length}`);
}
console.log(`  YZI Labs   posts_seen=${yziPostsSeen}  candidates=${yziCandidates.length}  skipped_old=${yziSkippedOld}  skipped_unknown_not_relevant=${yziSkippedUnknownDateNotRelevant}  unknown_date_relevant=${yziUnknownDateRelevant}  date_parsed=${yziDateParseSuccess}  date_unknown=${yziDateParseFailed}  failed=${yziFailures.length}`);
console.log(`  YC Blog    Candidates: ${ycCandidates.length}  Skipped: ${ycSkipped.length}  Failed: ${ycFailures.length}`);
console.log(`  Total candidates: ${allCandidates.length}`);
console.log(`${'─'.repeat(60)}\n`);

if (phCandidates.length > 0) {
  console.log('  ── Product Hunt candidates ──');
  for (const c of phCandidates) {
    const ev      = c.evidence;
    const voteTag = ev.ph_votes >= PH_VOTES_THRESHOLD ? `  ${ev.ph_votes}v` : '';
    console.log(`  score=${c.score} / P${c.priority}${voteTag}  qualify="${ev.qualify_reason}"  query="${ev.query}"`);
    console.log(`    title:  ${c.title}`);
    console.log(`    url:    ${c.url}`);
    if (ev.ph_relevance_terms?.length > 0) {
      console.log(`    terms:  [${ev.ph_relevance_terms.join(', ')}]  field=${ev.ph_relevance_field}`);
    }
    if (c.summary) {
      const snip = c.summary.slice(0, 180);
      console.log(`    snip:   ${snip}${c.summary.length > 180 ? '…' : ''}`);
    }
    if (ev.matched_agent_handle || ev.matched_agent_display || ev.matched_package) {
      const qualifyingMatch = ev.qualify_reason === 'strong_indexed_agent_match' || ev.qualify_reason === 'both';
      const matchTag = qualifyingMatch ? '' : '  [weak — not qualifying]';
      const gh  = ev.matched_agent_github  ? `  github=${ev.matched_agent_github}` : '';
      const pkg = ev.matched_package       ? `  package=${ev.matched_package}` : '';
      console.log(`    match:  handle=${ev.matched_agent_handle ?? '—'}  display="${ev.matched_agent_display ?? '—'}"${gh}${pkg}${matchTag}`);
      console.log(`            field=${ev.matched_field}  value="${ev.matched_value}"  type=${ev.exact_match_type}`);
    }
    if (ev.matched_keywords.length > 0) {
      console.log(`    keys:   ${ev.matched_keywords.join(', ')}`);
    }
    console.log(`    action: ${c.recommendation}`);
    console.log('');
  }
} else if (phToken) {
  console.log('  ── Product Hunt candidates: none qualified ──\n');
}

if (fcCandidates.length > 0) {
  console.log('  ── Farcaster candidates ──');
  for (const c of fcCandidates) {
    const likes   = c.evidence.cast_likes;
    const recasts = c.evidence.cast_recasts;
    console.log(`  score=${c.score} / P${c.priority}  /${c.evidence.channel}  @${c.payload.fc_username}  (${likes}♥ ${recasts}↩)`);
    console.log(`    text:   ${c.summary?.slice(0, 100) ?? '(none)'}${(c.summary?.length ?? 0) > 100 ? '…' : ''}`);
    console.log(`    url:    ${c.url}`);
    console.log(`    keys:   ${c.evidence.matched_keywords.join(', ')}`);
    console.log(`    action: ${c.recommendation}`);
    console.log('');
  }
} else if (neynarKey) {
  console.log('  ── Farcaster candidates: none scored above 0 ──\n');
}

if (phFailures.length > 0) {
  console.log('  PH failures:');
  for (const f of phFailures) console.log(`    ✗ "${f.query}": ${f.error}`);
  console.log('');
}
if (fcFailures.length > 0) {
  console.log('  Farcaster failures:');
  for (const f of fcFailures) console.log(`    ✗ /${f.channel}: ${f.error}`);
  console.log('');
}

if (yziCandidates.length > 0) {
  console.log('  ── YZI Labs candidates ──');
  for (const c of yziCandidates) {
    const ev      = c.evidence;
    const dateTag = ev.pub_date
      ? `${ev.pub_date.slice(0, 10)} (${ev.date_source})`
      : 'unknown';
    console.log(`  score=${c.score} / P${c.priority}  date=${dateTag}`);
    console.log(`    title:  ${c.title}`);
    console.log(`    url:    ${c.url}`);
    if (ev.yzi_relevance_terms?.length > 0) {
      console.log(`    terms:  [${ev.yzi_relevance_terms.join(', ')}]  reason=${ev.relevance_reason}`);
    }
    if (c.summary) {
      const snip = c.summary.slice(0, 180);
      console.log(`    snip:   ${snip}${c.summary.length > 180 ? '…' : ''}`);
    }
    if (ev.matched_keywords.length > 0) {
      console.log(`    keys:   ${ev.matched_keywords.join(', ')}`);
    }
    console.log(`    action: ${c.recommendation}`);
    console.log('');
  }
} else {
  console.log('  ── YZI Labs candidates: none ──\n');
}

if (ycCandidates.length > 0) {
  console.log('  ── Y Combinator candidates ──');
  for (const c of ycCandidates) {
    const ev = c.evidence;
    console.log(`  score=${c.score} / P${c.priority}  pub=${ev.pub_date ?? 'unknown'}`);
    console.log(`    title:  ${c.title}`);
    console.log(`    url:    ${c.url}`);
    if (c.summary) {
      const snip = c.summary.slice(0, 180);
      console.log(`    snip:   ${snip}${c.summary.length > 180 ? '…' : ''}`);
    }
    if (ev.matched_keywords.length > 0) {
      console.log(`    keys:   ${ev.matched_keywords.join(', ')}`);
    }
    console.log(`    action: ${c.recommendation}`);
    console.log('');
  }
} else {
  console.log('  ── Y Combinator candidates: none ──\n');
}

if (yziFailures.length > 0) {
  console.log('  YZI failures:');
  for (const f of yziFailures) console.log(`    ✗ ${f.step}${f.slug ? ' ' + f.slug : ''}: ${f.error}`);
  console.log('');
}
if (ycFailures.length > 0) {
  console.log('  YC failures:');
  for (const f of ycFailures) console.log(`    ✗ ${f.step}: ${f.error}`);
  console.log('');
}

// ── Dry-run exit ──────────────────────────────────────────────────────────────

if (isDryRun) {
  console.log(`[ajsa-ph-fc] DRY RUN complete. ${allCandidates.length} candidate(s) (${phCandidates.length} PH + ${fcCandidates.length} FC + ${yziCandidates.length} YZI + ${ycCandidates.length} YC). No changes made.`);
  process.exit(0);
}

// ── Write ─────────────────────────────────────────────────────────────────────

console.log(`[ajsa-ph-fc] Writing ${allCandidates.length} candidate(s) ...`);

let written     = 0;
let writeErrors = 0;

for (const item of allCandidates) {
  const { data: existing, error: selectErr } = await supabase
    .from('ajsa_brief_items')
    .select('id')
    .eq('brief_date', item.brief_date)
    .eq('source_key', item.source_key)
    .eq('url', item.url)
    .maybeSingle();

  if (selectErr) {
    console.error(`  [ERROR] ${item.source_key} (lookup): ${selectErr.message}`);
    writeErrors++;
    continue;
  }

  const shortTitle = item.title?.slice(0, 55) ?? '?';
  const tag        = item.source_key === PH_SOURCE_KEY  ? 'PH'
                   : item.source_key === FC_SOURCE_KEY  ? 'FC'
                   : item.source_key === YZI_SOURCE_KEY ? 'YZI'
                   : item.source_key === YC_SOURCE_KEY  ? 'YC'
                   : item.source_key.toUpperCase().slice(0, 4);

  if (existing?.id) {
    const { source_id, brief_date, source_key, url, ...updateFields } = item;
    const { error: updateErr } = await supabase
      .from('ajsa_brief_items')
      .update(updateFields)
      .eq('id', existing.id);
    if (updateErr) {
      console.error(`  [ERROR] ${item.source_key} (update): ${updateErr.message}`);
      writeErrors++;
      continue;
    }
    console.log(`  [${tag}:UPDATED]  "${shortTitle}"  score=${item.score} / P${item.priority}`);
  } else {
    const { error: insertErr } = await supabase.from('ajsa_brief_items').insert(item);
    if (insertErr) {
      console.error(`  [ERROR] ${item.source_key} (insert): ${insertErr.message}`);
      writeErrors++;
      continue;
    }
    console.log(`  [${tag}:WRITTEN]  "${shortTitle}"  score=${item.score} / P${item.priority}`);
  }

  written++;
}

// Update source timestamps
if (phToken && phSrc) {
  const allPhFailed = phFailures.length > 0 && phFailures.length === phQueries.length;
  await supabase.from('ajsa_sources').update({
    last_checked_at: NOW_ISO,
    ...(allPhFailed
      ? { last_error_at: NOW_ISO, last_error: `All ${phQueries.length} PH queries failed` }
      : { last_success_at: NOW_ISO, last_error_at: null, last_error: null }
    ),
  }).eq('id', PH_SOURCE_ID);
}

if (neynarKey && fcSrc) {
  const allFcFailed       = fcFailures.length > 0 && fcFailures.length === fcChannels.length;
  const allFcPaidPlanOnly = fcPaidPlanSkipped.length > 0 && fcFailures.length === 0;
  // Plan-gated skips are not a runtime failure — leave timestamps unchanged
  if (!allFcPaidPlanOnly) {
    await supabase.from('ajsa_sources').update({
      last_checked_at: NOW_ISO,
      ...(allFcFailed
        ? { last_error_at: NOW_ISO, last_error: `All ${fcChannels.length} Farcaster channels failed` }
        : { last_success_at: NOW_ISO, last_error_at: null, last_error: null }
      ),
    }).eq('id', FC_SOURCE_ID);
  }
}

if (yziSrc) {
  const yziListingFailed = yziFailures.some(f => f.step === 'listing');
  await supabase.from('ajsa_sources').update({
    last_checked_at: NOW_ISO,
    ...(yziListingFailed
      ? { last_error_at: NOW_ISO, last_error: 'YZI listing page fetch failed' }
      : { last_success_at: NOW_ISO, last_error_at: null, last_error: null }
    ),
  }).eq('id', YZI_SOURCE_ID);
}

if (ycSrc) {
  const ycRssFailed = ycFailures.some(f => f.step === 'rss');
  await supabase.from('ajsa_sources').update({
    last_checked_at: NOW_ISO,
    ...(ycRssFailed
      ? { last_error_at: NOW_ISO, last_error: 'YC RSS fetch failed' }
      : { last_success_at: NOW_ISO, last_error_at: null, last_error: null }
    ),
  }).eq('id', YC_SOURCE_ID);
}

console.log(`\n[ajsa-ph-fc] Done. Written: ${written}  Errors: ${writeErrors}`);
