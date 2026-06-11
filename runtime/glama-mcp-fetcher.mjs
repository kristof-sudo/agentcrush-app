/**
 * glama-mcp-fetcher.mjs — B8: MCP server v2 ingestion (discovery source: Glama).
 *
 * Pages the public Glama API (https://glama.ai/api/mcp/v1/servers, cursor
 * pagination) and upserts discoveries into the STAGING table
 * glama_mcp_candidates — NOT into agents. Glama's list API exposes no quality
 * discriminator (every listing has repo + description; tool counts are
 * detail-only), and bulk inserts into agents would move the Ghost Index
 * denominator. Promotion into agents is a separate Kris-gated step that joins
 * GitHub evidence (stars/activity), mirroring the Virtuals promotion pipeline.
 *
 * DEFAULT IS DRY-RUN. Pass --write to upsert into staging. Weekly on VPS.
 *
 *   node runtime/glama-mcp-fetcher.mjs [--write] [--max=3000]
 */

import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const WRITE = process.argv.includes('--write');
const MAX = parseInt((process.argv.find((a) => a.startsWith('--max=')) || '--max=2000').split('=')[1], 10);
// Quality gate: the list API doesn't expose tool counts (detail-only), so the
// gate is: has a GitHub repository + a real description. Repo-gated entries
// flow into the existing GitHub evidence pipeline (stars/activity), which —
// not Glama's listing — decides whether they ever surface. The no-repo long
// tail is the orbisapi pattern from the x402 demand readout: skip it.
const MIN_TOOLS = parseInt((process.argv.find((a) => a.startsWith('--min-tools=')) || '--min-tools=0').split('=')[1], 10);

const API = 'https://glama.ai/api/mcp/v1/servers';

function toHandle(ns, slug) {
  return `mcp_${ns}_${slug}`.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 64);
}

// 1. Page the Glama catalog
const servers = [];
let cursor = null;
while (servers.length < MAX) {
  const url = `${API}?first=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`;
  const res = await fetch(url, { headers: { 'user-agent': 'agentcrush-glama-fetcher' } });
  if (!res.ok) {
    console.error(`[glama-fetcher] API ${res.status} at ${servers.length} servers — stopping page loop`);
    break;
  }
  const page = await res.json();
  servers.push(...(page.servers || []));
  if (!page.pageInfo?.hasNextPage) break;
  cursor = page.pageInfo.endCursor;
  await new Promise((r) => setTimeout(r, 300)); // be polite
}
console.log(`[glama-fetcher] fetched ${servers.length} servers from Glama`);

// 2. Normalize
const candidates = servers
  .filter((s) => s.namespace && s.slug)
  .map((s) => ({
    handle: toHandle(s.namespace, s.slug),
    display_name: s.name || s.slug,
    bio: (s.description || '').slice(0, 500),
    github_url: s.repository?.url || null,
    github_full_name: s.repository?.url?.match(/github\.com\/([^/]+\/[^/#?]+)/)?.[1] || null,
    website_url: s.url || `https://glama.ai/mcp/servers/${s.namespace}/${s.slug}`,
    tool_count: Array.isArray(s.tools) ? s.tools.length : null,
    license: s.spdxLicense?.name || null,
    attributes: s.attributes || [],
    namespace: s.namespace,
    slug: s.slug,
  }));

const qualifying = candidates.filter(
  (c) => c.github_full_name && (c.bio || '').length >= 30 && (c.tool_count ?? 0) >= MIN_TOOLS
);
console.log(`[glama-fetcher] ${candidates.length} fetched · ${qualifying.length} pass the quality gate (GitHub repo + real description) · ${candidates.length - qualifying.length} skipped (no-repo long tail)`);

if (!WRITE) {
  console.log('[glama-fetcher] DRY RUN — no writes. Qualifying sample:');
  for (const c of qualifying.slice(0, 8)) {
    console.log(` ${c.handle} · ${c.tool_count} tools · ${c.github_full_name ?? 'no repo'}`);
  }
  console.log(`[glama-fetcher] re-run with --write to upsert ${qualifying.length} servers.`);
  process.exit(0);
}

// 3. Upsert into staging (write mode)
const sb = createClient(SB_URL, SB_KEY);
let upserted = 0, failed = 0;
for (let i = 0; i < qualifying.length; i += 200) {
  const batch = qualifying.slice(i, i + 200).map((c) => ({
    handle: c.handle,
    display_name: c.display_name,
    description: c.bio,
    github_url: c.github_url,
    github_full_name: c.github_full_name,
    website_url: c.website_url,
    tool_count: c.tool_count,
    license: c.license,
    attributes: c.attributes,
    glama_namespace: c.namespace,
    glama_slug: c.slug,
    last_seen_at: new Date().toISOString(),
  }));
  const { error } = await sb.from('glama_mcp_candidates').upsert(batch, { onConflict: 'handle' });
  if (error) { console.error('[glama-fetcher] batch failed:', error.message); failed += batch.length; continue; }
  upserted += batch.length;
}
console.log(`[glama-fetcher] staging upsert done: ${upserted} rows, ${failed} failed.`);
