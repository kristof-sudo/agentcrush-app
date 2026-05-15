/**
 * Semantic Scholar Citations adapter v0
 *
 * Read-only fetcher. Pulls per-paper citation data from the Semantic Scholar
 * Graph API and upserts into the `paper_citations` table. Paper IDs come from
 * the union of all `agents.semantic_scholar_paper_ids` arrays (seeds the
 * worklist — we don't sweep S2's entire corpus, only papers explicitly linked
 * to model_family agents).
 *
 * Step (c.3) of the Category Index Pivot. 4th source signal for the
 * model_family agent category — feeds the `citations_score` column in
 * `agent_score_model_family_v1`. View update is a SEPARATE downstream migration.
 *
 * Usage:
 *   node runtime/citations-adapter.mjs --dry-run        # fetch + summary
 *   node runtime/citations-adapter.mjs --write          # upsert into Supabase
 *
 * Idempotent. PK is canonical Semantic Scholar paperId (40-char hex hash).
 * If the seed token is "arxiv:XXXX.XXXXX", the adapter resolves it to the
 * canonical paperId on first sync and stores both. `last_seen_at` bumps every
 * run; `removed_at` set on rows that disappear from S2 (rare).
 *
 * Source:
 *   GET https://api.semanticscholar.org/graph/v1/paper/{ID}?fields=...
 *   ID forms accepted:
 *     - paperId (40-char hex)
 *     - "arXiv:2408.11857"
 *     - "DOI:10.48550/arXiv.2408.11857"
 *     - "CorpusId:271923775"
 *   Rate limit: ~100 req per 5-min window unauthenticated (0.33 req/sec).
 *   With SEMANTIC_SCHOLAR_API_KEY: 1 req/sec sustained, no window cap.
 *
 * Env:
 *   SEMANTIC_SCHOLAR_API_KEY  (optional, recommended for >100 papers)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (write mode only)
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');
const skipExisting = args.includes('--skip-existing');

if (!isDryRun && !isWrite) {
  console.error('Usage: node runtime/citations-adapter.mjs [--dry-run | --write] [--skip-existing]');
  process.exit(1);
}

// ── Env loader (mirrors hf-models-adapter.mjs / lmarena-adapter.mjs pattern) ──

const ENV_CANDIDATES = [
  '/opt/agentcrush/scanner/.env',
  '/opt/agentcrush/.env',
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env'),
];

async function loadEnv() {
  for (const p of ENV_CANDIDATES) {
    try {
      const buf = await fs.readFile(p, 'utf8');
      for (const line of buf.split('\n')) {
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const i = line.indexOf('=');
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        if (k && !process.env[k]) process.env[k] = v;
      }
    } catch { /* file missing — ok */ }
  }
}

await loadEnv();

const S2_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || '';
const SLEEP_MS = S2_KEY ? 1100 : 7000; // unauthenticated: ~7s/call keeps us well under the 100-per-5-min window

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (isWrite && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error('FATAL: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required for --write');
  process.exit(1);
}

// ── S2 fields we request ──────────────────────────────────────────────────────

const FIELDS = [
  'paperId',
  'externalIds',
  'title',
  'abstract',
  'venue',
  'year',
  'publicationDate',
  'citationCount',
  'influentialCitationCount',
  'referenceCount',
  'fieldsOfStudy',
  'authors.name',
  'authors.authorId',
].join(',');

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sha256(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function normalizeSeedToken(token) {
  // Accepts: "arxiv:2408.11857" / "ArXiv:2408.11857" / raw paperId / "doi:..." / "corpusid:..."
  const t = String(token).trim();
  if (/^[a-f0-9]{40}$/i.test(t)) return { kind: 'paperId', value: t.toLowerCase(), s2lookup: t.toLowerCase() };
  const m = t.match(/^(arxiv|doi|corpusid|paperid):(.+)$/i);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  const value = m[2].trim();
  // S2 expects "ArXiv:..." / "DOI:..." / "CorpusId:..." (case-sensitive on the prefix)
  const s2prefix =
    kind === 'arxiv' ? 'ArXiv'
    : kind === 'doi' ? 'DOI'
    : kind === 'corpusid' ? 'CorpusId'
    : null;
  if (!s2prefix) return { kind: 'paperId', value, s2lookup: value };
  return { kind, value, s2lookup: `${s2prefix}:${value}` };
}

async function fetchPaper(token) {
  const url = `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(token)}?fields=${FIELDS}`;
  const headers = { 'User-Agent': 'AgentCrush-citations-adapter/0.1' };
  if (S2_KEY) headers['x-api-key'] = S2_KEY;

  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return await res.json();
    if (res.status === 404) return { _notFound: true };
    if (res.status === 429) {
      const backoff = attempt * 6000; // 6s, 12s, 18s, 24s
      console.warn(`  ! 429 on ${token} (attempt ${attempt}) — backing off ${backoff}ms`);
      await sleep(backoff);
      continue;
    }
    throw new Error(`S2 ${res.status} on ${token}: ${await res.text().catch(() => '')}`);
  }
  throw new Error(`S2 retries exhausted on ${token}`);
}

