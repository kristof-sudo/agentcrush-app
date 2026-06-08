/**
 * HuggingFace Dataset Exporter — Phase R-4.8
 *
 * Exports the AgentCrush agent index as a daily-updated HuggingFace dataset:
 *   huggingface.co/datasets/agentcrush/agents-index
 *
 * Output files uploaded to the HF dataset repo:
 *   data/agents.jsonl           — one agent per line, all indexed agents
 *   data/evidence-ranked.jsonl  — evidence_ranked tier only
 *   data/snapshots-latest.jsonl — most recent snapshot per agent (score/rank/delta)
 *   README.md                   — auto-generated dataset card (HF format)
 *
 * Why this matters: HuggingFace datasets are in the training corpus of Llama,
 * Qwen, DeepSeek, Mistral, and dozens of fine-tunes. A daily-updated dataset
 * means future models know about AgentCrush, our methodology, and our agents
 * without any further work.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — database source
 *   HUGGINGFACE_TOKEN                        — write token for agentcrush org
 *   HF_DATASET_REPO  (default: agentcrush/agents-index)
 *
 * Usage:
 *   node hf-dataset-exporter.mjs             # production
 *   node hf-dataset-exporter.mjs --dry-run   # print rows, don't upload
 *   node hf-dataset-exporter.mjs --limit 100 # cap rows for testing
 *
 * Systemd timer: daily 01:00 UTC (after nightly snapshot cron at 02:00 UTC the
 * previous day — agent data is ~22h fresh at export time).
 *
 * Blockers before first run:
 *   1. Create HuggingFace account / org at huggingface.co/agentcrush
 *   2. Create dataset repo: huggingface.co/datasets/agentcrush/agents-index
 *   3. Generate write token at huggingface.co/settings/tokens
 *   4. Add HUGGINGFACE_TOKEN to /opt/agentcrush/fetchers/.env
 *   5. Deploy this file + systemd timer to VPS
 */

import { createClient } from '@supabase/supabase-js';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? Number(args[limitIdx + 1]) : null;

