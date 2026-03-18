import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const ENV_PATH = '/opt/agentcrush/scanner/.env';

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

async function loadEnvFile(path) {
  const text = await fs.readFile(path, 'utf8');
  const parsed = parseEnv(text);
  for (const [k, v] of Object.entries(parsed)) {
    if (!process.env[k]) process.env[k] = v;
  }
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
  await loadEnvFile(ENV_PATH);

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

  const { error: rankingError } = await supabase.rpc('recalc_rankings');

  if (rankingError) {
    console.error('ranking refresh failed', rankingError);
  } else {
    console.log('rankings refreshed');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
