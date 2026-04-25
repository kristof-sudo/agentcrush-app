/**
 * Reddit mention signal worker — dry-run v1.
 *
 * Modes:
 *   --dry-run    (required) Scan Reddit for high_auto package mentions, print candidates.
 *   --write      REFUSED — not implemented in v1. Will exit with an error.
 *
 * Source:
 *   Public Reddit JSON search endpoint (unauthenticated).
 *   https://www.reddit.com/r/{subreddit}/search.json
 *     ?q={package_name}&restrict_sr=true&sort=relevance&t=month&limit=25
 *
 * Queries:
 *   Only package_name values from agent_package_mapping_latest WHERE
 *   mapping_status='high_auto' AND confidence >= 95.
 *   --limit N  caps how many package mappings are processed (default 10, max 100).
 *
 * Subreddits:
 *   Default: LocalLLaMA, AI_Agents
 *   Override: --subreddits Sub1,Sub2
 *
 * Never writes to any table.
 * Never prints secrets, tokens, or keys.
 *
 * Risky packages:
 *   'swarms' — requires project-context validation (docker swarms, bee swarms, etc.)
 *   All others: package name (including normalized hyphen/space forms) in title or body.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const ENV_PATHS = [
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

const DEFAULT_LIMIT      = 10;
const MAX_LIMIT          = 100;
const DEFAULT_SUBREDDITS = ['LocalLLaMA', 'AI_Agents'];
const REDDIT_BASE        = 'https://www.reddit.com';
const REDDIT_OAUTH_BASE  = 'https://oauth.reddit.com';
const REDDIT_TOKEN_URL   = 'https://www.reddit.com/api/v1/access_token';
// Reddit requires a descriptive User-Agent for OAuth apps.
const USER_AGENT         = 'AgentCrush-Reddit-Mention-Worker/1.0 (by AgentCrush; +https://agentcrush.com)';
const REDDIT_DELAY_MS    = 2000;
const RESULTS_PER_QUERY  = 25;

// Token cache (one token good for 1 hour; refreshed 60s early).
let _cachedToken  = null;
let _tokenExpiry  = 0;

// Packages requiring per-term context validation beyond simple text presence.
const RISKY_PACKAGES = new Set(['swarms']);

// ─── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dryRun:     false,
    limit:      DEFAULT_LIMIT,
    subreddits: [...DEFAULT_SUBREDDITS],
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') { args.dryRun = true; continue; }

    if (arg === '--write') {
      throw new Error(
        '--write is not supported in Reddit worker v1. ' +
        'No DB table exists yet. This is a dry-run-only tool. ' +
        'Run with --dry-run to scan and review results.'
      );
    }

    if (arg === '--limit') {
      const raw = argv[i + 1];
      if (!raw) throw new Error('Missing value for --limit');
      args.limit = parseLimit(raw);
      i++;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      args.limit = parseLimit(arg.slice('--limit='.length));
      continue;
    }

    if (arg === '--subreddits') {
      const raw = argv[i + 1];
      if (!raw) throw new Error('Missing value for --subreddits');
      args.subreddits = raw.split(',').map(s => s.trim()).filter(Boolean);
      i++;
      continue;
    }
    if (arg.startsWith('--subreddits=')) {
      args.subreddits = arg.slice('--subreddits='.length)
        .split(',').map(s => s.trim()).filter(Boolean);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.dryRun) {
    throw new Error(
      '--dry-run is required. Reddit worker v1 is dry-run-only.\n' +
      'Usage: reddit-mentions-worker.mjs --dry-run [--limit N] [--subreddits Sub1,Sub2]'
    );
  }
  if (args.subreddits.length === 0) {
    throw new Error('--subreddits list resolved to empty. Provide at least one subreddit name.');
  }

  return args;
}

function parseLimit(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) throw new Error('--limit must be a positive integer');
  return Math.min(n, MAX_LIMIT);
}

// ─── Env loading ──────────────────────────────────────────────────────────────

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

async function loadEnvFiles(paths) {
  for (const path of paths) {
    try {
      const text = await fs.readFile(path, 'utf8');
      for (const [key, value] of Object.entries(parseEnv(text))) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional — files vary by deployment.
    }
  }
}

// ─── Supabase reads (read-only) ───────────────────────────────────────────────

async function fetchHighAutoMappings(supabase, limit) {
  const { data, error } = await supabase
    .from('agent_package_mapping_latest')
    .select('agent_id, registry, package_name, confidence, github_full_name')
    .eq('mapping_status', 'high_auto')
    .gte('confidence', 95)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function fetchAgentsByIds(supabase, agentIds) {
  if (agentIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('agents')
    .select('id, handle, display_name, github_full_name')
    .in('id', agentIds);
  if (error) throw error;
  const map = new Map();
  for (const a of (data || [])) {
    map.set(a.id, {
      handle:           a.handle           ?? null,
      display_name:     a.display_name     ?? null,
      github_full_name: a.github_full_name ?? null,
      label:            a.handle ?? a.display_name ?? a.id.slice(0, 8),
    });
  }
  return map;
}

// ─── Text utilities ───────────────────────────────────────────────────────────

function cleanText(value) {
  return String(value || '').trim();
}

// All normalized forms to search for in post text.
//   camel-ai      → ['camel-ai', 'camel ai', 'camelai']
//   open-interpreter → ['open-interpreter', 'open interpreter', 'openinterpreter']
//   sweepai       → ['sweepai']
//   dspy          → ['dspy']
function packageForms(packageName) {
  const lower = packageName.toLowerCase();
  const forms = new Set([lower]);
  if (lower.includes('-')) {
    forms.add(lower.replace(/-+/g, ' '));  // hyphen → space
    forms.add(lower.replace(/-+/g, ''));   // hyphen → nothing
  }
  return [...forms];
}

// Checks whether any word-boundary occurrence of token exists.
// Prevents 'dspy' matching 'dspyagents', etc.
function textHasToken(text, token) {
  if (!token) return false;
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'i').test(text);
}

function cleanSelftext(raw) {
  const t = cleanText(raw);
  if (t === '[removed]' || t === '[deleted]') return '';
  return t;
}

function selfTextWasRemoved(raw) {
  const t = cleanText(raw);
  return t === '[removed]' || t === '[deleted]';
}

// Full searchable text of a post (title + cleaned selftext + url).
function postFullText(post) {
  return [
    cleanText(post.title),
    cleanSelftext(post.selftext),
    cleanText(post.url),
  ].join(' ').toLowerCase();
}

// Title + url only (more reliable, used for risky-package decisions).
function postTitleUrl(post) {
  return `${cleanText(post.title)} ${cleanText(post.url)}`.toLowerCase();
}

// ─── Risky-package validators ─────────────────────────────────────────────────
// Adapted from hn-mentions-worker.mjs validateRiskyTerm().
// Called only when the package forms are already confirmed present in title/url.

function validateRiskyPackage(packageName, titleUrl, fullText) {
  const combined = titleUrl + ' ' + fullText;

  switch (packageName) {
    case 'swarms':
      // Reject clearly non-project uses.
      if (/docker\s+swarm|drone\s+swarm|robot\s+swarm|submarine\s+swarm|insect\s+swarm|bee\s+swarm|particle\s+swarm/i.test(combined)) {
        return { relevant: false, reason: 'swarms: non-project context (docker/drone/bee/particle swarms)' };
      }
      // Confirm Swarms AI / kyegomez/swarms project context.
      if (/swarms?\s+ai|kyegomez\/swarms?|openai\s+swarms?|swarms\s+framework|pip\s+install\s+swarms/i.test(combined)) {
        return { relevant: true, reason: 'Swarms AI: project context confirmed (swarms ai / kyegomez/swarms / pip install)' };
      }
      return { relevant: false, reason: 'swarms: no Swarms AI / kyegomez/swarms project context confirmed' };

    default:
      return { relevant: true, reason: `${packageName}: risky package confirmed in title` };
  }
}

// ─── Relevance model ──────────────────────────────────────────────────────────

// Returns { relevant, reason, selfTextRemoved }
function isRelevantPost(post, mapping, agentInfo) {
  const { package_name, github_full_name: mappingGithub } = mapping;
  const agentGithub  = agentInfo?.github_full_name || mappingGithub || null;
  const selfRemoved  = selfTextWasRemoved(post.selftext);
  const fullText     = postFullText(post);
  const titleUrl     = postTitleUrl(post);

  // Strong match: full github_full_name (owner/repo) anywhere in text.
  if (agentGithub && fullText.includes(agentGithub.toLowerCase())) {
    return { relevant: true, reason: 'github_full_name match', selfTextRemoved: selfRemoved };
  }

  const forms        = packageForms(package_name);
  const matchInTitle = forms.find(f => titleUrl.includes(f));
  const matchInBody  = forms.find(f => fullText.includes(f));

  // No form found at all — Reddit returned a false-positive from its own search index.
  if (!matchInTitle && !matchInBody) {
    return {
      relevant: false,
      reason:   `${package_name}: no package form found in post (Reddit search false positive)`,
      selfTextRemoved: selfRemoved,
    };
  }

  // Risky packages: must appear in title AND pass the context validator.
  if (RISKY_PACKAGES.has(package_name.toLowerCase())) {
    if (!matchInTitle) {
      return {
        relevant: false,
        reason:   `${package_name} (risky): found only in body, not title — context not confirmed`,
        selfTextRemoved: selfRemoved,
      };
    }
    const validation = validateRiskyPackage(package_name.toLowerCase(), titleUrl, fullText);
    return { ...validation, selfTextRemoved: selfRemoved };
  }

  // Standard packages: any form in title or body → relevant.
  const matchedForm = matchInTitle ?? matchInBody;
  const location    = matchInTitle ? 'post title' : 'post body';
  return {
    relevant:        true,
    reason:          `package "${matchedForm}" in ${location}`,
    selfTextRemoved: selfRemoved,
  };
}

// ─── Reddit OAuth ─────────────────────────────────────────────────────────────

// Obtains and caches a Reddit OAuth2 bearer token using client credentials.
// Reddit's rate limit for OAuth apps: 100 req/min (vs ~10 req/min unauthenticated).
// VPS/datacenter IPs are blocked by Reddit for unauthenticated requests; OAuth bypasses this.
async function getRedditToken(clientId, clientSecret) {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  let res;
  try {
    res = await fetch(REDDIT_TOKEN_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent':    USER_AGENT,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
  } catch (err) {
    throw new Error(`Reddit token request network error: ${err.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Reddit OAuth token request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Reddit OAuth response missing access_token: ${JSON.stringify(data).slice(0, 200)}`);
  }

  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000;
  return _cachedToken;
}

// ─── Reddit API ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchRedditPosts(subreddit, query, stats, oauthToken) {
  const base = oauthToken ? REDDIT_OAUTH_BASE : REDDIT_BASE;
  const url  = new URL(`${base}/r/${subreddit}/search.json`);
  url.searchParams.set('q',            query);
  url.searchParams.set('restrict_sr',  'true');
  url.searchParams.set('sort',         'relevance');
  url.searchParams.set('t',            'month');
  url.searchParams.set('limit',        String(RESULTS_PER_QUERY));

  const headers = {
    'Accept':     'application/json',
    'User-Agent': USER_AGENT,
  };
  if (oauthToken) headers['Authorization'] = `Bearer ${oauthToken}`;

  stats.redditRequests++;

  let res;
  try {
    res = await fetch(url.toString(), { headers });
  } catch (err) {
    stats.fetchErrors.push(`network error r/${subreddit} q="${query}": ${err.message}`);
    return [];
  }

  if (res.status === 429 || res.status === 503) {
    const retryAfter = res.headers.get('Retry-After');
    const wait       = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 60_000;
    console.warn(`  [rate-limit] r/${subreddit} "${query}" — waiting ${Math.round(wait / 1000)}s then retrying…`);
    stats.rateLimitOrBlockErrors++;
    await sleep(wait);
    try {
      res = await fetch(url.toString(), { headers });
    } catch (err) {
      stats.fetchErrors.push(`retry network error r/${subreddit} q="${query}": ${err.message}`);
      return [];
    }
  }

  if (res.status === 403) {
    if (!oauthToken) {
      console.warn(`  [blocked] r/${subreddit} 403 — Reddit blocks VPS IPs for unauthenticated requests.`);
      console.warn(`           Set REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET in scanner/.env to use OAuth.`);
    } else {
      console.warn(`  [blocked] r/${subreddit} 403 — check OAuth credentials and app permissions.`);
    }
    stats.rateLimitOrBlockErrors++;
    return [];
  }

  if (!res.ok) {
    stats.fetchErrors.push(`HTTP ${res.status} for r/${subreddit} q="${query}"`);
    return [];
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    stats.fetchErrors.push(`JSON parse error r/${subreddit} q="${query}": ${err.message}`);
    return [];
  }

  return (data?.data?.children ?? []).map(c => c.data);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  await loadEnvFiles(ENV_PATHS);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // ── Reddit auth ────────────────────────────────────────────────────────────
  // OAuth2 client credentials: required for VPS deployments (Reddit blocks
  // unauthenticated requests from datacenter IPs). Register a "script" app at
  // https://www.reddit.com/prefs/apps then set REDDIT_CLIENT_ID and
  // REDDIT_CLIENT_SECRET in /opt/agentcrush/scanner/.env.
  const redditClientId     = process.env.REDDIT_CLIENT_ID     ?? null;
  const redditClientSecret = process.env.REDDIT_CLIENT_SECRET ?? null;
  let   oauthToken         = null;

  if (redditClientId && redditClientSecret) {
    console.log('Authenticating with Reddit OAuth (client credentials)…');
    try {
      oauthToken = await getRedditToken(redditClientId, redditClientSecret);
      console.log('Reddit OAuth token obtained.');
    } catch (err) {
      console.error(`Reddit OAuth error: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.warn('Warning: REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET not set.');
    console.warn('Attempting public JSON endpoint — note that Reddit blocks VPS/datacenter IPs');
    console.warn('for unauthenticated requests. Expect 403 errors without credentials.');
    console.warn('Register an app at https://www.reddit.com/prefs/apps to get credentials.');
  }

  console.log('Loading high_auto package mappings…');
  const mappings = await fetchHighAutoMappings(supabase, args.limit);
  console.log(`Loaded ${mappings.length} high_auto mapping(s) (limit=${args.limit}).`);

  const agentIds = [...new Set(mappings.map(m => m.agent_id).filter(Boolean))];
  const agentMap = await fetchAgentsByIds(supabase, agentIds);
  console.log(`Loaded agent metadata for ${agentMap.size} agent(s).`);
  console.log(`Subreddits: ${args.subreddits.join(', ')}`);
  console.log(`Delay between requests: ${REDDIT_DELAY_MS}ms`);
  console.log('');

  const stats = {
    redditRequests:       0,
    postsEvaluated:       0,
    skippedLowScore:      0,
    selfTextRemovedCount: 0,
    relevantHits:         0,
    falsePositiveWarns:   [],
    fetchErrors:          [],
    rateLimitOrBlockErrors: 0,
  };

  // Dedup key: subreddit|postId|agentId — prevents double-counting if same post
  // surfaces across multiple query forms for the same mapping.
  const seen    = new Set();
  const allHits = [];

  for (const mapping of mappings) {
    const agentInfo = agentMap.get(mapping.agent_id);
    const label     = agentInfo?.label ?? mapping.agent_id?.slice(0, 8) ?? '?';

    process.stdout.write(`  [${mapping.registry}/${mapping.package_name}] (${label}) `);

    let mappingHits = 0;

    for (const subreddit of args.subreddits) {
      const posts = await fetchRedditPosts(subreddit, mapping.package_name, stats, oauthToken);
      await sleep(REDDIT_DELAY_MS);

      for (const post of posts) {
        stats.postsEvaluated++;

        const score = Number(post.score ?? 0);
        if (score < 1) {
          stats.skippedLowScore++;
          continue;
        }

        const dedupKey = `${subreddit}|${post.id}|${mapping.agent_id}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const verdict = isRelevantPost(post, mapping, agentInfo);
        if (verdict.selfTextRemoved) stats.selfTextRemovedCount++;

        if (verdict.relevant) {
          mappingHits++;
          stats.relevantHits++;
          allHits.push({
            agentLabel:      label,
            agentHandle:     agentInfo?.handle       ?? null,
            agentDisplay:    agentInfo?.display_name ?? null,
            registry:        mapping.registry,
            packageName:     mapping.package_name,
            subreddit,
            postId:          post.id,
            title:           cleanText(post.title),
            score,
            numComments:     Number(post.num_comments ?? 0),
            strength:        score + Number(post.num_comments ?? 0),
            permalink:       `${REDDIT_BASE}${cleanText(post.permalink)}`,
            author:          cleanText(post.author),
            createdUtc:      post.created_utc
              ? new Date(Number(post.created_utc) * 1000).toISOString()
              : null,
            relevanceReason: verdict.reason,
          });
        } else if (cleanText(post.title)) {
          stats.falsePositiveWarns.push({
            packageName: mapping.package_name,
            subreddit,
            title:       cleanText(post.title),
            reason:      verdict.reason,
          });
        }
      }

      process.stdout.write(`r/${subreddit}=${mappingHits} `);
    }

    process.stdout.write('\n');
  }

  // ─── Summary report ──────────────────────────────────────────────────────────

  const topHits = allHits.slice().sort((a, b) => b.strength - a.strength).slice(0, 20);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Reddit Mention Worker — DRY-RUN');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  mode:                       dry-run`);
  console.log(`  subreddits_checked:         ${args.subreddits.join(', ')}`);
  console.log(`  package_mappings_checked:   ${mappings.length}`);
  console.log(`  reddit_requests:            ${stats.redditRequests}`);
  console.log(`  posts_evaluated:            ${stats.postsEvaluated}`);
  console.log(`  skipped_low_score:          ${stats.skippedLowScore}`);
  console.log(`  skipped_removed_or_deleted: ${stats.selfTextRemovedCount}`);
  console.log(`  relevant_hits_found:        ${stats.relevantHits}`);
  console.log(`  false_positive_warnings:    ${stats.falsePositiveWarns.length}`);
  console.log(`  fetch_errors:               ${stats.fetchErrors.length}`);
  console.log(`  rate_limit_or_block_errors: ${stats.rateLimitOrBlockErrors}`);
  console.log('');

  if (topHits.length > 0) {
    console.log('  Top relevant hits (by strength = score + comments):');
    console.log('  ─────────────────────────────────────────────────────────────');
    for (const h of topHits) {
      const agentLabel = h.agentHandle
        ? `${h.agentHandle}${h.agentDisplay && h.agentDisplay !== h.agentHandle ? ` / ${h.agentDisplay}` : ''}`
        : h.agentLabel;
      console.log(`  [${h.registry}/${h.packageName}]  agent: ${agentLabel}  r/${h.subreddit}`);
      console.log(`    title:     ${h.title.slice(0, 110)}`);
      console.log(`    score=${h.score}  comments=${h.numComments}  strength=${h.strength}`);
      console.log(`    reason:    ${h.relevanceReason}`);
      console.log(`    date:      ${h.createdUtc ?? '-'}`);
      console.log(`    permalink: ${h.permalink}`);
      console.log('');
    }
  } else {
    console.log('  No relevant hits found.');
    console.log('');
  }

  if (stats.falsePositiveWarns.length > 0) {
    const shown = stats.falsePositiveWarns.slice(0, 15);
    console.log(`  False-positive warnings (${stats.falsePositiveWarns.length} total, showing first ${shown.length}):`);
    console.log('  ─────────────────────────────────────────────────────────────');
    for (const w of shown) {
      console.log(`  [${w.packageName}] r/${w.subreddit}  reason: ${w.reason}`);
      console.log(`    title: ${w.title.slice(0, 110)}`);
    }
    console.log('');
  } else {
    console.log('  False-positive warnings: none.');
    console.log('');
  }

  if (stats.fetchErrors.length > 0) {
    console.log('  Fetch errors:');
    for (const e of stats.fetchErrors) console.log(`  ✗  ${e}`);
    console.log('');
  }

  if (stats.rateLimitOrBlockErrors > 0) {
    console.log(`  Rate-limit/block events: ${stats.rateLimitOrBlockErrors} (see warnings above)`);
    console.log('');
  }

  console.log('  No writes made. Dry-run complete.');
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err.message ?? err);
  process.exit(1);
});
