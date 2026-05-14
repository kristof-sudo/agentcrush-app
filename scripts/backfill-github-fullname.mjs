#!/usr/bin/env node
/**
 * backfill-github-fullname.mjs
 *
 * The scoring pipeline (runtime/scanner/github-snapshot-worker.mjs) filters
 * agents on `github_full_name IS NOT NULL`. Many agents — especially those
 * imported via the github-mapping route — have `github_url` populated but
 * `github_full_name` and `github_repo_url` NULL. Those agents get zero
 * GitHub scoring and stay stuck at tier='indexed' even when they have
 * massive repos (e.g. NousResearch/hermes-agent with 143k stars).
 *
 * This script parses `github_url` → fills `github_full_name` (owner/repo)
 * and `github_repo_url` (the canonical URL). Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/backfill-github-fullname.mjs --dry-run
 *   node scripts/backfill-github-fullname.mjs --write
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite = args.includes('--write');
if (!isDryRun && !isWrite) {
  console.error('Pass --dry-run or --write');
  process.exit(1);
}

// Load env
const ENV_CANDIDATES = [
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {
    // optional
  }
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function parseGitHubUrl(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/?#.]+)/i);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, '');
  return { owner, repo, fullName: `${owner}/${repo}`, repoUrl: `https://github.com/${owner}/${repo}` };
}

// Fetch all agents that need backfill
const { data: agents, error } = await supabase
  .from('agents')
  .select('id, handle, github_url, github_full_name, github_repo_url')
  .not('github_url', 'is', null)
  .is('github_full_name', null);

if (error) {
  console.error('Query failed:', error.message);
  process.exit(1);
}

console.log(`Found ${agents.length} agents with github_url but no github_full_name.`);

let parsed = 0;
let parseFailed = 0;
let updated = 0;
let updateFailed = 0;
const sample = [];

for (const a of agents) {
  const gh = parseGitHubUrl(a.github_url);
  if (!gh) {
    parseFailed++;
    if (parseFailed <= 5) console.warn(`  parse failed: ${a.handle} | ${a.github_url}`);
    continue;
  }
  parsed++;
  if (sample.length < 3) sample.push({ handle: a.handle, ...gh });

  if (isWrite) {
    const { error: updErr } = await supabase
      .from('agents')
      .update({
        github_full_name: gh.fullName,
        github_repo_url: gh.repoUrl,
      })
      .eq('id', a.id);
    if (updErr) {
      updateFailed++;
      if (updateFailed <= 5) console.warn(`  update failed: ${a.handle}: ${updErr.message}`);
    } else {
      updated++;
    }
  }
}

console.log(`\nSummary:`);
console.log(`  Eligible:       ${agents.length}`);
console.log(`  Parsed OK:      ${parsed}`);
console.log(`  Parse failed:   ${parseFailed}`);
if (isWrite) {
  console.log(`  Updated:        ${updated}`);
  console.log(`  Update failed:  ${updateFailed}`);
} else {
  console.log(`  (Dry-run — no writes)`);
}
console.log(`\nSample parsed:`);
for (const s of sample) console.log(`  ${s.handle} → ${s.fullName}`);
