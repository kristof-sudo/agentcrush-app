/**
 * HuggingFace derivatives aggregator v0
 *
 * Aggregates downstream adoption signal per base model by scanning the
 * local `hf_models` cache. For each `hf_models` row with a tag of the
 * form `base_model:OWNER/NAME` (or kind variants
 * `base_model:finetune:OWNER/NAME`, `:quantized:`, `:adapter:`, `:merge:`),
 * we count one derivative pointing at that base_model.
 *
 * Step (c.2) of the Category Index Pivot. Second capability signal for the
 * `model_family` agent category — feeds the future `derivatives_score`
 * column reserved in `agent_score_model_family_v1`. Promotion / linkage
 * to the `agents` table is a SEPARATE downstream migration.
 *
 * Usage:
 *   node runtime/hf-derivatives-aggregator.mjs --dry-run            # scan + summary
 *   node runtime/hf-derivatives-aggregator.mjs --write              # upsert into Supabase
 *   node runtime/hf-derivatives-aggregator.mjs --dry-run --max 200  # cap base models
 *
 * Idempotent. PK is canonical `base_model` ("owner/name"). Re-runs
 * overwrite counters and bump `last_aggregated_at`.
 *
 * Source data: local `hf_models` table — already populated daily by
 * runtime/hf-models-adapter.mjs (top ~10k models by downloads). This
 * aggregator does NOT call the HF API; it depends on hf-models-adapter
 * having run first.
 *
 * Note on parsing strategy: HF surfaces base-model declarations primarily
 * via `tags` (the `cardData.base_model` field is NOT returned by the list
 * endpoint our adapter uses). Tags are reliable: every model with a
 * declared base_model emits a `base_model:OWNER/NAME` tag, plus optional
 * kind-variant tags. We dedupe per derivative model_id so multiple tag
 * variants on the same model count once.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (always required — we read
 *   hf_models in both --dry-run and --write modes)
 *   Same .env loading conventions as runtime/hf-models-adapter.mjs.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');
const maxIdx = args.indexOf('--max');
const MAX_ITEMS = maxIdx !== -1 ? (parseInt(args[maxIdx + 1], 10) || Infinity) : Infinity;

if (!isDryRun && !isWrite) {
  console.error('[hf-derivatives] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[hf-derivatives] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[hf-derivatives] Mode: ${MODE}`);
if (MAX_ITEMS !== Infinity) console.log(`[hf-derivatives] Cap: ${MAX_ITEMS} base models`);

// ── Env loading ───────────────────────────────────────────────────────────────

const ENV_CANDIDATES = [
  '/opt/agentcrush/scanner/.env',
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

async function loadEnvFiles() {
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
    console.log(`[hf-derivatives] Loaded env from ${envPath}`);
  }
}

await loadEnvFiles();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[hf-derivatives] ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const KNOWN_KINDS = new Set(['finetune', 'quantized', 'adapter', 'merge', 'lora', 'dare', 'ties']);

/**
 * Parse a tag string into a canonical base_model id, or null.
 * Accepts:
 *   "base_model:OWNER/NAME"
 *   "base_model:KIND:OWNER/NAME"  (kind in KNOWN_KINDS or unknown — we still extract)
 * Rejects anything not starting with "base_model:" or without a "/".
 */
function parseBaseModelTag(tag) {
  if (typeof tag !== 'string') return null;
  if (!tag.startsWith('base_model:')) return null;
  const rest = tag.slice('base_model:'.length);
  if (!rest) return null;
  // Could be "OWNER/NAME" or "KIND:OWNER/NAME"
  const firstColon = rest.indexOf(':');
  let candidate;
  if (firstColon === -1) {
    candidate = rest;
  } else {
    // If the segment before the colon looks like a kind (no "/") treat as KIND:OWNER/NAME
    const head = rest.slice(0, firstColon);
    const tail = rest.slice(firstColon + 1);
    if (head.includes('/')) {
      // owner contains a colon? Unusual — fall back to whole string.
      candidate = rest;
    } else {
      candidate = tail;
    }
  }
  candidate = candidate.trim();
  if (!candidate || !candidate.includes('/')) return null;
  // Sanity: drop anything containing spaces or further colons (malformed)
  if (/\s/.test(candidate)) return null;
  return candidate;
}

