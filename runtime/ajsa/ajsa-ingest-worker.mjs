/**
 * Ajsa Ingest Worker
 *
 * Two ingest paths:
 *   1. Direct HTML — sources of type docs/ecosystem/protocol_site/blog
 *   2. HN Algolia  — hacker_news_agent_economy_search (type=search), uses config.queries
 *
 * Usage:
 *   node ajsa-ingest-worker.mjs --dry-run [--limit N]
 *   node ajsa-ingest-worker.mjs --write   [--limit N]
 *
 * --limit applies to HTML sources. HN is always run as one source with N queries.
 * score=0 results are never written as brief items.
 * Never sends Telegram. Never prints secrets.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite  = args.includes('--write');
const limitIdx = args.indexOf('--limit');
const LIMIT    = limitIdx !== -1 ? (parseInt(args[limitIdx + 1], 10) || 5) : 5;

if (!isDryRun && !isWrite) {
  console.error('[ajsa-ingest] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[ajsa-ingest] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[ajsa-ingest] Mode: ${MODE}  Limit: ${LIMIT}`);

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

async function loadSupabaseEnv() {
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    if (parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY) {
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v;
      }
      console.log(`[ajsa-ingest] Loaded env from ${path.basename(path.dirname(envPath))}/.env`);
      return;
    }
  }
  throw new Error(
    `[ajsa-ingest] Could not find SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in:\n  ${ENV_CANDIDATES.join('\n  ')}`
  );
}

await loadSupabaseEnv();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL)              { console.error('[ajsa-ingest] ERROR: SUPABASE_URL missing.'); process.exit(1); }
if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('[ajsa-ingest] ERROR: SUPABASE_SERVICE_ROLE_KEY missing.'); process.exit(1); }

// ── Supabase client ───────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Keyword scoring ───────────────────────────────────────────────────────────
//
// Each entry: [keyword, useWordBoundary]
// Word-boundary matching for short acronyms that would false-positive as substrings.

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
  ].includes(k))) {
    return 'Check whether this introduces a new agent/service category AgentCrush should track.';
  }
  if (matchedKeywords.some(k => [
    'autonomous agent', 'agent wallet', 'mcp', 'agent services',
    'agent identity', 'agent reputation', 'reputation',
  ].includes(k))) {
    return 'Consider adding related agents/services to AgentCrush index.';
  }
  if (matchedKeywords.some(k => [
    'usdc', 'stablecoin', 'identity registry', 'validation registry',
  ].includes(k))) {
    return 'Evaluate for AgentCrush ecosystem signal — payment/identity infrastructure detected.';
  }
  return 'Monitor source for emerging agent economy signals.';
}

function buildHNRecommendation(matchedKeywords, hit) {
  const highEngagement = (hit.points ?? 0) >= 100 || (hit.num_comments ?? 0) >= 50;
  if (matchedKeywords.some(k => [
    'x402', 'erc-8004', 'erc8004', 'agent payment', 'agent payments',
    'agentic commerce', 'agent commerce protocol', 'acp', 'onchain commerce',
  ].includes(k))) {
    return highEngagement
      ? 'High-signal HN thread on x402/ERC-8004 — use for narrative timing and positioning.'
      : 'Review HN discussion for market skepticism or positioning angle.';
  }
  if (matchedKeywords.some(k => [
    'agent-to-agent', 'a2a', 'agent coordination', 'agent network',
    'autonomous economic activity', 'agent economy',
  ].includes(k))) {
    return 'Use this as a signal for x402/A2A narrative timing.';
  }
  if (matchedKeywords.some(k => [
    'autonomous agent', 'agent wallet', 'agent payments', 'mcp',
    'agent services', 'agent identity', 'agent reputation',
  ].includes(k))) {
    return 'Consider adding this project/service to AgentCrush if relevant.';
  }
  if (matchedKeywords.some(k => [
    'marketplace', 'discovery', 'agentverse', 'kite', 'bankr',
  ].includes(k))) {
    return 'Consider adding this project/service to AgentCrush if relevant.';
  }
  return 'Review HN discussion for market skepticism or positioning angle.';
}

function priorityFromScore(score) {
  if (score >= 50) return 1;
  if (score >= 30) return 2;
  if (score >= 10) return 3;
  return 4;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 12000;
const UA = 'AgentCrush-Ajsa-Ingest/1.0 (+https://agentcrush.com)';

async function fetchSource(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: `HTTP ${resp.status}` };
    }
    const text = await resp.text();
    const finalUrl = resp.url;

    const titleMatch = text.match(/<title[^>]*>([^<]{1,250})<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : null;

    const stripped = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-zA-Z#0-9]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      ok:        true,
      status:    resp.status,
      finalUrl,
      title,
      snippet:   stripped.slice(0, 800),
      rawLength: text.length,
    };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

const HN_ALGOLIA_BASE = 'https://hn.algolia.com/api/v1/search';

async function fetchHNAlgoliaQuery(query) {
  const url = `${HN_ALGOLIA_BASE}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA },
    });
    clearTimeout(timer);
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const json = await resp.json();
    return { ok: true, hits: json.hits ?? [], nbHits: json.nbHits ?? 0 };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TODAY   = new Date().toISOString().slice(0, 10);
const NOW_ISO = new Date().toISOString();

// 1a. Load active HTML-ingestible sources
const { data: sources, error: srcErr } = await supabase
  .from('ajsa_sources')
  .select('id, source_key, source_type, display_name, url')
  .eq('status', 'active')
  .in('source_type', ['docs', 'ecosystem', 'protocol_site', 'blog'])
  .not('url', 'is', null)
  .order('source_type')
  .limit(LIMIT);

if (srcErr) {
  console.error('[ajsa-ingest] ERROR fetching sources:', srcErr.message);
  process.exit(1);
}

// 1b. Load HN source specifically (type=search, excluded from HTML query)
const { data: hnSrc, error: hnSrcErr } = await supabase
  .from('ajsa_sources')
  .select('id, source_key, source_type, display_name, url, config')
  .eq('source_key', 'hacker_news_agent_economy_search')
  .eq('status', 'active')
  .maybeSingle();

if (hnSrcErr) {
  console.warn('[ajsa-ingest] WARN: could not load HN source:', hnSrcErr.message);
}

const hnLabel = hnSrc ? `1 HN source (${(hnSrc.config?.queries ?? []).length} queries)` : 'HN source inactive/missing';
console.log(`\n[ajsa-ingest] ${sources.length} HTML source(s)  +  ${hnLabel}\n`);

// ── 2. HTML ingest ────────────────────────────────────────────────────────────

const htmlCandidates = [];
const htmlSkipped    = [];
const htmlFailures   = [];

for (const src of sources) {
  process.stdout.write(`  [${src.source_type}] ${src.source_key} ... `);
  const fetched = await fetchSource(src.url);

  if (!fetched.ok) {
    console.log(`FAILED (${fetched.error})`);
    htmlFailures.push({ source_key: src.source_key, error: fetched.error });
    if (isWrite) {
      await supabase.from('ajsa_sources').update({
        last_checked_at: NOW_ISO,
        last_error_at:   NOW_ISO,
        last_error:      fetched.error,
      }).eq('id', src.id);
    }
    continue;
  }

  const scoringText = [fetched.title ?? '', fetched.snippet ?? ''].join(' ');
  const { score, matchedKeywords } = scoreText(scoringText);

  if (isWrite) {
    await supabase.from('ajsa_sources').update({
      last_checked_at: NOW_ISO,
      last_success_at: NOW_ISO,
      last_error_at:   null,
      last_error:      null,
    }).eq('id', src.id);
  }

  if (score <= 0) {
    console.log(`SKIPPED  score=0  no catalyst keywords`);
    htmlSkipped.push({ source_key: src.source_key });
    continue;
  }

  const recommendation = buildRecommendation(matchedKeywords);
  const priority = priorityFromScore(score);
  const itemUrl  = fetched.finalUrl ?? src.url;

  htmlCandidates.push({
    brief_date:      TODAY,
    source_id:       src.id,
    source_key:      src.source_key,
    source_type:     src.source_type,
    title:           fetched.title ?? src.display_name,
    url:             itemUrl,
    summary:         fetched.snippet ? fetched.snippet.slice(0, 400) : null,
    recommendation,
    priority,
    score,
    status:          'candidate',
    occurred_at:     null,
    published_at:    null,
    evidence: {
      matched_keywords: matchedKeywords,
      fetch: {
        http_status: fetched.status,
        final_url:   itemUrl,
        raw_length:  fetched.rawLength,
      },
    },
    payload: {
      display_name:   src.display_name,
      original_url:   src.url,
      snippet_length: (fetched.snippet ?? '').length,
    },
  });

  console.log(`OK  score=${score}  [${matchedKeywords.join(', ')}]`);
}

// ── 3. HN Algolia ingest ──────────────────────────────────────────────────────

const hnCandidates    = [];
const hnSkipped       = [];
const hnQueryFailures = [];

if (hnSrc) {
  const queries = hnSrc.config?.queries ?? [];
  console.log(`\n[ajsa-ingest] HN Algolia — ${queries.length} quer${queries.length === 1 ? 'y' : 'ies'}\n`);

  const seenObjectIDs = new Set();

  for (const query of queries) {
    process.stdout.write(`  [HN] "${query}" ... `);
    const result = await fetchHNAlgoliaQuery(query);

    if (!result.ok) {
      console.log(`FAILED (${result.error})`);
      hnQueryFailures.push({ query, error: result.error });
      continue;
    }

    // Deduplicate across queries by objectID
    const newHits = result.hits.filter(h => !seenObjectIDs.has(h.objectID));
    newHits.forEach(h => seenObjectIDs.add(h.objectID));

    let scoredCount = 0;
    for (const hit of newHits) {
      const itemUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
      // Include query in scoring text so query keywords auto-match (e.g. "x402" query → x402 keyword)
      const scoringText = [hit.title ?? '', itemUrl, query].join(' ');
      const { score, matchedKeywords } = scoreText(scoringText);

      if (score <= 0) {
        hnSkipped.push({ query, objectID: hit.objectID, title: hit.title });
        continue;
      }

      const recommendation = buildHNRecommendation(matchedKeywords, hit);
      const priority = priorityFromScore(score);

      hnCandidates.push({
        brief_date:   TODAY,
        source_id:    hnSrc.id,
        source_key:   hnSrc.source_key,
        source_type:  hnSrc.source_type,
        title:        hit.title ?? `HN: ${query}`,
        url:          itemUrl,
        summary:      `HN: ${hit.points ?? 0} pts / ${hit.num_comments ?? 0} comments — "${hit.title ?? ''}"`,
        recommendation,
        priority,
        score,
        status:       'candidate',
        occurred_at:  hit.created_at ?? null,
        published_at: hit.created_at ?? null,
        evidence: {
          matched_keywords: matchedKeywords,
          hn_points:        hit.points ?? 0,
          hn_comments:      hit.num_comments ?? 0,
          hn_object_id:     hit.objectID,
          query,
        },
        payload: {
          display_name:  hnSrc.display_name,
          hn_title:      hit.title ?? null,
          hn_author:     hit.author ?? null,
          hn_created_at: hit.created_at ?? null,
        },
      });
      scoredCount++;
    }

    console.log(`${result.hits.length} hits  ${newHits.length} new  ${scoredCount} scored`);
  }

  // Update HN source timestamps
  if (isWrite) {
    const allFailed = hnQueryFailures.length > 0 && hnQueryFailures.length === queries.length;
    if (allFailed) {
      await supabase.from('ajsa_sources').update({
        last_checked_at: NOW_ISO,
        last_error_at:   NOW_ISO,
        last_error:      `All ${queries.length} queries failed`,
      }).eq('id', hnSrc.id);
    } else {
      await supabase.from('ajsa_sources').update({
        last_checked_at: NOW_ISO,
        last_success_at: NOW_ISO,
        last_error_at:   null,
        last_error:      null,
      }).eq('id', hnSrc.id);
    }
  }
}

// ── 4. Summary ────────────────────────────────────────────────────────────────

const allCandidates = [...htmlCandidates, ...hnCandidates];

console.log(`\n${'─'.repeat(60)}`);
console.log(`  HTML   Sources: ${sources.length}  Candidates: ${htmlCandidates.length}  Skipped: ${htmlSkipped.length}  Failed: ${htmlFailures.length}`);
if (hnSrc) {
  const hnHitsTotal = hnCandidates.length + hnSkipped.length;
  console.log(`  HN     Hits: ${hnHitsTotal}  Candidates: ${hnCandidates.length}  No-signal: ${hnSkipped.length}  Query failures: ${hnQueryFailures.length}`);
}
console.log(`  Total candidates: ${allCandidates.length}`);
console.log(`${'─'.repeat(60)}\n`);

if (htmlCandidates.length > 0) {
  console.log('  ── HTML candidates ──');
  for (const c of htmlCandidates) {
    console.log(`  [${c.source_type}] ${c.source_key}  score=${c.score} / P${c.priority}`);
    console.log(`    title:  ${c.title}`);
    console.log(`    keys:   ${c.evidence.matched_keywords.join(', ')}`);
    console.log(`    action: ${c.recommendation}`);
    console.log('');
  }
}

if (hnCandidates.length > 0) {
  console.log('  ── HN candidates ──');
  for (const c of hnCandidates) {
    console.log(`  score=${c.score} / P${c.priority}  ${c.evidence.hn_points}pts / ${c.evidence.hn_comments}c  query="${c.evidence.query}"`);
    console.log(`    title:  "${c.title}"`);
    console.log(`    url:    ${c.url}`);
    console.log(`    keys:   ${c.evidence.matched_keywords.join(', ')}`);
    console.log(`    action: ${c.recommendation}`);
    console.log('');
  }
} else if (hnSrc) {
  console.log('  ── HN candidates: none scored above 0 ──\n');
}

if (htmlSkipped.length > 0) {
  console.log('  No-signal (HTML):');
  for (const s of htmlSkipped) console.log(`    [SKIPPED] ${s.source_key}`);
  console.log('');
}
if (htmlFailures.length > 0) {
  console.log('  Failures (HTML):');
  for (const f of htmlFailures) console.log(`    ✗ ${f.source_key}: ${f.error}`);
  console.log('');
}
if (hnQueryFailures.length > 0) {
  console.log('  HN query failures:');
  for (const f of hnQueryFailures) console.log(`    ✗ "${f.query}": ${f.error}`);
  console.log('');
}

// ── 5. Dry-run exit ───────────────────────────────────────────────────────────

if (isDryRun) {
  console.log(`[ajsa-ingest] DRY RUN complete. ${allCandidates.length} total candidate(s) (${htmlCandidates.length} HTML + ${hnCandidates.length} HN), ${htmlSkipped.length + hnSkipped.length} no-signal. No changes made.`);
  process.exit(0);
}

// ── 6. Write ──────────────────────────────────────────────────────────────────

console.log(`[ajsa-ingest] Writing ${allCandidates.length} candidate(s) ...`);

let written = 0;
let writeErrors = 0;

for (const item of allCandidates) {
  const isHN = item.source_key === 'hacker_news_agent_economy_search';

  // SELECT first — avoids upsert/constraint ambiguity
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
    console.log(isHN
      ? `  [HN:UPDATED]  "${shortTitle}"  score=${item.score}`
      : `  [UPDATED] ${item.source_key}  score=${item.score}  P${item.priority}`
    );
  } else {
    const { error: insertErr } = await supabase.from('ajsa_brief_items').insert(item);
    if (insertErr) {
      console.error(`  [ERROR] ${item.source_key} (insert): ${insertErr.message}`);
      writeErrors++;
      continue;
    }
    console.log(isHN
      ? `  [HN:WRITTEN]  "${shortTitle}"  score=${item.score}`
      : `  [WRITTEN] ${item.source_key}  score=${item.score}  P${item.priority}`
    );
  }

  written++;
}

console.log(`\n[ajsa-ingest] Done. Written: ${written}  Errors: ${writeErrors}`);