function normalizeRow(s2) {
  const ext = s2.externalIds || {};
  return {
    paper_id: s2.paperId,
    arxiv_id: ext.ArXiv || null,
    doi: ext.DOI || null,
    corpus_id: ext.CorpusId ? Number(ext.CorpusId) : null,
    title: s2.title || null,
    authors: Array.isArray(s2.authors) ? s2.authors.map((a) => ({ name: a.name, authorId: a.authorId })) : null,
    venue: s2.venue || null,
    publication_year: s2.year ?? null,
    publication_date: s2.publicationDate || null,
    citation_count: s2.citationCount ?? 0,
    influential_citation_count: s2.influentialCitationCount ?? 0,
    reference_count: s2.referenceCount ?? null,
    abstract: s2.abstract || null,
    fields_of_study: Array.isArray(s2.fieldsOfStudy) ? s2.fieldsOfStudy : null,
    raw_payload: s2,
    payload_hash: sha256({
      title: s2.title,
      citationCount: s2.citationCount,
      year: s2.year,
    }),
    last_seen_at: new Date().toISOString(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL) {
    console.error('FATAL: SUPABASE_URL required to read agents.semantic_scholar_paper_ids');
    process.exit(1);
  }
  const sb = createClient(
    SUPABASE_URL,
    SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // 1. Collect all unique seed tokens from agents.semantic_scholar_paper_ids
  console.log('→ Reading agents.semantic_scholar_paper_ids …');
  const { data: agents, error } = await sb
    .from('agents')
    .select('handle, semantic_scholar_paper_ids')
    .eq('primary_category', 'model_family')
    .not('semantic_scholar_paper_ids', 'eq', '{}');
  if (error) throw error;

  const allTokens = new Set();
  for (const a of agents || []) {
    for (const t of a.semantic_scholar_paper_ids || []) allTokens.add(t);
  }
  console.log(`  ${agents?.length || 0} model_family agents linked to ${allTokens.size} unique paper tokens`);

  // Optional: skip tokens whose paper already exists in DB (cheap retry mode)
  if (skipExisting) {
    const arxivIds = [];
    for (const t of allTokens) {
      const n = normalizeSeedToken(t);
      if (n && n.kind === 'arxiv') arxivIds.push(n.value);
    }
    if (arxivIds.length > 0) {
      const { data: existing, error: exErr } = await sb
        .from('paper_citations')
        .select('arxiv_id')
        .in('arxiv_id', arxivIds);
      if (exErr) throw exErr;
      const have = new Set((existing || []).map((r) => r.arxiv_id));
      let skipped = 0;
      for (const t of [...allTokens]) {
        const n = normalizeSeedToken(t);
        if (n && n.kind === 'arxiv' && have.has(n.value)) {
          allTokens.delete(t);
          skipped++;
        }
      }
      console.log(`  --skip-existing: skipped ${skipped} tokens already in paper_citations; ${allTokens.size} remain`);
    }
  }

  // 2. Fetch each paper from S2
  const rows = [];
  const failures = [];
  let i = 0;
  for (const token of allTokens) {
    i++;
    const norm = normalizeSeedToken(token);
    if (!norm) {
      failures.push({ token, reason: 'unparseable token' });
      continue;
    }
    process.stdout.write(`  [${i}/${allTokens.size}] fetch ${norm.s2lookup} … `);
    try {
      const s2 = await fetchPaper(norm.s2lookup);
      if (s2._notFound) {
        console.log('NOT FOUND');
        failures.push({ token, reason: '404' });
      } else if (!s2.paperId) {
        console.log('NO paperId');
        failures.push({ token, reason: 'no paperId in response' });
      } else {
        const row = normalizeRow(s2);
        rows.push(row);
        console.log(`ok cites=${row.citation_count} title="${(row.title || '').slice(0, 50)}…"`);
      }
    } catch (e) {
      console.log(`ERR: ${e.message}`);
      failures.push({ token, reason: e.message });
    }
    if (i < allTokens.size) await sleep(SLEEP_MS);
  }

  // 3. Summary by agent
  console.log('\n→ Per-agent citation totals:');
  for (const a of agents || []) {
    const tokens = a.semantic_scholar_paper_ids || [];
    let total = 0;
    let matched = 0;
    for (const t of tokens) {
      const norm = normalizeSeedToken(t);
      if (!norm) continue;
      const row = rows.find((r) =>
        (norm.kind === 'arxiv' && r.arxiv_id === norm.value) ||
        (norm.kind === 'doi' && r.doi === norm.value) ||
        (norm.kind === 'corpusid' && r.corpus_id === Number(norm.value)) ||
        (norm.kind === 'paperId' && r.paper_id === norm.value)
      );
      if (row) {
        total += row.citation_count;
        matched++;
      }
    }
    console.log(`  ${a.handle.padEnd(28)} ${matched}/${tokens.length} papers matched, total cites=${total}`);
  }

  if (failures.length > 0) {
    console.log('\n→ Failures:');
    for (const f of failures) console.log(`  ${f.token} — ${f.reason}`);
  }

  // 4. Write
  if (isDryRun) {
    console.log(`\n[DRY-RUN] would upsert ${rows.length} rows. Re-run with --write to commit.`);
    return;
  }

  if (rows.length === 0) {
    console.log('\nNothing to write (0 successful fetches).');
    return;
  }

  console.log(`\n→ Upserting ${rows.length} rows into paper_citations …`);
  const sbWrite = createClient(SUPABASE_URL, SUPABASE_KEY);
  // batch of 50
  let upserted = 0;
  for (let b = 0; b < rows.length; b += 50) {
    const chunk = rows.slice(b, b + 50);
    const { error: upErr } = await sbWrite
      .from('paper_citations')
      .upsert(chunk, { onConflict: 'paper_id' });
    if (upErr) {
      console.error(`  batch ${b}-${b + chunk.length} FAILED:`, upErr.message);
      throw upErr;
    }
    upserted += chunk.length;
    console.log(`  upserted ${upserted}/${rows.length}`);
  }
  console.log('✓ done.');
}

await main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