function extractAuthor(modelId) {
  if (typeof modelId !== 'string') return null;
  const slash = modelId.indexOf('/');
  if (slash === -1) return null;
  return modelId.slice(0, slash);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function scanHfModels() {
  const pageSize = 1000;
  let from = 0;
  let scanned = 0;
  let withBaseDecl = 0;
  // base_model → aggregator state
  const agg = new Map();

  while (true) {
    const { data, error } = await supabase
      .from('hf_models')
      .select('model_id,tags,downloads,likes,removed_at')
      .is('removed_at', null)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`[hf-derivatives] Supabase select failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned += 1;
      const tags = Array.isArray(row.tags) ? row.tags : null;
      if (!tags || tags.length === 0) continue;

      // Collect unique base_model ids declared by this derivative model.
      // Tag variants on the same row (plain + finetune + quantized) all point
      // at the same base — counting once per derivative.
      const declared = new Set();
      for (const t of tags) {
        const b = parseBaseModelTag(t);
        if (b) declared.add(b);
      }
      if (declared.size === 0) continue;
      withBaseDecl += 1;

      const downloads = typeof row.downloads === 'number' ? row.downloads : 0;
      const likes = typeof row.likes === 'number' ? row.likes : 0;
      for (const base of declared) {
        let state = agg.get(base);
        if (!state) {
          state = {
            base_model: base,
            base_author: extractAuthor(base),
            count: 0,
            total_downloads: 0,
            total_likes: 0,
            // sample list: keep all then trim — caps memory at ~scanned rows worst case
            samples: [],
          };
          agg.set(base, state);
        }
        state.count += 1;
        state.total_downloads += downloads;
        state.total_likes += likes;
        state.samples.push({ id: row.model_id, downloads, likes });
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`[hf-derivatives] Scanned ${scanned} hf_models rows (active, removed_at IS NULL)`);
  console.log(`[hf-derivatives] ${withBaseDecl} rows declared at least one base_model tag`);
  console.log(`[hf-derivatives] Aggregated to ${agg.size} unique base_models`);
  return agg;
}

function buildRecords(agg) {
  const out = [];
  for (const state of agg.values()) {
    // Trim sample list to top 10 by downloads desc
    state.samples.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    const sample = state.samples.slice(0, 10).map((s) => s.id);
    out.push({
      base_model: state.base_model,
      base_author: state.base_author,
      derivatives_count: state.count,
      derivatives_total_downloads: state.total_downloads,
      derivatives_total_likes: state.total_likes,
      sample_derivative_ids: sample,
    });
  }
  // Sort by derivatives_count desc for summary + cap
  out.sort((a, b) => b.derivatives_count - a.derivatives_count);
  if (MAX_ITEMS !== Infinity) return out.slice(0, MAX_ITEMS);
  return out;
}

async function main() {
  const t0 = Date.now();
  const agg = await scanHfModels();
  const records = buildRecords(agg);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[hf-derivatives] Build phase done in ${elapsed}s — ${records.length} records ready`);

  const top10 = records.slice(0, 10).map((r) => ({
    base_model: r.base_model,
    base_author: r.base_author,
    derivatives_count: r.derivatives_count,
    derivatives_total_downloads: r.derivatives_total_downloads,
    derivatives_total_likes: r.derivatives_total_likes,
  }));
  console.log(`[hf-derivatives] Top 10 by derivative count:`);
  console.log(JSON.stringify(top10, null, 2));

  // Flagship validation probe: Hermes-3-405B
  const hermes = records.find((r) => r.base_model === 'NousResearch/Hermes-3-Llama-3.1-405B');
  if (hermes) {
    console.log(`[hf-derivatives] Hermes-3-405B derivatives: ${hermes.derivatives_count} (downloads sum ${hermes.derivatives_total_downloads}, likes sum ${hermes.derivatives_total_likes})`);
  } else {
    console.log(`[hf-derivatives] Hermes-3-405B not found as a base_model in current hf_models cache`);
  }

  if (isDryRun) {
    console.log(`[hf-derivatives] DRY-RUN complete. No DB writes.`);
    return;
  }

  // WRITE path
  const now = new Date().toISOString();
  const upserts = records.map((r) => ({
    base_model: r.base_model,
    base_author: r.base_author,
    derivatives_count: r.derivatives_count,
    derivatives_total_downloads: r.derivatives_total_downloads,
    derivatives_total_likes: r.derivatives_total_likes,
    sample_derivative_ids: r.sample_derivative_ids,
    last_aggregated_at: now,
  }));

  const batchSize = 500;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const batch = upserts.slice(i, i + batchSize);
    const { error } = await supabase
      .from('hf_derivatives')
      .upsert(batch, { onConflict: 'base_model' });
    if (error) throw new Error(`[hf-derivatives] Upsert batch ${i} failed: ${error.message}`);
  }

  console.log(`[hf-derivatives] Summary:`);
  console.log(`  unique base_models:  ${records.length}`);
  console.log(`  upserted:            ${upserts.length}`);
}

main().catch((err) => {
  console.error('[hf-derivatives] FATAL:', err.message);
  process.exit(1);
});
