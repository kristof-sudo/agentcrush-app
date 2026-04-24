/**
 * Ajsa Ingest Worker
 *
 * Fetches active doc/ecosystem/blog/protocol sources, scores them with
 * deterministic keyword rules (no LLM), and produces candidate brief items.
 *
 * Usage:
 *   node ajsa-ingest-worker.mjs --dry-run [--limit N]
 *   node ajsa-ingest-worker.mjs --write   [--limit N]
 *
 * score=0 sources are checked and their timestamps updated but never become
 * candidate brief items.
 *
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
// Word-boundary matching is used for short acronyms that would false-positive
// as substrings (e.g. "acp" inside "capacity", "mcp" inside "rmcp").

const KEYWORDS = [
  // x402 / payment protocols
  ['x402',                         false],
  ['agent payment',                false],
  ['agentic commerce',             false],
  ['agent commerce protocol',      false],
  ['onchain commerce',             false],
  ['autonomous economic activity', false],
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
  // short acronyms — whole-word only to avoid false positives
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
      // escape regex special chars, then wrap in non-alphanumeric boundary assertions
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
    'x402', 'erc-8004', 'erc8004', 'agent payment', 'agentic commerce',
    'agent commerce protocol', 'acp', 'onchain commerce',
  ].includes(k))) {
    return 'Review for AgentCrush x402/ERC-8004/ACP docs or update opportunity.';
  }
  if (matchedKeywords.some(k => [
    'agent-to-agent', 'a2a', 'agent coordination', 'agent network', 'autonomous economic activity',
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

function priorityFromScore(score) {
  if (score >= 50) return 1;
  if (score >= 30) return 2;
  if (score >= 10) return 3;
  return 4;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

const TODAY   = new Date().toISOString().slice(0, 10);
const NOW_ISO = new Date().toISOString();

// 1. Load active ingestible sources
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

console.log(`\n[ajsa-ingest] ${sources.length} source(s) to ingest\n`);

// 2. Fetch, score, and classify each source
const candidates    = [];
const skipped       = [];   // fetched OK but score=0
const fetchFailures = [];

for (const src of sources) {
  process.stdout.write(`  [${src.source_type}] ${src.source_key} ... `);
  const fetched = await fetchSource(src.url);

  if (!fetched.ok) {
    console.log(`FAILED (${fetched.error})`);
    fetchFailures.push({ source_key: src.source_key, error: fetched.error });
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

  // Always update source timestamps on successful fetch (clears stale errors too)
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
    skipped.push({ source_key: src.source_key, title: fetched.title });
    continue;
  }

  const recommendation = buildRecommendation(matchedKeywords);
  const priority = priorityFromScore(score);
  const itemUrl  = fetched.finalUrl ?? src.url;

  candidates.push({
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

// 3. Summary
console.log(`\n${'─'.repeat(60)}`);
console.log(`  Sources: ${sources.length}  Candidates: ${candidates.length}  Skipped (no signal): ${skipped.length}  Failed: ${fetchFailures.length}`);
console.log(`${'─'.repeat(60)}\n`);

for (const c of candidates) {
  console.log(`  [${c.source_type}] ${c.source_key}`);
  console.log(`    title:          ${c.title}`);
  console.log(`    url:            ${c.url}`);
  console.log(`    score/priority: ${c.score} / P${c.priority}`);
  console.log(`    keywords:       ${c.evidence.matched_keywords.join(', ')}`);
  console.log(`    recommendation: ${c.recommendation}`);
  console.log('');
}

if (skipped.length > 0) {
  console.log('  No-signal skips:');
  for (const s of skipped) {
    console.log(`    [SKIPPED] ${s.source_key}  score=0  no catalyst keywords`);
  }
  console.log('');
}

if (fetchFailures.length > 0) {
  console.log('  Fetch failures:');
  for (const f of fetchFailures) {
    console.log(`    ✗ ${f.source_key}: ${f.error}`);
  }
  console.log('');
}

// 4. Dry-run exit
if (isDryRun) {
  console.log(`[ajsa-ingest] DRY RUN complete. ${candidates.length} item(s) would be written, ${skipped.length} skipped (no signal). No changes made.`);
  process.exit(0);
}

// 5. Write mode: upsert candidates (source timestamps already updated above)
console.log(`[ajsa-ingest] Writing ${candidates.length} candidate(s) ...`);

let written = 0;
let writeErrors = 0;

for (const item of candidates) {
  // SELECT first to decide INSERT vs UPDATE — avoids upsert/constraint ambiguity
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
    console.log(`  [UPDATED] ${item.source_key}  score=${item.score}  P${item.priority}`);
  } else {
    const { error: insertErr } = await supabase.from('ajsa_brief_items').insert(item);
    if (insertErr) {
      console.error(`  [ERROR] ${item.source_key} (insert): ${insertErr.message}`);
      writeErrors++;
      continue;
    }
    console.log(`  [WRITTEN] ${item.source_key}  score=${item.score}  P${item.priority}`);
  }

  written++;
}

console.log(`\n[ajsa-ingest] Done. Written: ${written}  Skipped (no signal): ${skipped.length}  Errors: ${writeErrors}`);
