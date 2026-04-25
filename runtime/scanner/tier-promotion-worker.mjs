/**
 * Tier promotion worker.
 *
 * Promotes indexed agents to evidence_ranked when their v2 public evidence
 * flag becomes true. Never demotes evidence_ranked agents — only warns.
 *
 * Modes:
 *   --dry-run   (default) Query, diff, and report. No writes.
 *   --write     Apply promotions: UPDATE agents SET tier='evidence_ranked'.
 *
 * Evidence criterion (from agent_score_v2_rank_comparison):
 *   evidence_ready_for_public_rank = TRUE
 *   i.e. active_weight_total >= 0.55 OR
 *        (current_rank <= 100 AND active_weight_total >= 0.45)
 *
 * Safety contract:
 *   Never modifies rankings, rankings.score_total, rankings.global_rank.
 *   Never calls recalc_rankings().
 *   Never demotes or archives agents automatically.
 *   Never deletes rows.
 *   Writes only: agents.tier, agents.tier_promoted_at.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const ENV_PATHS = [
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

// ─── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, write: false };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') { args.dryRun = true; continue; }
    if (arg === '--write')   { args.write  = true; continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.dryRun && args.write) {
    throw new Error('Cannot use --dry-run and --write together. Pick one.');
  }
  if (!args.dryRun && !args.write) {
    // Default to dry-run
    args.dryRun = true;
  }

  return args;
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
      // Optional env files vary by deployment.
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  const mode = args.write ? 'WRITE' : 'DRY-RUN';
  console.log(`[tier-promotion] mode=${mode} started ${new Date().toISOString()}`);

  await loadEnvFiles(ENV_PATHS);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  // ── 1. Fetch evidence-ready agents from v2 rank comparison view ──────────────

  const { data: eligible, error: eligibleErr } = await supabase
    .from('agent_score_v2_rank_comparison')
    .select('agent_id, handle, display_name, active_weight_total, coverage_tier, current_rank, rank_v2_c, score_v2_c_public_candidate')
    .eq('evidence_ready_for_public_rank', true);

  if (eligibleErr) throw new Error(`Failed to query eligible agents: ${eligibleErr.message}`);

  const eligibleIds = new Set((eligible || []).map(r => r.agent_id));
  console.log(`[tier-promotion] evidence_ready agents: ${eligibleIds.size}`);

  // ── 2. Fetch current tier state from agents table ────────────────────────────

  const { data: currentAgents, error: agentsErr } = await supabase
    .from('agents')
    .select('id, handle, tier, tier_promoted_at')
    .in('tier', ['evidence_ranked', 'indexed']);

  if (agentsErr) throw new Error(`Failed to query agents: ${agentsErr.message}`);

  const currentByTier = {};
  for (const a of currentAgents || []) {
    currentByTier[a.tier] = (currentByTier[a.tier] || []);
    currentByTier[a.tier].push(a);
  }

  const currentEvidenceRanked = (currentByTier['evidence_ranked'] || []);
  const currentIndexed        = (currentByTier['indexed'] || []);

  const currentEvidenceIds = new Set(currentEvidenceRanked.map(a => a.id));
  const currentIndexedIds  = new Set(currentIndexed.map(a => a.id));

  console.log(`[tier-promotion] current: evidence_ranked=${currentEvidenceIds.size}, indexed=${currentIndexedIds.size}`);

  // ── 3. Compute diff ──────────────────────────────────────────────────────────

  // Agents to promote: currently indexed but now evidence_ready
  const toPromote = (eligible || []).filter(r => currentIndexedIds.has(r.agent_id));

  // Agents to warn: currently evidence_ranked but no longer evidence_ready
  const droppedWarnings = currentEvidenceRanked.filter(a => !eligibleIds.has(a.id));

  // ── 4. Report ────────────────────────────────────────────────────────────────

  console.log(`\n[tier-promotion] === Promotion candidates (${toPromote.length}) ===`);
  for (const r of toPromote) {
    console.log(
      `  PROMOTE  handle=${r.handle}  active_weight=${r.active_weight_total}` +
      `  coverage=${r.coverage_tier}  current_rank=${r.current_rank ?? 'unranked'}` +
      `  rank_v2_c=${r.rank_v2_c}  score_v2c_pub=${r.score_v2_c_public_candidate}`
    );
  }

  if (droppedWarnings.length > 0) {
    console.log(`\n[tier-promotion] === WARNING: evidence_ranked agents below threshold (${droppedWarnings.length}) ===`);
    console.log('[tier-promotion] These agents are NOT auto-demoted. Manual review required.');
    for (const a of droppedWarnings) {
      console.log(
        `  WARN  handle=${a.handle}  tier_promoted_at=${a.tier_promoted_at}  (no longer evidence_ready)`
      );
    }
  }

  console.log(`\n[tier-promotion] Summary:`);
  console.log(`  Currently evidence_ranked : ${currentEvidenceIds.size}`);
  console.log(`  Currently indexed         : ${currentIndexedIds.size}`);
  console.log(`  New promotions            : ${toPromote.length}`);
  console.log(`  Already evidence_ranked   : ${(eligible || []).filter(r => currentEvidenceIds.has(r.agent_id)).length}`);
  console.log(`  Dropped warnings          : ${droppedWarnings.length}`);

  if (args.dryRun) {
    console.log('\n[tier-promotion] DRY-RUN complete. No writes made. Re-run with --write to apply.');
    return;
  }

  // ── 5. Apply promotions ──────────────────────────────────────────────────────

  if (toPromote.length === 0) {
    console.log('\n[tier-promotion] No new promotions to apply.');
    return;
  }

  const promoteIds = toPromote.map(r => r.agent_id);
  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('agents')
    .update({ tier: 'evidence_ranked', tier_promoted_at: now })
    .in('id', promoteIds)
    .eq('tier', 'indexed'); // guard: only promote from indexed, never touch archived

  if (updateErr) throw new Error(`Promotion update failed: ${updateErr.message}`);

  console.log(`\n[tier-promotion] WRITE complete. Promoted ${promoteIds.length} agents to evidence_ranked.`);
  for (const r of toPromote) {
    console.log(`  PROMOTED  handle=${r.handle}  agent_id=${r.agent_id}`);
  }

  // ── 6. Post-write verification ───────────────────────────────────────────────

  const { data: verifyRows, error: verifyErr } = await supabase
    .from('agents')
    .select('tier')
    .in('tier', ['evidence_ranked', 'indexed', 'archived']);

  if (verifyErr) {
    console.warn(`[tier-promotion] Post-write verification query failed: ${verifyErr.message}`);
  } else {
    const counts = {};
    for (const r of verifyRows || []) {
      counts[r.tier] = (counts[r.tier] || 0) + 1;
    }
    console.log('\n[tier-promotion] Post-write tier counts:');
    for (const [t, n] of Object.entries(counts).sort()) {
      console.log(`  ${t}: ${n}`);
    }
  }
}

main().catch(err => {
  console.error('[tier-promotion] FATAL:', err.message);
  process.exit(1);
});
