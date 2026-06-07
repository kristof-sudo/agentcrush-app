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
        handle, name, description, category, tier, score, rank,
        github_stars, github_forks, follower_count, weekly_delta,
        identity_type, claim_status, visibility,
        erc8004_verified, x402_enabled, homepage_url,
        created_at, updated_at
      `)
      .order('rank', { ascending: true, nullsFirst: false })
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
  // Most recent snapshot per agent — use a subquery via RPC or manual approach
  const PAGE = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('agent_snapshots')
      .select('handle, snapshot_date, score, rank, weekly_delta, follower_count, github_stars')
      .order('snapshot_date', { ascending: false })
      .order('handle', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase snapshots: ${error.message}`);
    if (!data || data.length === 0) break;
    // Keep only the most recent per handle
    for (const row of data) {
      if (!rows.find(r => r.handle === row.handle)) rows.push(row);
    }
    if (data.length < PAGE) break;
    if (rows.length >= 5000) break; // safety cap
    from += PAGE;
  }
  return rows;
}

// ── Serialisers ───────────────────────────────────────────────────────────────

function agentToRecord(agent) {
  return {
    handle: agent.handle,
    name: agent.name || null,
    description: agent.description ? agent.description.slice(0, 500) : null,
    category: agent.category || null,
    tier: agent.tier || null,
    score: agent.score != null ? Number(agent.score) : null,
    rank: agent.rank != null ? Number(agent.rank) : null,
    github_stars: agent.github_stars != null ? Number(agent.github_stars) : null,
    github_forks: agent.github_forks != null ? Number(agent.github_forks) : null,
    follower_count: agent.follower_count != null ? Number(agent.follower_count) : null,
    weekly_delta: agent.weekly_delta != null ? Number(agent.weekly_delta) : null,
    identity_type: agent.identity_type || null,
    claim_status: agent.claim_status || null,
    visibility: agent.visibility || null,
    erc8004_verified: agent.erc8004_verified ?? false,
    x402_enabled: agent.x402_enabled ?? false,
    homepage_url: agent.homepage_url || null,
    profile_url: `https://agentcrush.xyz/rankings/${agent.category || 'developer'}/${agent.handle}`,
    updated_at: agent.updated_at || null,
    // Attribution
    _source: 'agentcrush.xyz',
    _license: 'CC-BY-4.0',
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

// ── HuggingFace upload ────────────────────────────────────────────────────────

async function hfUpload(repoId, filePath, content, contentType = 'application/octet-stream') {
  const url = `https://huggingface.co/api/datasets/${repoId}/raw/main/${filePath}`;
  const body = typeof content === 'string' ? Buffer.from(content) : content;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': contentType,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HF upload ${res.status} for ${filePath}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[hf-exporter] date=${TODAY} repo=${HF_REPO} dry-run=${DRY_RUN}`);

  console.log('[hf-exporter] Fetching agents from Supabase…');
  const agents = await fetchAllAgents();
  console.log(`[hf-exporter] ${agents.length} agents loaded`);

  const allRecords = agents.map(agentToRecord);
  const evidenceRanked = allRecords.filter(a => a.tier === 'evidence_ranked');
  console.log(`[hf-exporter] ${evidenceRanked.length} evidence-ranked`);

  let snapshots = [];
  try {
    snapshots = await fetchLatestSnapshots();
    console.log(`[hf-exporter] ${snapshots.length} snapshots loaded`);
  } catch (e) {
    console.warn(`[hf-exporter] Snapshots fetch failed (non-fatal): ${e.message}`);
  }

  const datasetCard = buildDatasetCard(allRecords.length, evidenceRanked.length);

  if (DRY_RUN) {
    console.log(`\n[hf-exporter] DRY RUN — first 3 agents:`);
    allRecords.slice(0, 3).forEach(r => console.log(JSON.stringify(r)));
    console.log(`\n[hf-exporter] Would upload to: https://huggingface.co/datasets/${HF_REPO}`);
    console.log('[hf-exporter] Files:');
    console.log(`  data/agents.jsonl         ${allRecords.length} rows`);
    console.log(`  data/evidence-ranked.jsonl ${evidenceRanked.length} rows`);
    console.log(`  data/snapshots-latest.jsonl ${snapshots.length} rows`);
    console.log(`  README.md`);
    return;
  }

  console.log('[hf-exporter] Uploading to HuggingFace…');

  await hfUpload(HF_REPO, 'data/agents.jsonl', toJsonl(allRecords));
  console.log(`[hf-exporter] ✓ data/agents.jsonl`);

  await hfUpload(HF_REPO, 'data/evidence-ranked.jsonl', toJsonl(evidenceRanked));
  console.log(`[hf-exporter] ✓ data/evidence-ranked.jsonl`);

  if (snapshots.length > 0) {
    await hfUpload(HF_REPO, 'data/snapshots-latest.jsonl', toJsonl(
      snapshots.map(s => ({ ...s, _source: 'agentcrush.xyz', _export_date: TODAY }))
    ));
    console.log(`[hf-exporter] ✓ data/snapshots-latest.jsonl`);
  }

  await hfUpload(HF_REPO, 'README.md', datasetCard, 'text/markdown');
  console.log(`[hf-exporter] ✓ README.md (dataset card)`);

  console.log(`[hf-exporter] Done. https://huggingface.co/datasets/${HF_REPO}`);
}

main().catch(err => {
  console.error(`[hf-exporter] FATAL: ${err.message}`);
  process.exit(1);
});
