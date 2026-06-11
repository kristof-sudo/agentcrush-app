/**
 * glama-mcp-promoter.mjs — B8 step 2: promote staged Glama candidates into the
 * index, gated on GitHub evidence (the Virtuals-pipeline pattern).
 *
 * 1. Reads unpromoted glama_mcp_candidates (stale-checked first)
 * 2. Joins GitHub evidence per repo (stars, pushed_at, archived) and stores it
 *    back into staging — resumable across runs if rate-limited
 * 3. Gate: stars >= MIN_STARS AND pushed within ACTIVE_DAYS AND not archived
 * 4. DRY-RUN default: prints qualifying counts + sample for Kris approval.
 *    --write inserts qualifiers into agents (tier='indexed', mcp_server) +
 *    mcp_server_metadata, and stamps promoted_at.
 *
 * GITHUB_TOKEN strongly recommended (5,000 req/h vs 60 unauthenticated); the
 * script stops politely at the rate limit and resumes on the next run.
 *
 *   node runtime/glama-mcp-promoter.mjs [--write] [--min-stars=25] [--batch=300]
 */

import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
const WRITE = process.argv.includes('--write');
const MIN_STARS = parseInt((process.argv.find((a) => a.startsWith('--min-stars=')) || '--min-stars=25').split('=')[1], 10);
const BATCH = parseInt((process.argv.find((a) => a.startsWith('--batch=')) || '--batch=300').split('=')[1], 10);
const ACTIVE_DAYS = 180;

const sb = createClient(SB_URL, SB_KEY);

// 1. Load candidates needing a GitHub check (never checked, or stale > 7d)
const staleCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
const { data: candidates, error } = await sb
  .from('glama_mcp_candidates')
  .select('id, handle, display_name, description, github_url, github_full_name, website_url, tool_count, license, github_stars, github_checked_at')
  .is('promoted_at', null)
  .not('github_full_name', 'is', null)
  .or(`github_checked_at.is.null,github_checked_at.lt.${staleCutoff}`)
  .limit(BATCH);
if (error) {
  console.error('[glama-promoter] staging read failed (migration applied?):', error.message);
  process.exit(1);
}
console.log(`[glama-promoter] ${candidates.length} candidates to evidence-check (batch cap ${BATCH})`);

// 2. GitHub evidence join — resumable
const headers = { 'user-agent': 'agentcrush-glama-promoter', accept: 'application/vnd.github+json' };
if (GH_TOKEN) headers.authorization = `Bearer ${GH_TOKEN}`;
let checked = 0, rateLimited = false;
for (const c of candidates) {
  const res = await fetch(`https://api.github.com/repos/${c.github_full_name}`, { headers });
  if (res.status === 403 || res.status === 429) {
    rateLimited = true;
    console.log(`[glama-promoter] GitHub rate limit at ${checked} checks — resuming next run${GH_TOKEN ? '' : ' (set GITHUB_TOKEN for 5000/h)'}`);
    break;
  }
  const repo = res.ok ? await res.json() : null;
  await sb
    .from('glama_mcp_candidates')
    .update({
      github_stars: repo?.stargazers_count ?? 0,
      github_pushed_at: repo?.pushed_at ?? null,
      github_archived: repo?.archived ?? null,
      github_checked_at: new Date().toISOString(),
    })
    .eq('id', c.id);
  checked++;
  await new Promise((r) => setTimeout(r, GH_TOKEN ? 100 : 1100));
}
console.log(`[glama-promoter] evidence-checked ${checked} repos${rateLimited ? ' (rate-limited, partial)' : ''}`);

// 3. Gate over everything checked so far (across runs)
const activeCutoff = new Date(Date.now() - ACTIVE_DAYS * 86400000).toISOString();
const { data: qualifiers } = await sb
  .from('glama_mcp_candidates')
  .select('id, handle, display_name, description, github_url, github_full_name, website_url, tool_count, github_stars, github_pushed_at')
  .is('promoted_at', null)
  .gte('github_stars', MIN_STARS)
  .gte('github_pushed_at', activeCutoff)
  .not('github_archived', 'is', true)
  .order('github_stars', { ascending: false });

console.log(`[glama-promoter] ${qualifiers?.length ?? 0} candidates pass the gate (>= ${MIN_STARS} stars, pushed < ${ACTIVE_DAYS}d, not archived)`);

if (!WRITE) {
  console.log('[glama-promoter] DRY RUN — top qualifiers:');
  for (const q of (qualifiers || []).slice(0, 10)) {
    console.log(` ${q.github_stars}★ ${q.handle} (${q.github_full_name})`);
  }
  console.log('[glama-promoter] re-run with --write after Kris approves the counts.');
  process.exit(0);
}

// 4. Promote (write mode — Kris-approved counts only)
let promoted = 0, failed = 0;
for (const q of qualifiers || []) {
  const { data: existing } = await sb.from('agents').select('id').eq('handle', q.handle).maybeSingle();
  let agentId = existing?.id;
  if (!agentId) {
    const { data, error: insErr } = await sb
      .from('agents')
      .insert({
        handle: q.handle,
        display_name: q.display_name,
        bio: q.description,
        github_url: q.github_url,
        github_full_name: q.github_full_name,
        website_url: q.website_url,
        primary_category: 'mcp_server',
        tier: 'indexed',
        entity_type: 'agent',
        verified_source: 'glama',
        activity_status: 'active',
        last_event_at: q.github_pushed_at,
      })
      .select('id')
      .single();
    if (insErr) { failed++; continue; }
    agentId = data.id;
  }
  await sb.from('mcp_server_metadata').upsert(
    { agent_id: agentId, tool_count: q.tool_count, registry_listings: ['glama'] },
    { onConflict: 'agent_id' }
  );
  await sb.from('glama_mcp_candidates').update({ promoted_at: new Date().toISOString(), promoted_agent_id: agentId }).eq('id', q.id);
  promoted++;
}
console.log(`[glama-promoter] done: ${promoted} promoted into the index, ${failed} failed.`);
