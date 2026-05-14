/**
 * A2A (Agent-to-Agent Protocol) external activity crawler — v0
 *
 * Discovers GitHub repos that declare A2A protocol support via:
 *   a) GitHub topic search (a2a-protocol, agent2agent, agent-to-agent, a2a, agent-protocol)
 *   b) Dependency search via GitHub code search (@google/a2a-sdk, @a2a-project) — requires GITHUB_TOKEN
 *   c) Description keyword search ("A2A protocol")
 *
 * For each discovered repo, fetches details, computes a heuristic
 * `signal_strength` (0..100), and upserts into `a2a_agents` keyed on
 * `repo_full_name`.
 *
 * v0 scope: GitHub discovery only.
 * v1 (deferred): live endpoint pinging (agent-card.json fetches).
 *
 * Usage:
 *   node runtime/a2a-crawler.mjs --dry-run            # fetch + print summary, no DB writes
 *   node runtime/a2a-crawler.mjs --write              # upsert into Supabase
 *   node runtime/a2a-crawler.mjs --dry-run --max 50   # cap total discoveries
 *
 * Idempotent: unique on repo_full_name. Re-runs bump last_seen_at and
 * overwrite the normalized columns.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (write mode only)
 *   GITHUB_TOKEN                             (optional but strongly recommended;
 *                                             required for code-search strategy)
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');
const maxIdx = args.indexOf('--max');
const MAX_ITEMS = maxIdx !== -1 ? (parseInt(args[maxIdx + 1], 10) || Infinity) : Infinity;

if (!isDryRun && !isWrite) {
  console.error('[a2a-crawler] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[a2a-crawler] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[a2a-crawler] Mode: ${MODE}`);
if (MAX_ITEMS !== Infinity) console.log(`[a2a-crawler] Capping at ${MAX_ITEMS} items`);

// ── Env loading ───────────────────────────────────────────────────────────────

const ENV_CANDIDATES = [
  '/opt/agentcrush/selector/.env',
  '/opt/agentcrush/briefing/.env',
  '/opt/agentcrush/copydesk/.env',
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
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
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
    if (parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`[a2a-crawler] Loaded env from ${envPath}`);
      return;
    }
  }
  // best-effort — non-fatal in dry-run
}

await loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
console.log(`[a2a-crawler] GitHub auth: ${GITHUB_TOKEN ? 'token present' : 'unauthenticated (rate-limited to ~30 req/hour)'}`);

let supabase = null;
if (isWrite) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[a2a-crawler] ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Bare `a2a` topic dropped (Kris call 2026-05-14) — too broad, picked up
// unrelated repos in v0 dry-run. Keeping more specific topics that signal
// real protocol intent.
const TOPICS = ['a2a-protocol', 'agent2agent', 'agent-to-agent', 'agent-protocol'];
const DEP_QUERIES = ['@google/a2a-sdk', '@a2a-project'];
const RATE_LIMIT_MS = 1000; // 1 req/sec, gentle on GitHub

// ── Helpers ───────────────────────────────────────────────────────────────────

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
  return out;
}

function hashPayload(obj) {
  const canonical = JSON.stringify(canonicalize(obj));
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ghHeaders() {
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'agentcrush-a2a-crawler/0.1',
  };
  if (GITHUB_TOKEN) h.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

async function ghFetch(url) {
  await sleep(RATE_LIMIT_MS);
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new Error(`GitHub rate-limited (status ${res.status}, remaining=${remaining}, reset=${reset}) on ${url}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub HTTP ${res.status} on ${url} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ── Signal strength heuristic ────────────────────────────────────────────────

function computeSignalStrength({ stars = 0, pushedAt = null, matchCount = 1, hasHomepage = false }) {
  // Base: stars clamped to ~0..50 via log scale
  const starsBase = Math.min(50, Math.round(Math.log10(Math.max(1, stars + 1)) * 18));
  let score = starsBase;
  // Recency boost (pushed within last 30 days)
  if (pushedAt) {
    const ageDays = (Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) score += 20;
    else if (ageDays <= 90) score += 10;
  }
  // Multi-signal corroboration: +10 per additional matched method beyond the first
  if (matchCount > 1) score += 10 * (matchCount - 1);
  // Homepage signal
  if (hasHomepage) score += 10;
  return Math.max(0, Math.min(100, score));
}

// ── Discovery strategies ──────────────────────────────────────────────────────

async function discoverByTopics() {
  const found = new Map(); // repo_full_name -> { repo, methods:Set }
  for (const topic of TOPICS) {
    const method = `topic:${topic}`;
    try {
      const url = `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}&per_page=100&sort=updated`;
      const body = await ghFetch(url);
      const items = Array.isArray(body.items) ? body.items : [];
      console.log(`[a2a-crawler] topic ${topic}: ${items.length} hits`);
      for (const repo of items) {
        const key = repo.full_name;
        if (!key) continue;
        if (!found.has(key)) found.set(key, { repo, methods: new Set([method]) });
        else found.get(key).methods.add(method);
      }
    } catch (err) {
      console.warn(`[a2a-crawler] topic search '${topic}' failed: ${err.message}`);
    }
  }
  return found;
}

async function discoverByDependency() {
  const found = new Map();
  if (!GITHUB_TOKEN) {
    console.warn('[a2a-crawler] Skipping dependency search — GITHUB_TOKEN required for code search.');
    return found;
  }
  for (const dep of DEP_QUERIES) {
    const method = `dep:${dep}`;
    try {
      const q = `"${dep}" filename:package.json`;
      const url = `https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=100`;
      const body = await ghFetch(url);
      const items = Array.isArray(body.items) ? body.items : [];
      console.log(`[a2a-crawler] dep ${dep}: ${items.length} code hits`);
      for (const codeHit of items) {
        const repo = codeHit.repository;
        const key = repo?.full_name;
        if (!key) continue;
        if (!found.has(key)) found.set(key, { repo, methods: new Set([method]) });
        else found.get(key).methods.add(method);
      }
    } catch (err) {
      console.warn(`[a2a-crawler] dep search '${dep}' failed: ${err.message}`);
    }
  }
  return found;
}

async function discoverByDescription() {
  const found = new Map();
  const method = 'description-keyword';
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent('"A2A protocol" in:description')}&per_page=100&sort=updated`;
    const body = await ghFetch(url);
    const items = Array.isArray(body.items) ? body.items : [];
    console.log(`[a2a-crawler] description "A2A protocol": ${items.length} hits`);
    for (const repo of items) {
      const key = repo.full_name;
      if (!key) continue;
      if (!found.has(key)) found.set(key, { repo, methods: new Set([method]) });
      else found.get(key).methods.add(method);
    }
  } catch (err) {
    console.warn(`[a2a-crawler] description search failed: ${err.message}`);
  }
  return found;
}

// Merge discovery maps (preserves the FIRST repo payload seen but unions methods).
function mergeFindings(maps) {
  // Order matters for "first-matched" discovery_method. We process in given order.
  const merged = new Map();
  for (const m of maps) {
    for (const [key, val] of m.entries()) {
      if (!merged.has(key)) {
        merged.set(key, { repo: val.repo, methods: new Set(val.methods) });
      } else {
        const cur = merged.get(key);
        for (const meth of val.methods) cur.methods.add(meth);
        // Prefer the search-API repo payload (topic/desc) over code-search payload
        // which lacks full fields. Replace if current is sparse.
        if (cur.repo && typeof cur.repo.stargazers_count !== 'number' && typeof val.repo.stargazers_count === 'number') {
          cur.repo = val.repo;
        }
      }
    }
  }
  return merged;
}

// Fetch full repo details if the payload is sparse (e.g. came from code search).
async function ensureFullRepo(repo) {
  if (repo && typeof repo.stargazers_count === 'number' && typeof repo.pushed_at === 'string') {
    return repo;
  }
  if (!repo?.full_name) return repo;
  try {
    const url = `https://api.github.com/repos/${repo.full_name}`;
    return await ghFetch(url);
  } catch (err) {
    console.warn(`[a2a-crawler] failed to enrich ${repo.full_name}: ${err.message}`);
    return repo;
  }
}

// ── Normalize ────────────────────────────────────────────────────────────────

function pickFirstMethod(methods) {
  // Priority ordering: topic > dep > description-keyword
  const order = [
    ...TOPICS.map((t) => `topic:${t}`),
    ...DEP_QUERIES.map((d) => `dep:${d}`),
    'description-keyword',
  ];
  for (const m of order) if (methods.has(m)) return m;
  // fallback: first in the set
  return methods.values().next().value;
}

function normalize(repo, methods) {
  const stars = typeof repo.stargazers_count === 'number' ? repo.stargazers_count : null;
  const forks = typeof repo.forks_count === 'number' ? repo.forks_count : null;
  const homepage = repo.homepage && repo.homepage.trim() !== '' ? repo.homepage : null;
  const signal = computeSignalStrength({
    stars: stars ?? 0,
    pushedAt: repo.pushed_at ?? null,
    matchCount: methods.size,
    hasHomepage: !!homepage,
  });
  return {
    repo_full_name: repo.full_name,
    repo_url: repo.html_url || `https://github.com/${repo.full_name}`,
    name: repo.name ?? null,
    owner: repo.owner?.login ?? (repo.full_name?.split('/')[0] ?? null),
    description: repo.description ?? null,
    stars,
    forks,
    language: repo.language ?? null,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    homepage_url: homepage,
    discovery_method: pickFirstMethod(methods),
    last_pushed_at: repo.pushed_at ?? null,
    signal_strength: signal,
    raw_payload: repo,
    payload_hash: hashPayload(repo),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[a2a-crawler] Discovery phase…');
  const t0 = Date.now();

  const byTopic = await discoverByTopics();
  const byDep = await discoverByDependency();
  const byDesc = await discoverByDescription();

  const merged = mergeFindings([byTopic, byDep, byDesc]);
  let entries = Array.from(merged.values());
  if (entries.length > MAX_ITEMS) entries = entries.slice(0, MAX_ITEMS);

  console.log(`[a2a-crawler] Merged unique repos: ${entries.length}`);
  console.log(`  - topic hits:       ${byTopic.size}`);
  console.log(`  - dep hits:         ${byDep.size}`);
  console.log(`  - description hits: ${byDesc.size}`);

  // Enrich sparse repos (mainly from code-search)
  const enriched = [];
  for (const { repo, methods } of entries) {
    const full = await ensureFullRepo(repo);
    enriched.push({ repo: full, methods });
  }

  const records = enriched.map(({ repo, methods }) => normalize(repo, methods))
    .filter((r) => !!r.repo_full_name);

  // Signal distribution
  const buckets = { '0-19': 0, '20-39': 0, '40-59': 0, '60-79': 0, '80-100': 0 };
  for (const r of records) {
    const s = r.signal_strength ?? 0;
    if (s < 20) buckets['0-19']++;
    else if (s < 40) buckets['20-39']++;
    else if (s < 60) buckets['40-59']++;
    else if (s < 80) buckets['60-79']++;
    else buckets['80-100']++;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[a2a-crawler] Discovery complete in ${elapsed}s — ${records.length} records`);
  console.log(`[a2a-crawler] signal_strength distribution: ${JSON.stringify(buckets)}`);

  if (isDryRun) {
    const sample = records
      .slice()
      .sort((a, b) => (b.signal_strength ?? 0) - (a.signal_strength ?? 0))
      .slice(0, 3)
      .map((r) => ({
        repo_full_name: r.repo_full_name,
        stars: r.stars,
        signal_strength: r.signal_strength,
        discovery_method: r.discovery_method,
        last_pushed_at: r.last_pushed_at,
        description: r.description?.slice(0, 80) ?? null,
      }));
    console.log(`[a2a-crawler] Top 3 by signal_strength:`);
    console.log(JSON.stringify(sample, null, 2));
    console.log(`[a2a-crawler] DRY-RUN complete. No DB writes.`);
    return;
  }

  // WRITE path
  const now = new Date().toISOString();
  const upserts = records.map((r) => ({
    repo_full_name: r.repo_full_name,
    repo_url: r.repo_url,
    name: r.name,
    owner: r.owner,
    description: r.description,
    stars: r.stars,
    forks: r.forks,
    language: r.language,
    topics: r.topics,
    homepage_url: r.homepage_url,
    discovery_method: r.discovery_method,
    last_pushed_at: r.last_pushed_at,
    signal_strength: r.signal_strength,
    raw_payload: r.raw_payload,
    payload_hash: r.payload_hash,
    last_seen_at: now,
    removed_at: null,
  }));

  const batchSize = 250;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize);
    const { error } = await supabase
      .from('a2a_agents')
      .upsert(batch, { onConflict: 'repo_full_name' });
    if (error) throw new Error(`[a2a-crawler] Upsert batch ${i} failed: ${error.message}`);
  }

  console.log(`[a2a-crawler] Wrote ${upserts.length} rows.`);
}

main().catch((err) => {
  console.error('[a2a-crawler] FATAL:', err.message);
  process.exit(1);
});