// ── Env ───────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const HF_REPO = process.env.HF_DATASET_REPO || 'agentcrush/agents-index';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[hf-exporter] FATAL: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(2);
}
if (!HF_TOKEN && !DRY_RUN) {
  console.error('[hf-exporter] FATAL: HUGGINGFACE_TOKEN required (or use --dry-run)');
  console.error('[hf-exporter] Get a token at: https://huggingface.co/settings/tokens');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TODAY = new Date().toISOString().slice(0, 10);

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchAllAgents() {
  const PAGE = LIMIT || 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('agents')
      .select(`
        id, handle, display_name, bio, primary_category, tier,
        weekly_delta, identity_type, claim_status, visibility_score,
        verified, website_url, github_url, x_handle, hf_author,
        last_event_at, activity_status, created_at
      `)
      .order('visibility_score', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase agents: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (LIMIT && rows.length >= LIMIT) break;
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

async function fetchLatestSnapshots() {
  // Most recent snapshot per agent. agent_snapshots is keyed on agent_id (UUID),
  // not handle — pass a handle->id map from the caller to remap.
  const PAGE = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('agent_snapshots')
      .select('agent_id, snapshot_date, score, rank, follower_count, github_stars')
      .order('snapshot_date', { ascending: false })
      .order('agent_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase snapshots: ${error.message}`);
    if (!data || data.length === 0) break;
    // Keep only the most recent per agent_id
    for (const row of data) {
      if (!rows.find(r => r.agent_id === row.agent_id)) rows.push(row);
    }
    if (data.length < PAGE) break;
    if (rows.length >= 5000) break; // safety cap
    from += PAGE;
  }
  return rows;
}

// ── Serialisers ───────────────────────────────────────────────────────────────

function agentToRecord(agent, snapshot) {
  return {
    handle:           agent.handle,
    display_name:     agent.display_name || null,
    bio:              agent.bio ? agent.bio.slice(0, 500) : null,
    primary_category: agent.primary_category || null,
    tier:             agent.tier || null,
    visibility_score: agent.visibility_score != null ? Number(agent.visibility_score) : null,
    score:            snapshot?.score != null ? Number(snapshot.score) : null,
    rank:             snapshot?.rank  != null ? Number(snapshot.rank)  : null,
    github_stars:     snapshot?.github_stars   != null ? Number(snapshot.github_stars)   : null,
    follower_count:   snapshot?.follower_count != null ? Number(snapshot.follower_count) : null,
    weekly_delta:     agent.weekly_delta != null ? Number(agent.weekly_delta) : null,
    identity_type:    agent.identity_type || null,
    claim_status:     agent.claim_status || null,
    verified:         agent.verified ?? false,
    activity_status:  agent.activity_status || null,
    last_event_at:    agent.last_event_at || null,
    website_url:      agent.website_url || null,
    github_url:       agent.github_url || null,
    x_handle:         agent.x_handle || null,
    hf_author:        agent.hf_author || null,
    profile_url:      `https://agentcrush.xyz/agent/${agent.handle}`,
    snapshot_date:    snapshot?.snapshot_date || null,
    _source:   'agentcrush.xyz',
    _license:  'CC-BY-4.0',
    _export_date: TODAY,
  };
}

function toJsonl(records) {
  return records.map(r => JSON.stringify(r)).join('\n') + '\n';
}

// ── Dataset card (README.md) ─────────────────────────────────────────────────

function buildDatasetCard(agentCount, evidenceRankedCount) {
  return `---
license: cc-by-4.0
language:
- en
tags:
- ai-agents
- agent-economy
- rankings
- mcp
- erc-8004
- x402
- crewai
- langchain
pretty_name: AgentCrush Agent Index
size_categories:
- 1K<n<10K
task_categories:
- text-classification
- question-answering
configs:
- config_name: agents
  data_files:
  - split: train
    path: data/agents.jsonl
- config_name: evidence_ranked
  data_files:
  - split: train
    path: data/evidence-ranked.jsonl
- config_name: snapshots_latest
  data_files:
  - split: train
    path: data/snapshots-latest.jsonl
---

# AgentCrush Agent Index

Evidence-ranked index of the AI agent economy. Updated daily from [agentcrush.xyz](https://agentcrush.xyz).

## Overview

- **${agentCount.toLocaleString()} agents** indexed across categories: developer tools, tokenized agents, service agents, model families
- **${evidenceRankedCount.toLocaleString()} evidence-ranked** with verified multi-signal scores
- Updated: **${TODAY}**

## Configs

| Config | Description | Rows |
|---|---|---|
| \`agents\` | All indexed agents with metadata | ~${agentCount.toLocaleString()} |
| \`evidence_ranked\` | Evidence-ranked tier only | ~${evidenceRankedCount.toLocaleString()} |
| \`snapshots_latest\` | Most recent snapshot per agent | ~${agentCount.toLocaleString()} |

## Schema

| Field | Type | Description |
|---|---|---|
| \`handle\` | string | Unique identifier (e.g. \`crewai\`, \`aixbt_agent\`) |
| \`name\` | string | Display name |
| \`category\` | string | \`developer\` \| \`tokenized\` \| \`service\` \| \`model_family\` |
| \`tier\` | string | \`evidence_ranked\` \| \`indexed\` \| \`archived\` |
| \`score\` | float | 0–100 composite score |
| \`rank\` | int | Rank within category |
| \`weekly_delta\` | int | Rank change vs previous week |
| \`github_stars\` | int | GitHub stars (if applicable) |
| \`follower_count\` | int | X/Farcaster follower count |
| \`erc8004_verified\` | bool | On-chain ERC-8004 identity verified |
| \`x402_enabled\` | bool | x402 payment endpoint active |
| \`profile_url\` | string | Full profile URL on agentcrush.xyz |

## Usage

\`\`\`python
from datasets import load_dataset

# All agents
ds = load_dataset("agentcrush/agents-index", "agents")

# Evidence-ranked only
top = load_dataset("agentcrush/agents-index", "evidence_ranked")

# Check a specific agent
df = ds["train"].to_pandas()
agent = df[df["handle"] == "crewai"].iloc[0]
\`\`\`

\`\`\`python
# Filter by category
developer_agents = df[df["category"] == "developer"].sort_values("rank")

# Top movers this week
movers = df[df["weekly_delta"] > 5].sort_values("weekly_delta", ascending=False)

# ERC-8004 verified agents
verified = df[df["erc8004_verified"] == True]
\`\`\`

## Methodology

Rankings use per-category multi-signal scoring:
- **Developer**: GitHub stars, forks, follower counts, activity signals
- **Tokenized**: market cap, liquidity, holder count, momentum
- **Service**: adoption, protocol presence, activity, forks
- **Model family**: HF downloads, LMArena scores, derivatives, citations

Full methodology: [agentcrush.xyz/methodology](https://agentcrush.xyz/methodology)

## License

[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
Attribution: AgentCrush (agentcrush.xyz)

## Citation

\`\`\`bibtex
@misc{agentcrush2026,
  title={AgentCrush Agent Economy Index},
  author={AgentCrush},
  year={2026},
  url={https://agentcrush.xyz},
  note={Daily-updated dataset. agentcrush.xyz/methodology}
}
\`\`\`
`;
}

// ── HuggingFace upload (via commit API; single multi-file commit) ────────────

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

function runGit(cwd, args) {
  const res = spawnSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  }
  return res.stdout;
}

async function hfCommitFiles(repoId, files /* [{path, content}] */) {
  const work = mkdtempSync(join(tmpdir(), 'hf-ds-'));
  try {
    const cloneUrl = `https://user:${HF_TOKEN}@huggingface.co/datasets/${repoId}`;
    runGit(work, ['clone', '--depth', '1', cloneUrl, 'repo']);
    const repoDir = join(work, 'repo');
    runGit(repoDir, ['config', 'user.email', 'ops@agentcrush.xyz']);
    runGit(repoDir, ['config', 'user.name', 'AgentCrush Exporter']);

    for (const f of files) {
      const abs = join(repoDir, f.path);
      mkdirSync(dirname(abs), { recursive: true });
      const buf = typeof f.content === 'string' ? Buffer.from(f.content) : f.content;
      writeFileSync(abs, buf);
    }

    runGit(repoDir, ['add', '-A']);
    const status = runGit(repoDir, ['status', '--porcelain']);
    if (!status.trim()) return { unchanged: true };
    runGit(repoDir, ['commit', '-m', `data: AgentCrush daily export ${TODAY}`]);
    runGit(repoDir, ['push', 'origin', 'HEAD:main']);
    return { unchanged: false };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[hf-exporter] date=${TODAY} repo=${HF_REPO} dry-run=${DRY_RUN}`);

  console.log('[hf-exporter] Fetching agents from Supabase…');
  const agents = await fetchAllAgents();
  console.log(`[hf-exporter] ${agents.length} agents loaded`);

  let snapshots = [];
  try {
    snapshots = await fetchLatestSnapshots();
    console.log(`[hf-exporter] ${snapshots.length} snapshots loaded`);
  } catch (e) {
    console.warn(`[hf-exporter] Snapshots fetch failed (non-fatal): ${e.message}`);
  }

  // Build agent_id → latest-snapshot map and join into records.
  const snapByAgentId = new Map(snapshots.map(s => [s.agent_id, s]));
  const allRecords = agents.map(a => agentToRecord(a, snapByAgentId.get(a.id)));
  const evidenceRanked = allRecords.filter(a => a.tier === 'evidence_ranked');
  console.log(`[hf-exporter] ${evidenceRanked.length} evidence-ranked`);

  // Remap snapshots from agent_id to handle for the snapshots-latest file
  const handleById = new Map(agents.map(a => [a.id, a.handle]));
  const snapshotsWithHandle = snapshots
    .filter(s => handleById.has(s.agent_id))
    .map(s => ({
      handle: handleById.get(s.agent_id),
      snapshot_date: s.snapshot_date,
      score: s.score,
      rank: s.rank,
      follower_count: s.follower_count,
      github_stars: s.github_stars,
    }));

  const datasetCard = buildDatasetCard(allRecords.length, evidenceRanked.length);

  if (DRY_RUN) {
    console.log(`\n[hf-exporter] DRY RUN — first 3 agents:`);
    allRecords.slice(0, 3).forEach(r => console.log(JSON.stringify(r)));
    console.log(`\n[hf-exporter] Would upload to: https://huggingface.co/datasets/${HF_REPO}`);
    console.log('[hf-exporter] Files:');
    console.log(`  data/agents.jsonl         ${allRecords.length} rows`);
    console.log(`  data/evidence-ranked.jsonl ${evidenceRanked.length} rows`);
    console.log(`  data/snapshots-latest.jsonl ${snapshotsWithHandle.length} rows`);
    console.log(`  README.md`);
    return;
  }

  console.log('[hf-exporter] Uploading to HuggingFace via git push…');

  const files = [
    { path: 'data/agents.jsonl',           content: toJsonl(allRecords) },
    { path: 'data/evidence-ranked.jsonl',  content: toJsonl(evidenceRanked) },
    { path: 'README.md',                   content: datasetCard },
  ];
  if (snapshotsWithHandle.length > 0) {
    files.push({
      path: 'data/snapshots-latest.jsonl',
      content: toJsonl(snapshotsWithHandle.map(s => ({ ...s, _source: 'agentcrush.xyz', _export_date: TODAY }))),
    });
  }

  const result = await hfCommitFiles(HF_REPO, files);
  if (result.unchanged) {
    console.log('[hf-exporter] No changes to commit (data identical to last export).');
  } else {
    files.forEach(f => console.log(`[hf-exporter] ✓ ${f.path}`));
  }

  console.log(`[hf-exporter] Done. https://huggingface.co/datasets/${HF_REPO}`);
}

main().catch(err => {
  console.error(`[hf-exporter] FATAL: ${err.message}`);
  process.exit(1);
});
