/**
 * Docs quality signal worker.
 *
 * Fetches GitHub repo metadata, README, and root contents for each eligible agent
 * and computes a 0–100 docs_quality_score across 5 components:
 *
 *   Foundation          10 pts  – repo URL, homepage / website_url
 *   README quality      30 pts  – exists, length, install, usage, examples, badges, api-ref
 *   Project structure   20 pts  – docs/, CONTRIBUTING, CHANGELOG, external-docs-link
 *   Maintenance/trust   20 pts  – LICENSE, governance docs, formal releases, recent activity
 *   Agent-specific      20 pts  – description, README agent terms, api docs, typed code examples
 *
 * Penalties (subtracted after sum):
 *   −8  no README at all
 *   −5  README < 200 words
 *   −5  no LICENSE
 *   −5  repo not pushed in over a year
 *   −5  no docs presence (no docs/ dir AND no external docs link)
 *   −3  no install or usage content found anywhere in README
 *   −2  no CONTRIBUTING guide
 *
 * Modes:
 *   --dry-run            Fetch + score, print results, no writes.
 *   --write              Upsert scored rows into agent_docs_quality_signals.
 *   --limit N            Override agent limit (default 25, max 200).
 *
 * Never modifies: agents, rankings, ecosystem_signals, agent_daily_snapshots,
 * github_repo_snapshots, or any scoring RPC.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const ENV_PATHS = [
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;
const GH_BASE = 'https://api.github.com';
const USER_AGENT = 'AgentCrush-Docs-Quality-Worker/1.0';
const DELAY_MS = 150;

// ─── Argument parsing ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, write: false, limit: DEFAULT_LIMIT };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') { args.dryRun = true; continue; }
    if (arg === '--write')   { args.write   = true; continue; }

    if (arg === '--limit') {
      const raw = argv[i + 1];
      if (!raw) throw new Error('Missing value for --limit');
      args.limit = parseLimit(raw);
      i++;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      args.limit = parseLimit(arg.slice('--limit='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.dryRun && args.write) {
    throw new Error('Cannot use --dry-run and --write together. Pick one.');
  }
  if (!args.dryRun && !args.write) {
    throw new Error('Specify --dry-run or --write.');
  }

  return args;
}

function parseLimit(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) throw new Error('--limit must be a positive integer');
  return Math.min(n, MAX_LIMIT);
}

// ─── Env loading ─────────────────────────────────────────────────────────────

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

// ─── Agent fetching ──────────────────────────────────────────────────────────

function isMissingColumnError(error) {
  return (
    error?.code === '42703' ||
    (typeof error?.message === 'string' && error.message.includes('does not exist'))
  );
}

async function fetchAgents(supabase, limit) {
  const fields = 'id, handle, display_name, github_full_name, github_repo_url, website_url';
  let { data, error } = await supabase
    .from('agents')
    .select(fields)
    .not('github_full_name', 'is', null)
    .limit(limit);

  if (error && isMissingColumnError(error)) {
    const fallbackFields = 'id, handle, display_name, github_full_name, github_repo_url';
    ({ data, error } = await supabase
      .from('agents')
      .select(fallbackFields)
      .not('github_full_name', 'is', null)
      .limit(limit));
  }

  if (error) throw error;
  return data || [];
}

// ─── GitHub API ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ghFetch(path, token) {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${GH_BASE}${path}`, { headers });

  if (res.status === 404) return { status: 404, data: null };
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    const wait = reset ? Math.max(0, Number(reset) * 1000 - Date.now()) + 1000 : 60_000;
    console.error(`  GitHub rate limit hit (${res.status}). Waiting ${Math.ceil(wait / 1000)}s…`);
    await sleep(wait);
    return { status: res.status, data: null };
  }
  if (!res.ok) return { status: res.status, data: null };

  const data = await res.json();
  return { status: res.status, data };
}

async function fetchRepoData(fullName, token) {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return null;

  const [metaRes, readmeRes, contentsRes] = await Promise.all([
    ghFetch(`/repos/${owner}/${repo}`, token),
    ghFetch(`/repos/${owner}/${repo}/readme`, token),
    ghFetch(`/repos/${owner}/${repo}/contents`, token),
  ]);

  await sleep(DELAY_MS);

  const meta = metaRes.data;
  const readme = readmeRes.data;
  const contents = Array.isArray(contentsRes.data) ? contentsRes.data : [];

  // readme.size is the byte length before base64 decoding.
  const readmeBytes = readme?.size ?? null;

  let readmeText = null;
  if (readme?.content && readme.encoding === 'base64') {
    try {
      readmeText = Buffer.from(readme.content.replace(/\s/g, ''), 'base64').toString('utf8');
    } catch {
      readmeText = null;
    }
  }

  let latestRelease = null;
  if (meta?.releases_url) {
    const releaseRes = await ghFetch(`/repos/${owner}/${repo}/releases/latest`, token);
    await sleep(DELAY_MS);
    latestRelease = releaseRes.data;
  }

  return { meta, readmeText, readmeBytes, contents, latestRelease };
}

// ─── Section detection helpers ────────────────────────────────────────────────

// Matches markdown ATX headings (## Foo) and RST underline-style headings (Foo\n===).
function hasReadmeSection(text, pattern) {
  if (new RegExp(`^#{1,4}\\s.*${pattern.source ?? pattern}`, 'im').test(text)) return true;
  // RST-style: line followed immediately by a line of =, -, ~, ^ of similar length
  const lines = text.split('\n');
  for (let i = 0; i + 1 < lines.length; i++) {
    if (/^[=\-~^]{3,}$/.test(lines[i + 1]) && pattern.test(lines[i])) return true;
  }
  return false;
}

// Detects install instructions: section heading OR inline package-manager command.
function hasInstallContent(text) {
  if (hasReadmeSection(text, /install|setup|getting[\s-]started/i)) return true;
  return /pip3?\s+install|npm\s+(install|i\b)|yarn\s+(add|install)|cargo\s+(add|install)|brew\s+install|gem\s+install|docker\s+(pull|run)|go\s+(install|get)|conda\s+install|git\s+clone/i.test(text);
}

// Detects usage / onboarding content via section heading only.
// Broad set of synonyms so "Getting Started", "Run", "Demo" all count.
function hasUsageContent(text) {
  return hasReadmeSection(text, /usage|quick[\s-]?start|getting[\s-]started|get[\s-]started|running|run[\s-]the|demo/i);
}

// Detects example content: dedicated section heading OR many code blocks (≥8 fences = ≥4 blocks).
function hasExamplesContent(text) {
  if (hasReadmeSection(text, /example|demo|tutorial|cookbook|notebook|sample/i)) return true;
  const fences = (text.match(/```/g) || []).length;
  return fences >= 8;
}

// Detects explicit API / reference / configuration docs sections.
function hasApiRefSection(text) {
  return hasReadmeSection(text, /api[\s-]?ref|api[\s-]?doc|configuration|parameters|options|reference/i);
}

// Detects typed code blocks (YAML, JSON, TOML, Python, TS, JS) — signals config examples.
function hasTypedCodeBlocks(text) {
  return /```\s*(yaml|yml|json|toml|python|py|typescript|ts|javascript|js)/i.test(text);
}

// Detects link to a dedicated docs site in README text.
function hasExternalDocsLink(text) {
  return /https?:\/\/(docs\.|readthedocs\.|gitbook\.io|[a-z0-9-]+\.gitbook\.io|[a-z0-9-]+\.readthedocs\.io)/i.test(text);
}

// Detects a run/demo command in README (python script, npm run, bash, etc.).
function hasRunOrDemoCommand(text) {
  return /\bpython3?\s+\w|\bnpm\s+run\s+\w|\bnode\s+\w|\bbash\s+\w|\bsh\s+\w|\.\/\w+\.sh\b|\bmake\s+\w/i.test(text);
}

// Extracts ATX heading text from README, capped at 40 entries.
function extractReadmeSections(text) {
  if (!text) return [];
  const out = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^#{1,4}\s+(.+)/);
    if (m) out.push(m[1].trim().replace(/\s+/g, ' '));
    if (out.length >= 40) break;
  }
  return out;
}

function countWords(text) {
  return text.trim().split(/\s+/).length;
}

function hasBadges(text) {
  return /!\[.*?\]\(https?:\/\//i.test(text);
}

function rootFileNames(contents) {
  return new Set(contents.map(f => f.name?.toLowerCase() ?? ''));
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const AGENT_TERMS = [
  'agent', 'llm', 'gpt', 'openai', 'anthropic', 'claude', 'langchain',
  'langgraph', 'tool use', 'tool-use', 'autonomous', 'multi-agent',
  'memory', 'planning', 'reasoning', 'workflow', 'orchestrat', 'agentic',
];

const AGENT_CONCEPTS  = ['agent', 'autonomous', 'multi-agent', 'orchestrat', 'workflow', 'tool use', 'tool-use', 'planning', 'reasoning', 'agentic'];
const LLM_CONCEPTS    = ['llm', 'gpt', 'openai', 'anthropic', 'claude', 'language model', 'embedding', 'transformer', 'foundation model'];

function scoreAgent(agent, repoData) {
  if (!repoData || !repoData.meta) {
    return {
      score: 0,
      raw: 0,
      penalty: 0,
      penaltyReasons: ['github_meta_unavailable'],
      components: { foundation: 0, readme: 0, structure: 0, maintenance: 0, agentClarity: 0 },
      signals: [],
      missing: ['github_meta_unavailable'],
      meta: null,
    };
  }

  const { meta, readmeText, contents, latestRelease } = repoData;
  const files = rootFileNames(contents);
  const signals = [];
  const missing = [];
  let foundation = 0;
  let readme = 0;
  let structure = 0;
  let maintenance = 0;
  let agentClarity = 0;
  let penalty = 0;
  const penaltyReasons = [];

  // ── Foundation (10 pts) ──────────────────────────────────────────────────
  // github_url is always true for these agents (they have github_full_name),
  // so the real signal is whether there's a dedicated homepage.
  if (agent.github_repo_url || agent.github_full_name) {
    foundation += 4;
    signals.push('has_github_url');
  } else {
    missing.push('github_repo_url');
  }

  const hasHomepage = !!(meta.homepage?.trim()) || !!(agent.website_url?.trim());
  if (hasHomepage) {
    foundation += 6;
    signals.push('has_homepage');
  } else {
    missing.push('no_homepage');
  }

  // ── README quality (30 pts) ──────────────────────────────────────────────
  // max: 3 + 9 + 5 + 4 + 4 + 2 + 3 = 30
  if (readmeText) {
    readme += 3;
    signals.push('readme_exists');

    const words = countWords(readmeText);
    if (words >= 1500) {
      readme += 9; signals.push('readme_comprehensive');        // ≥1500 words
    } else if (words >= 600) {
      readme += 6; signals.push('readme_detailed');             // 600–1499
    } else if (words >= 200) {
      readme += 3; signals.push('readme_basic');                // 200–599
    } else {
      missing.push('readme_too_thin');
    }

    if (hasInstallContent(readmeText)) {
      readme += 5; signals.push('readme_has_install');
    } else {
      missing.push('readme_no_install_content');
    }

    if (hasUsageContent(readmeText)) {
      readme += 4; signals.push('readme_has_usage');
    } else {
      missing.push('readme_no_usage_content');
    }

    if (hasExamplesContent(readmeText)) {
      readme += 4; signals.push('readme_has_examples');
    } else {
      missing.push('readme_no_examples');
    }

    if (hasBadges(readmeText)) {
      readme += 2; signals.push('readme_has_badges');
    } else {
      missing.push('readme_no_badges');
    }

    if (hasApiRefSection(readmeText)) {
      readme += 3; signals.push('readme_has_api_ref');
    } else {
      missing.push('readme_no_api_ref');
    }
  } else {
    missing.push('readme_missing');
  }

  // ── Project structure docs (20 pts) ─────────────────────────────────────
  // max: 8 + 5 + 3 + 4 = 20
  const hasDocsDir = contents.some(f => f.type === 'dir' && /^docs?$/i.test(f.name));
  if (hasDocsDir) {
    structure += 8; signals.push('has_docs_dir');
  } else {
    missing.push('no_docs_dir');
  }

  const hasContributing = files.has('contributing.md') || files.has('contributing');
  if (hasContributing) {
    structure += 5; signals.push('has_contributing');
  } else {
    missing.push('no_contributing');
  }

  const hasChangelog = files.has('changelog.md') || files.has('changelog') ||
    files.has('history.md') || files.has('changes.md');
  if (hasChangelog) {
    structure += 3; signals.push('has_changelog');
  } else {
    missing.push('no_changelog');
  }

  // External docs site (readthedocs, gitbook, docs.X.com) linked from README
  const hasExtDocs = readmeText ? hasExternalDocsLink(readmeText) : false;
  if (hasExtDocs) {
    structure += 4; signals.push('has_external_docs');
  } else {
    missing.push('no_external_docs');
  }

  // ── Maintenance / trust (20 pts) ─────────────────────────────────────────
  // max: 6 + 2 + 2 + 5 + 5 = 20
  const hasLicense = files.has('license') || files.has('license.md') ||
    files.has('license.txt') || !!meta.license;
  if (hasLicense) {
    maintenance += 6; signals.push('has_license');
  } else {
    missing.push('no_license');
  }

  // Stars intentionally excluded from scoring — popularity ≠ docs quality.
  // Kept in meta for display only.
  const stars = meta.stargazers_count ?? 0;

  // Governance docs: a better proxy for project maturity and documentation investment.
  // Only root-level files are visible from the /contents call.
  const hasSecurityPolicy = files.has('security.md');
  if (hasSecurityPolicy) {
    maintenance += 2; signals.push('has_security_policy');
  } else {
    missing.push('no_security_policy');
  }

  const hasCodeOfConduct = files.has('code_of_conduct.md') || files.has('code-of-conduct.md');
  if (hasCodeOfConduct) {
    maintenance += 2; signals.push('has_code_of_conduct');
  } else {
    missing.push('no_code_of_conduct');
  }

  if (latestRelease) {
    maintenance += 5; signals.push('has_releases');
  } else {
    missing.push('no_releases');
  }

  const pushedDaysAgo = daysSince(meta.pushed_at);
  if (pushedDaysAgo <= 30) {
    maintenance += 5; signals.push('active_last_30d');
  } else if (pushedDaysAgo <= 60) {
    maintenance += 1; signals.push('active_last_60d');
  } else {
    missing.push('inactive_60d_plus');
  }

  // ── Agent-specific clarity (20 pts) ─────────────────────────────────────
  // max: 5 + 6 + 5 + 4 = 20
  const descText = (meta.description ?? '').toLowerCase();
  const topicsText = (meta.topics ?? []).join(' ').toLowerCase();
  const combinedMeta = `${descText} ${topicsText}`;

  const agentTermCountMeta = AGENT_TERMS.filter(t => combinedMeta.includes(t)).length;
  if (agentTermCountMeta >= 3) {
    agentClarity += 5; signals.push('strong_agent_description');
  } else if (agentTermCountMeta >= 1) {
    agentClarity += 2; signals.push('weak_agent_description');
  } else {
    missing.push('no_agent_terms_in_description');
  }

  if (readmeText) {
    const readmeLower = readmeText.toLowerCase();
    const agentTermsInReadme = AGENT_TERMS.filter(t => readmeLower.includes(t)).length;
    if (agentTermsInReadme >= 8) {
      agentClarity += 6; signals.push('readme_agent_rich');
    } else if (agentTermsInReadme >= 2) {
      agentClarity += 3; signals.push('readme_mentions_agent_terms');
    } else if (agentTermsInReadme >= 1) {
      agentClarity += 1; signals.push('readme_agent_sparse');
    } else {
      missing.push('readme_no_agent_terms');
    }

    // docs_dir is already rewarded in structure — don't double-count here.
    const hasApiDocs = hasApiRefSection(readmeText);
    if (hasApiDocs) {
      agentClarity += 5; signals.push('has_api_or_config_docs');
    } else {
      missing.push('no_api_or_config_docs');
    }

    if (hasTypedCodeBlocks(readmeText)) {
      agentClarity += 4; signals.push('has_typed_code_examples');
    } else {
      missing.push('no_typed_code_examples');
    }
  } else {
    missing.push('readme_missing_agent_score');
  }

  // ── Penalties ────────────────────────────────────────────────────────────
  if (!readmeText) {
    penalty += 8; penaltyReasons.push('no_readme(−8)');
  } else if (countWords(readmeText) < 200) {
    penalty += 5; penaltyReasons.push('readme_too_thin(−5)');
  }

  if (!hasLicense) {
    penalty += 5; penaltyReasons.push('no_license(−5)');
  }

  if (pushedDaysAgo > 365) {
    penalty += 5; penaltyReasons.push('stale_over_1yr(−5)');
  }

  if (readmeText && !hasInstallContent(readmeText) && !hasUsageContent(readmeText)) {
    penalty += 3; penaltyReasons.push('no_onboarding(−3)');
  }

  if (!hasDocsDir && !hasExtDocs) {
    penalty += 5; penaltyReasons.push('no_docs_presence(−5)');
  }

  if (!hasContributing) {
    penalty += 2; penaltyReasons.push('no_contributing(−2)');
  }
  // no_typed_code intentionally not penalised — language detection is fragile.

  const rawScore = foundation + readme + structure + maintenance + agentClarity;
  const total = Math.max(0, Math.min(100, rawScore - penalty));

  return {
    score: total,
    raw: rawScore,
    penalty,
    penaltyReasons,
    components: { foundation, readme, structure, maintenance, agentClarity },
    signals,
    missing,
    meta: {
      stars,
      forks: meta.forks_count ?? 0,
      pushedDaysAgo: Math.round(pushedDaysAgo),
      description: meta.description ?? '',
      topics: (meta.topics ?? []).join(', '),
    },
  };
}

function tier(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'weak';
}

// ─── Row builder (write mode) ─────────────────────────────────────────────────

function buildRow(agent, repoData, result, fetchErrors, now, snapshotDate) {
  const { meta, readmeText, readmeBytes, contents, latestRelease } = repoData ?? {};
  const files = contents ? rootFileNames(contents) : new Set();

  const readmeSections = readmeText ? extractReadmeSections(readmeText) : [];

  const combinedText = [
    meta?.description ?? '',
    (meta?.topics ?? []).join(' '),
    readmeText ?? '',
  ].join(' ').toLowerCase();

  const mentionsAgentConcepts = AGENT_CONCEPTS.some(t => combinedText.includes(t));
  const mentionsLlmConcepts   = LLM_CONCEPTS.some(t => combinedText.includes(t));

  const hasDocsDir     = contents ? contents.some(f => f.type === 'dir' && /^docs?$/i.test(f.name)) : false;
  const hasExamplesDir = contents ? contents.some(f => f.type === 'dir' && /^examples?$/i.test(f.name)) : false;

  // Sanitised raw metadata — no tokens or credentials.
  const rawMeta = meta ? {
    description:       meta.description,
    topics:            meta.topics,
    pushed_at:         meta.pushed_at,
    created_at:        meta.created_at,
    default_branch:    meta.default_branch,
    stargazers_count:  meta.stargazers_count,
    forks_count:       meta.forks_count,
    open_issues_count: meta.open_issues_count,
    archived:          meta.archived,
    disabled:          meta.disabled,
    visibility:        meta.visibility,
    license: meta.license
      ? { spdx_id: meta.license.spdx_id, name: meta.license.name }
      : null,
  } : null;

  return {
    agent_id:                  agent.id,
    github_full_name:          agent.github_full_name,
    github_repo_url:           agent.github_repo_url ?? meta?.html_url ?? null,
    website_url:               agent.website_url ?? meta?.homepage ?? null,
    observed_at:               now,
    snapshot_date:             snapshotDate,
    default_branch:            meta?.default_branch ?? null,
    repo_pushed_at:            meta?.pushed_at ?? null,
    last_release_tag:          latestRelease?.tag_name ?? null,
    last_release_published_at: latestRelease?.published_at ?? null,
    docs_quality_score:        result.score,
    docs_quality_tier:         tier(result.score),
    score_components:          result.components,
    readme_exists:             !!readmeText,
    readme_bytes:              readmeBytes ?? null,
    readme_sections:           readmeSections,
    has_install_section:       readmeText ? hasInstallContent(readmeText) : false,
    has_usage_section:         readmeText ? hasUsageContent(readmeText) : false,
    has_api_or_config_section: readmeText ? hasApiRefSection(readmeText) : false,
    has_run_or_demo_command:   readmeText ? hasRunOrDemoCommand(readmeText) : false,
    has_docs_dir:              hasDocsDir,
    docs_file_count:           null,     // extra API call not warranted per-run
    has_examples_dir:          hasExamplesDir,
    examples_file_count:       null,     // same
    has_package_json:          files.has('package.json'),
    has_pyproject_toml:        files.has('pyproject.toml'),
    package_name:              null,     // would require fetching file contents
    package_version:           null,
    has_license:               result.signals.includes('has_license'),
    license_name:              meta?.license?.spdx_id ?? meta?.license?.name ?? null,
    has_security_md:           result.signals.includes('has_security_policy'),
    has_changelog:             result.signals.includes('has_changelog'),
    mentions_agent_concepts:   mentionsAgentConcepts,
    mentions_llm_concepts:     mentionsLlmConcepts,
    has_external_docs_link:    result.signals.includes('has_external_docs'),
    evidence: {
      signals:    result.signals,
      missing:    result.missing,
      penalties:  result.penaltyReasons,
      components: result.components,
    },
    errors:     fetchErrors,
    raw:        rawMeta ?? {},
    updated_at: now,
  };
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

async function upsertDocsSignals(supabase, rows) {
  if (rows.length === 0) return 0;
  const { error, count } = await supabase
    .from('agent_docs_quality_signals')
    .upsert(rows, { onConflict: 'agent_id,snapshot_date', count: 'exact' });
  if (error) throw error;
  return count ?? rows.length;
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function pad(str, len) {
  const s = String(str);
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

function padL(str, len) {
  const s = String(str);
  return s.length >= len ? s.slice(0, len) : ' '.repeat(len - s.length) + s;
}

function printDetailedBreakdown(label, agent, result) {
  const r = result;
  const c = r.components;
  const handle = agent.handle ?? agent.github_full_name ?? '?';
  console.log(`\n  ── ${label}: ${handle} (score=${r.score}, tier=${tier(r.score)}) ──`);
  console.log(`     Raw before penalties: ${r.raw}   Penalty: −${r.penalty}`);
  console.log(`     Foundation   ${padL(c.foundation, 2)}/10  ` +
    (r.signals.includes('has_homepage') ? 'has_homepage ' : 'NO_homepage ') +
    (r.signals.includes('has_github_url') ? 'has_github_url' : ''));
  console.log(`     README       ${padL(c.readme, 2)}/30  ` +
    ['readme_exists','readme_comprehensive','readme_detailed','readme_basic',
     'readme_has_install','readme_has_usage','readme_has_examples',
     'readme_has_badges','readme_has_api_ref']
      .filter(s => r.signals.includes(s)).join(' '));
  if (!r.signals.includes('readme_exists')) {
    console.log('                        (no README found)');
  }
  console.log(`     Structure    ${padL(c.structure, 2)}/20  ` +
    ['has_docs_dir','has_contributing','has_changelog','has_external_docs']
      .filter(s => r.signals.includes(s)).join(' '));
  console.log(`     Maintenance  ${padL(c.maintenance, 2)}/20  ` +
    ['has_license','has_security_policy','has_code_of_conduct','has_releases',
     'active_last_30d','active_last_60d']
      .filter(s => r.signals.includes(s)).join(' '));
  console.log(`     Agent        ${padL(c.agentClarity, 2)}/20  ` +
    ['strong_agent_description','weak_agent_description',
     'readme_agent_rich','readme_mentions_agent_terms','readme_agent_sparse',
     'has_api_or_config_docs','has_typed_code_examples']
      .filter(s => r.signals.includes(s)).join(' '));
  if (r.penaltyReasons.length > 0) {
    console.log(`     Penalties:   ${r.penaltyReasons.join('  ')}`);
  }
  const topMissing = r.missing.slice(0, 5).join(', ');
  if (topMissing) console.log(`     Missing:     ${topMissing}`);
  if (r.meta) {
    console.log(`     Stars: ${r.meta.stars.toLocaleString()}   Pushed: ${r.meta.pushedDaysAgo}d ago   Desc: "${r.meta.description.slice(0, 80)}"`);
  }
}

function printSummary(results, { mode, writeCount }) {
  const sorted = [...results].sort((a, b) => b.result.score - a.result.score);

  const W = 120;
  console.log('\n' + '─'.repeat(W));
  console.log(
    pad('Handle', 22) +
    pad('Score', 7) +
    pad('Tier', 11) +
    pad('Found', 6) +
    pad('README', 7) +
    pad('Struct', 7) +
    pad('Maint', 6) +
    pad('Agent', 7) +
    pad('Pen', 5) +
    pad('Stars', 7) +
    'Top missing signal'
  );
  console.log('─'.repeat(W));

  for (const { agent, result } of sorted) {
    const r = result;
    const c = r.components;
    const handle = agent.handle ?? agent.github_full_name ?? '?';
    const topMissing = r.missing[0] ?? '—';
    console.log(
      pad(handle, 22) +
      padL(r.score, 5) + '  ' +
      pad(tier(r.score), 11) +
      padL(c.foundation, 4) + '  ' +
      padL(c.readme, 5) + '  ' +
      padL(c.structure, 5) + '  ' +
      padL(c.maintenance, 4) + '  ' +
      padL(c.agentClarity, 5) + '  ' +
      padL(r.penalty > 0 ? `-${r.penalty}` : '0', 4) + '  ' +
      padL(r.meta?.stars ?? 0, 6) + ' ' +
      topMissing
    );
  }

  console.log('─'.repeat(W));

  const scores = results.map(r => r.result.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const tiers = { excellent: 0, good: 0, fair: 0, weak: 0 };
  for (const s of scores) tiers[tier(s)]++;

  console.log(`\nAgents checked: ${results.length}`);
  if (mode === 'write') {
    console.log(`Rows inserted/updated: ${writeCount}`);
  }
  console.log(`Average score: ${avg.toFixed(1)}`);
  console.log(`Tiers: ${tiers.excellent} excellent / ${tiers.good} good / ${tiers.fair} fair / ${tiers.weak} weak`);

  // Common missing signals
  const missingCounts = {};
  for (const { result } of results) {
    for (const m of result.missing) {
      missingCounts[m] = (missingCounts[m] ?? 0) + 1;
    }
  }
  const topMissingList = Object.entries(missingCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (topMissingList.length > 0) {
    console.log('\nMost common missing signals:');
    for (const [signal, count] of topMissingList) {
      console.log(`  ${padL(count, 3)}x  ${signal}`);
    }
  }

  // Top 10
  console.log('\nTop 10:');
  for (const { agent, result } of sorted.slice(0, 10)) {
    const handle = agent.handle ?? agent.github_full_name ?? '?';
    console.log(`  ${padL(result.score, 3)}  ${tier(result.score).padEnd(9)}  ${handle}  (raw=${result.raw} pen=−${result.penalty})`);
  }

  // Bottom 10
  if (sorted.length > 10) {
    console.log('\nBottom 10:');
    for (const { agent, result } of sorted.slice(-10).reverse()) {
      const handle = agent.handle ?? agent.github_full_name ?? '?';
      console.log(`  ${padL(result.score, 3)}  ${tier(result.score).padEnd(9)}  ${handle}  (raw=${result.raw} pen=−${result.penalty})`);
    }
  }

  // Component breakdown: top, median, bottom
  console.log('\n' + '═'.repeat(W));
  console.log('Component breakdown — top / median / bottom');
  console.log('═'.repeat(W));
  printDetailedBreakdown('TOP   ', sorted[0].agent, sorted[0].result);
  printDetailedBreakdown('MEDIAN', sorted[Math.floor(sorted.length / 2)].agent, sorted[Math.floor(sorted.length / 2)].result);
  printDetailedBreakdown('BOTTOM', sorted[sorted.length - 1].agent, sorted[sorted.length - 1].result);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }

  await loadEnvFiles(ENV_PATHS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }
  if (!githubToken) {
    console.warn('WARNING: GITHUB_TOKEN not set — unauthenticated GitHub requests (60 req/hr limit).');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const mode = args.write ? 'write' : 'dry-run';

  console.log(`[docs-quality] --${mode}  limit=${args.limit}`);
  console.log('[docs-quality] Fetching agents…');

  const agents = await fetchAgents(supabase, args.limit);
  console.log(`[docs-quality] ${agents.length} agents with github_full_name.`);

  if (agents.length === 0) {
    console.log('[docs-quality] No agents to process.');
    return;
  }

  const now = new Date().toISOString();
  const snapshotDate = now.slice(0, 10); // YYYY-MM-DD

  const results = [];
  const rows = [];
  let fetched = 0;
  let failed = 0;

  for (const agent of agents) {
    const fullName = agent.github_full_name;
    if (!fullName) continue;

    process.stdout.write(`  [${fetched + 1}/${agents.length}] ${fullName}…`);

    const fetchErrors = [];
    let repoData = null;
    try {
      repoData = await fetchRepoData(fullName, githubToken);
    } catch (err) {
      process.stdout.write(` ERROR: ${err.message}\n`);
      fetchErrors.push(err.message);
      failed++;
    }

    const result = scoreAgent(agent, repoData);
    results.push({ agent, result });

    if (args.write) {
      rows.push(buildRow(agent, repoData ?? {}, result, fetchErrors, now, snapshotDate));
    }

    const penStr = result.penalty > 0 ? ` pen=−${result.penalty}` : '';
    process.stdout.write(` score=${result.score}${penStr} (${tier(result.score)})\n`);
    fetched++;
  }

  console.log(`\n[docs-quality] Done. Scored=${fetched} Failed=${failed}`);

  let writeCount = 0;
  if (args.write && rows.length > 0) {
    console.log(`[docs-quality] Upserting ${rows.length} rows into agent_docs_quality_signals…`);
    try {
      writeCount = await upsertDocsSignals(supabase, rows);
      console.log(`[docs-quality] Upsert complete. rows_inserted_or_updated=${writeCount}`);
    } catch (err) {
      console.error(`[docs-quality] Upsert failed: ${err.message}`);
      process.exit(1);
    }
  }

  printSummary(results, { mode, writeCount });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
