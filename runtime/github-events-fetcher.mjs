/**
 * github-events-fetcher — Layer 1 deterministic fetcher (Phase 3 dep)
 *
 * Reads a JSON config of repos + usernames to watch, hits GitHub REST API,
 * aggregates recent events (commits, releases, PRs, issues, new contributors),
 * writes a structured JSON to the brain for downstream Layer 2 consumption
 * by competitor-watcher.
 *
 * No LLM — pure GitHub → JSON.
 *
 * Config (BRAIN_PATH/Fetchers/github-events/config.json):
 *   {
 *     "repos": ["owner/repo", ...],
 *     "users": ["org-or-user", ...],
 *     "lookback_hours": 24
 *   }
 *
 * Output: BRAIN_PATH/Fetchers/github-events/output/github-YYYY-MM-DD.json
 *
 * Env:
 *   GITHUB_TOKEN  — optional, raises rate limit from 60/h to 5000/h
 *   BRAIN_PATH    — default /opt/agentcrush-brain
 *
 * Exit codes: 0 always (single-fetcher failure shouldn't break the pipeline).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const RUN_DATE = process.env.RUN_DATE || new Date().toISOString().slice(0, 10);

const CONFIG_PATH = path.join(BRAIN_PATH, 'Fetchers', 'github-events', 'config.json');
const OUTPUT_DIR = path.join(BRAIN_PATH, 'Fetchers', 'github-events', 'output');

const headers = {
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'user-agent': 'agentcrush-github-events-fetcher/0.1',
};
if (GITHUB_TOKEN) headers.authorization = `Bearer ${GITHUB_TOKEN}`;

async function gh(url) {
  const res = await fetch(url, { headers });
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status} (remaining=${remaining}) ${url}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function withinLookback(isoTs, lookbackHours) {
  return Date.now() - new Date(isoTs).getTime() <= lookbackHours * 3600_000;
}

async function fetchRepoEvents(slug, lookbackHours) {
  // /events returns the most recent 30 events. For most repos this covers > 24h.
  const events = await gh(`https://api.github.com/repos/${slug}/events`);
  const fresh = events.filter((e) => withinLookback(e.created_at, lookbackHours));

  // Bucket by type for easy downstream summarization.
  const buckets = { PushEvent: [], ReleaseEvent: [], PullRequestEvent: [], IssuesEvent: [], CreateEvent: [], ForkEvent: [], WatchEvent: [], Other: [] };
  for (const e of fresh) {
    const key = buckets[e.type] ? e.type : 'Other';
    buckets[key].push({
      type: e.type,
      actor: e.actor?.login,
      created_at: e.created_at,
      payload_summary: summarizePayload(e),
    });
  }

  // Also pull latest release (in case it's outside the events window).
  let latestRelease = null;
  try {
    const rel = await gh(`https://api.github.com/repos/${slug}/releases/latest`);
    latestRelease = {
      tag: rel.tag_name,
      name: rel.name,
      published_at: rel.published_at,
      html_url: rel.html_url,
    };
  } catch (err) {
    // 404 = no releases — fine.
    if (!/^GitHub 404/.test(err.message)) console.warn(`[github-fetcher] ${slug} latest release: ${err.message}`);
  }

  return {
    repo: slug,
    fetched_at: new Date().toISOString(),
    lookback_hours: lookbackHours,
    event_counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
    events: buckets,
    latest_release: latestRelease,
  };
}

function summarizePayload(e) {
  const p = e.payload || {};
  switch (e.type) {
    case 'PushEvent':
      return { ref: p.ref, commits: (p.commits || []).map((c) => ({ sha: c.sha?.slice(0, 7), message: (c.message || '').split('\n')[0].slice(0, 200) })) };
    case 'ReleaseEvent':
      return { action: p.action, tag: p.release?.tag_name, name: p.release?.name };
    case 'PullRequestEvent':
      return { action: p.action, number: p.number, title: (p.pull_request?.title || '').slice(0, 200), merged: p.pull_request?.merged };
    case 'IssuesEvent':
      return { action: p.action, number: p.issue?.number, title: (p.issue?.title || '').slice(0, 200) };
    case 'CreateEvent':
      return { ref_type: p.ref_type, ref: p.ref };
    default:
      return null;
  }
}

async function fetchUserEvents(login, lookbackHours) {
  const events = await gh(`https://api.github.com/users/${login}/events/public`);
  const fresh = events
    .filter((e) => withinLookback(e.created_at, lookbackHours))
    .map((e) => ({
      type: e.type,
      repo: e.repo?.name,
      created_at: e.created_at,
      payload_summary: summarizePayload(e),
    }));
  return { user: login, fetched_at: new Date().toISOString(), lookback_hours: lookbackHours, events: fresh };
}

async function main() {
  let config;
  try {
    config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
  } catch (err) {
    console.warn(`[github-fetcher] config missing (${CONFIG_PATH}). Writing empty seed and exiting.`);
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify(
        {
          repos: [],
          users: [],
          lookback_hours: 24,
          _note: 'Add competitor GitHub slugs to "repos" (e.g. "owner/repo") and orgs/users to "users". Fetcher hits GitHub REST API hourly; PAT in GITHUB_TOKEN raises rate limit from 60 to 5000/h.',
        },
        null,
        2,
      ),
    );
    return;
  }

  const lookback = config.lookback_hours || 24;
  const repos = Array.isArray(config.repos) ? config.repos : [];
  const users = Array.isArray(config.users) ? config.users : [];

  console.log(`[github-fetcher] Date: ${RUN_DATE}  Repos: ${repos.length}  Users: ${users.length}  Lookback: ${lookback}h  Auth: ${GITHUB_TOKEN ? 'PAT' : 'unauth'}`);

  if (repos.length === 0 && users.length === 0) {
    console.warn('[github-fetcher] Config is empty — nothing to fetch. Populate config.json to begin.');
    return;
  }

  const repoResults = [];
  for (const slug of repos) {
    try { repoResults.push(await fetchRepoEvents(slug, lookback)); }
    catch (err) { console.warn(`[github-fetcher] ${slug}: ${err.message}`); repoResults.push({ repo: slug, error: err.message }); }
  }

  const userResults = [];
  for (const login of users) {
    try { userResults.push(await fetchUserEvents(login, lookback)); }
    catch (err) { console.warn(`[github-fetcher] ${login}: ${err.message}`); userResults.push({ user: login, error: err.message }); }
  }

  const payload = {
    run_date: RUN_DATE,
    fetched_at: new Date().toISOString(),
    lookback_hours: lookback,
    repos: repoResults,
    users: userResults,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `github-${RUN_DATE}.json`);
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2));
  console.log(`[github-fetcher] Wrote ${outPath} — ${repos.length} repos, ${users.length} users.`);
}

main().catch((err) => {
  console.error(`[github-fetcher] FATAL (suppressed for pipeline): ${err.message}`);
  process.exit(0);
});
