#!/usr/bin/env node
/**
 * promote-a2a-to-agents.mjs
 *
 * Promote high-signal A2A repos from `a2a_agents` source table into the
 * main `agents` table at tier='indexed'. They then flow through the
 * existing signal pipeline (github-snapshot-worker, etc.) and earn
 * evidence_ranked the normal way — NO special promotion path.
 *
 * Kris-approved threshold (2026-05-14):
 *   signal_strength >= 60
 *
 * Idempotent: skips if a similar github_full_name is already in agents.
 *
 * Usage:
 *   node scripts/promote-a2a-to-agents.mjs --dry-run
 *   node scripts/promote-a2a-to-agents.mjs --write
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite  = args.includes('--write');
const maxArg   = args.indexOf('--max');
const MAX      = maxArg >= 0 ? parseInt(args[maxArg + 1], 10) : Infinity;

if (!isDryRun && !isWrite) {
  console.error('Pass --dry-run or --write');
  process.exit(1);
}

const ENV_CANDIDATES = [
  '/opt/agentcrush/selector/.env',
  '/opt/agentcrush/copydesk/.env',
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of ENV_CANDIDATES) {
  try {
    const text = await fs.readFile(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function makeHandle(owner, name) {
  const slug = `${owner}_${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
  return slug || 'a2a_unnamed';
}

async function uniqueHandle(handle) {
  let candidate = handle;
  let i = 1;
  while (true) {
    const { data } = await sb.from('agents').select('id').eq('handle', candidate).maybeSingle();
    if (!data) return candidate;
    i++;
    candidate = `${handle}_${i}`;
    if (i > 99) throw new Error(`couldn't find unique handle for ${handle}`);
  }
}

console.log(`[promote-a2a] mode=${isDryRun ? 'DRY-RUN' : 'WRITE'} max=${MAX === Infinity ? 'all' : MAX}`);

const { data: candidates, error: queryErr } = await sb
  .from('a2a_agents')
  .select('repo_full_name, repo_url, name, owner, description, stars, forks, language, homepage_url, signal_strength')
  .gte('signal_strength', 60)
  .order('signal_strength', { ascending: false });

if (queryErr) {
  console.error('query failed:', queryErr.message);
  process.exit(1);
}

const qualifying = (candidates || []).slice(0, MAX === Infinity ? candidates.length : MAX);
console.log(`[promote-a2a] ${qualifying.length} qualifying (signal_strength >= 60)`);

if (qualifying.length === 0) {
  console.log('[promote-a2a] nothing to do');
  process.exit(0);
}

console.log('[promote-a2a] sample (first 3):');
for (const c of qualifying.slice(0, 3)) {
  console.log(`  ${c.repo_full_name} — ${c.stars} stars, signal ${c.signal_strength}`);
}

if (isDryRun) {
  console.log('[promote-a2a] DRY-RUN — no writes');
  process.exit(0);
}

let inserted = 0, alreadyMapped = 0, failed = 0;

for (const a of qualifying) {
  // Already in agents via github_full_name?
  const { data: existing } = await sb
    .from('agents')
    .select('id, handle')
    .ilike('github_full_name', a.repo_full_name)
    .maybeSingle();
  if (existing) {
    alreadyMapped++;
    continue;
  }

  const baseHandle = makeHandle(a.owner, a.name);
  const handle = await uniqueHandle(baseHandle);

  const row = {
    handle,
    display_name: a.name,
    tagline: (a.description || '').slice(0, 200),
    bio: a.description || null,
    archetype: 'Builder',
    tier: 'indexed', // explicitly NOT a new tier per Kris — earn evidence_ranked normally
    github_url: a.repo_url,
    github_full_name: a.repo_full_name,
    github_repo_url: a.repo_url,
    website_url: a.homepage_url || null,
    identity_status: 'unverified',
    visibility_score: 0,
    reputation_score: 0,
    weekly_delta: 0,
    ecosystem_layer: 'agent',
    status: 'active',
  };

  const { error: insErr } = await sb.from('agents').insert(row);
  if (insErr) { failed++; console.warn(`  insert fail ${a.repo_full_name} (${handle}): ${insErr.message}`); }
  else { inserted++; if (inserted <= 5) console.log(`  + ${handle} ← ${a.repo_full_name}`); }
}

console.log(`\n[promote-a2a] inserted=${inserted} already-mapped=${alreadyMapped} failed=${failed}`);
