import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'node:path';

const ENV_CANDIDATES = [
  '/opt/agentcrush/scanner/.env',
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

async function loadEnvFile(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    const parsed = parseEnv(text);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
    return true;
  } catch {
    return false;
  }
}

async function loadEnv() {
  for (const candidate of ENV_CANDIDATES) {
    if (await loadEnvFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'agentcrush-github-signal-worker'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: githubHeaders() });

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status} for ${url}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

async function main() {
  const envPath = await loadEnv();
  if (envPath) console.log(`Loaded env from ${envPath}`);

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, handle, display_name, github_full_name, github_repo_url')
    .not('github_full_name', 'is', null)
    .order('created_at', { ascending: false });

  if (agentsError) throw agentsError;

  let inserted = 0;
  let failed = 0;

  for (const agent of agents || []) {
    try {
      const fullName = agent.github_full_name;
      const repoUrl = `https://api.github.com/repos/${fullName}`;
      const releaseUrl = `https://api.github.com/repos/${fullName}/releases/latest`;

      const repo = await fetchJson(repoUrl);
      if (!repo) {
        console.log(`skip ${agent.handle}: repo not found`);
        continue;
      }

      const release = await fetchJson(releaseUrl);

      const row = {
        agent_id: agent.id,
        github_full_name: fullName,
        stars: repo.stargazers_count ?? null,
        forks: repo.forks_count ?? null,
        open_issues: repo.open_issues_count ?? null,
        watchers: repo.subscribers_count ?? repo.watchers_count ?? null,
        default_branch: repo.default_branch ?? null,
        pushed_at: repo.pushed_at ?? null,
        last_release_tag: release?.tag_name ?? null,
        last_release_published_at: release?.published_at ?? null,
        raw: {
          repo,
          latest_release: release
        }
      };

      const { error: insertError } = await supabase
        .from('github_repo_snapshots')
        .insert(row);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('agents')
        .update({
          github_repo_url: agent.github_repo_url || repo.html_url || null,
          github_default_branch: repo.default_branch || null,
          github_last_synced_at: new Date().toISOString()
        })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      inserted += 1;
      console.log(`ok ${agent.handle} -> ${fullName}`);
    } catch (err) {
      failed += 1;
      console.error(`fail ${agent.handle}:`, err.message);
    }
  }

  console.log(JSON.stringify({
    scanned: (agents || []).length,
    inserted,
    failed
  }, null, 2));

  const { data: signalResult, error: signalError } =
    await supabase.rpc('process_github_signals');

  if (signalError) {
    console.error('signal processing failed', signalError);
  } else {
    console.log('signals emitted:', signalResult);
  }

  const { data: xSignalResult, error: xSignalError } =
    await supabase.rpc('process_x_signals');

  if (xSignalError) {
    console.error('x signal processing failed', xSignalError);
  } else {
    console.log('x signals emitted:', xSignalResult);
  }

  const { data: relSignalResult, error: relSignalError } =
    await supabase.rpc('process_relationship_signals');

  if (relSignalError) {
    console.error('relationship signal processing failed', relSignalError);
  } else {
    console.log('relationship signals emitted:', relSignalResult);
  }

  const { error: rankingError } = await supabase.rpc('recalc_rankings');

  if (rankingError) {
    console.error('ranking refresh failed', rankingError);
  } else {
    console.log('rankings refreshed');

    // --- CHANGE 1: Write per-agent daily snapshot ---
    // Reads the freshly-computed rankings table and upserts one row per agent
    // into agent_daily_snapshots keyed on (agent_id, snapshot_date).
    // Idempotent: reruns within the same UTC day overwrite scores in place.
    const todayDate = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0];

    const { data: rankingRows, error: rankFetchError } = await supabase
      .from('rankings')
      .select('agent_id, score_total, score_visibility, score_reputation, global_rank');

    if (rankFetchError) {
      console.error('snapshot: failed to fetch rankings', rankFetchError);
    } else {
      const snapshotRows = (rankingRows || []).map(r => ({
        agent_id:         r.agent_id,
        snapshot_date:    todayDate,
        score_total:      r.score_total,
        score_visibility: r.score_visibility,
        score_reputation: r.score_reputation,
        global_rank:      r.global_rank,
      }));

      const { error: snapshotUpsertError } = await supabase
        .from('agent_daily_snapshots')
        .upsert(snapshotRows, { onConflict: 'agent_id,snapshot_date' });

      if (snapshotUpsertError) {
        console.error('snapshot write failed', snapshotUpsertError);
      } else {
        console.log(`snapshots written: ${snapshotRows.length}`);

        // --- CHANGE 2: Compute and write weekly_delta ---
        // Strategy (3 queries total, not N):
        //   1. Batch-fetch 7-day-ago snapshots for all agents.
        //   2. For agents missing a 7d row, batch-fetch their oldest prior
        //      snapshot as a fallback baseline (so new agents still show delta).
        //   3. Loop: compute delta, UPDATE agents.weekly_delta per agent.
        // Agents with zero historical snapshots are skipped (weekly_delta stays null).
        const agentIds = snapshotRows.map(r => r.agent_id);
        const todayScoreById = new Map(
          snapshotRows.map(r => [r.agent_id, r.score_total ?? 0])
        );

        // Query 1: 7-day-ago snapshots (one round-trip for all agents)
        const { data: snaps7d } = await supabase
          .from('agent_daily_snapshots')
          .select('agent_id, score_total')
          .eq('snapshot_date', sevenDaysAgo)
          .in('agent_id', agentIds);

        const snap7dById = new Map(
          (snaps7d || []).map(s => [s.agent_id, s.score_total ?? 0])
        );

        // Query 2: oldest prior snapshot for agents missing a 7d row
        const missingIds = agentIds.filter(id => !snap7dById.has(id));
        const oldestById = new Map();

        if (missingIds.length > 0) {
          const { data: oldestSnaps } = await supabase
            .from('agent_daily_snapshots')
            .select('agent_id, score_total, snapshot_date')
            .in('agent_id', missingIds)
            .lt('snapshot_date', todayDate)
            .order('snapshot_date', { ascending: true });

          for (const snap of (oldestSnaps || [])) {
            if (!oldestById.has(snap.agent_id)) {
              oldestById.set(snap.agent_id, snap.score_total ?? 0);
            }
          }
        }

        // Compute deltas and write back to agents.weekly_delta
        let updatedCount = 0;
        let noBaselineCount = 0;

        for (const agentId of agentIds) {
          const todayScore = todayScoreById.get(agentId) ?? 0;
          const baseline = snap7dById.has(agentId)
            ? snap7dById.get(agentId)
            : oldestById.get(agentId) ?? null;

          if (baseline === null) {
            noBaselineCount++;
            continue;
          }

          const delta = todayScore - baseline;

          const { error: deltaError } = await supabase
            .from('agents')
            .update({ weekly_delta: delta })
            .eq('id', agentId);

          if (!deltaError) updatedCount++;
        }

        console.log(`weekly_delta updated: ${updatedCount} agents, ${noBaselineCount} had no historical baseline`);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
