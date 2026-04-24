/**
 * Package discovery worker.
 *
 * Reads agent_docs_quality_signals rows where has_package_json=true OR
 * has_pyproject_toml=true (latest snapshot per agent), fetches the actual
 * package files from GitHub, resolves candidate package names against the
 * npm registry and PyPI, and prints a confidence-ranked mapping report.
 *
 * This worker is DRY-RUN ONLY. It never writes to Supabase.
 *
 * Modes:
 *   --dry-run   Run the full pipeline and print results.
 *   --limit N   Override agent limit (default 50, max 200).
 *
 * Confidence tiers:
 *   95   HIGH_AUTO    Registry verified + repo URL matches github_full_name exactly
 *   85   GOOD_WARN    Registry verified + homepage/website match, or known transfer
 *   70   MAN_REVIEW   Registry exists, no URLs to verify (genuinely ambiguous)
 *   55   REJECTED     Registry URL points to a different GitHub org (likely collision)
 *   50   REJECTED     Package not found in registry
 *    0   HARD_REJECT  Placeholder/generic package name — never safe to map
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const ENV_PATHS = [
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const GH_BASE = 'https://api.github.com';
const USER_AGENT = 'AgentCrush-Package-Discovery-Worker/1.0';
const DELAY_MS = 200;

// Names that appear as package names in pyproject.toml / package.json but are
// generic build artefacts or placeholders, not real publishable package names.
const PLACEHOLDER_NAMES = new Set([
  'src', 'app', 'server', 'client', 'package', 'project',
  'example', 'examples', 'test', 'tests', 'main', 'core', 'lib',
]);

// Repos where the PyPI/npm package is known to have been transferred to a
// different GitHub org. Key = agent github_full_name (lowercase).
const KNOWN_REPO_TRANSFERS = {
  'antonosika/gpt-engineer': {
    registryFullName: 'gpt-engineer-org/gpt-engineer',
    confidence: 85,
    warning: 'package repo appears transferred from AntonOsika to gpt-engineer-org — verify agent github_full_name',
  },
};

// Conservative fallback package names for repos whose pyproject.toml / package.json
// does not use a standard [project] or [tool.poetry] section. Add new entries here
// only after manual confirmation that the package exists and belongs to this repo.
// Key = github_full_name (lowercase).
const TOML_FALLBACKS = {
  'crewaiinc/crewai': { registry: 'pypi', name: 'crewai' },
};

// Manual verified mappings for packages where PyPI's project_urls/home_page fields
// are empty, but the PyPI description or author metadata contains clear GitHub evidence.
// Evidence verified 2026-04-24 by fetching https://pypi.org/pypi/<name>/json and
// inspecting all embedded github.com URLs in the description field.
//
// Key = 'registry:package-name' (lowercase).
// confidence 95 = description directly links to the expected github_full_name.
// confidence 55 = description links to a *different* GitHub org (likely wrong mapping).
const MANUAL_VERIFIED_MAPPINGS = {
  'pypi:open-interpreter': {
    githubFullName: 'openinterpreter/open-interpreter',
    confidence: 95,
    reason: 'description links to github.com/OpenInterpreter/open-interpreter; author_email killian@openinterpreter.com',
  },
  'pypi:open-autonomy': {
    githubFullName: 'valory-xyz/open-autonomy',
    confidence: 95,
    reason: 'description links to github.com/valory-xyz/open-autonomy; author developer-valory, email develope@valory.xyz',
  },
  'pypi:langroid': {
    githubFullName: 'langroid/langroid',
    confidence: 95,
    reason: 'description contains 50+ links to github.com/langroid/langroid including release history',
  },
  'pypi:nanobot-ai': {
    githubFullName: 'HKUDS/nanobot',
    confidence: 95,
    reason: 'description links to github.com/HKUDS/nanobot with full release history and commit links',
  },
  'pypi:pymemgpt': {
    // PyPI description explicitly references cpacker/MemGPT throughout.
    // Agent DB has deductive-ai/MemGPT — different org. Do not promote.
    githubFullName: 'cpacker/MemGPT',
    confidence: 55,
    reason: 'description references github.com/cpacker/MemGPT, not deductive-ai/MemGPT — repo may be a fork/transfer; verify ownership',
  },
};

// ─── Argument parsing ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, limit: DEFAULT_LIMIT };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') { args.dryRun = true; continue; }

    if (arg === '--write') {
      throw new Error(
        'This worker is dry-run only. --write is not supported.\n' +
        'Package mappings require human review before persistence.'
      );
    }

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

  if (!args.dryRun) {
    throw new Error('Specify --dry-run to run the package discovery pipeline.');
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

// ─── Supabase queries ─────────────────────────────────────────────────────────

function isMissingColumnError(error) {
  return (
    error?.code === '42703' ||
    (typeof error?.message === 'string' && error.message.includes('does not exist'))
  );
}

async function fetchSignalRows(supabase, limit) {
  const { data, error } = await supabase
    .from('agent_docs_quality_signals')
    .select(
      'agent_id, github_full_name, github_repo_url, website_url, ' +
      'has_package_json, has_pyproject_toml, snapshot_date'
    )
    .or('has_package_json.eq.true,has_pyproject_toml.eq.true')
    .order('snapshot_date', { ascending: false })
    .limit(limit * 4); // over-fetch; deduplicate to latest-per-agent in JS

  if (error) throw error;
  return data || [];
}

function deduplicateByAgent(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (!seen.has(row.agent_id)) seen.set(row.agent_id, row);
  }
  return [...seen.values()];
}

async function fetchAgentMeta(supabase, agentIds) {
  const { data, error } = await supabase
    .from('agents')
    .select('id, handle, display_name')
    .in('id', agentIds);
  if (error) throw error;
  const map = new Map();
  for (const row of (data || [])) map.set(row.id, row);
  return map;
}

// ─── GitHub API ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ghFetch(path, token) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': USER_AGENT,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${GH_BASE}${path}`, { headers });
  return res;
}

async function fetchFileContent(fullName, filePath, token) {
  const res = await ghFetch(`/repos/${fullName}/contents/${filePath}`, token);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${fullName}/${filePath}`);
  const json = await res.json();
  if (!json.content || json.encoding !== 'base64') return null;
  return Buffer.from(json.content.replace(/\s/g, ''), 'base64').toString('utf8');
}

// ─── npm parsing ──────────────────────────────────────────────────────────────

function parsePackageJson(text) {
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    return null;
  }

  if (!pkg || typeof pkg !== 'object') return null;

  const name = typeof pkg.name === 'string' ? pkg.name.trim() : null;
  if (!name) return null;

  const version = typeof pkg.version === 'string' ? pkg.version.trim() : null;

  let repoUrl = null;
  if (typeof pkg.repository === 'string') {
    repoUrl = pkg.repository;
  } else if (pkg.repository && typeof pkg.repository.url === 'string') {
    repoUrl = pkg.repository.url;
  }

  const homepage = typeof pkg.homepage === 'string' ? pkg.homepage.trim() : null;

  return { name, version, repoUrl, homepage };
}

// ─── PyPI / pyproject.toml parsing ───────────────────────────────────────────

function parsePyprojectToml(text) {
  const candidates = [];

  // [project] section — PEP 621
  const projectSection = extractTomlSection(text, 'project');
  if (projectSection) {
    const name = extractTomlString(projectSection, 'name');
    const version = extractTomlString(projectSection, 'version');
    const urls = extractProjectUrls(text, 'project.urls');
    if (name) candidates.push({ section: 'project', name, version, urls });
  }

  // [tool.poetry] section
  const poetrySection = extractTomlSection(text, 'tool.poetry');
  if (poetrySection) {
    const name = extractTomlString(poetrySection, 'name');
    const version = extractTomlString(poetrySection, 'version');
    const urls = extractProjectUrls(text, 'tool.poetry.urls');
    if (name) candidates.push({ section: 'tool.poetry', name, version, urls });
  }

  // Prefer [project] over [tool.poetry]; return first valid hit.
  return candidates[0] ?? null;
}

function extractTomlSection(text, sectionKey) {
  // Escape ALL dots so [tool.poetry] is not treated as [toolXpoetry].
  const escapedKey = sectionKey.replace(/\./g, '\\.');
  const re = new RegExp(
    `^\\[${escapedKey}\\][ \\t]*$([\\s\\S]*?)(?=^\\[|\\z)`,
    'im'
  );
  const m = text.match(re);
  return m ? m[1] : null;
}

function extractTomlString(sectionText, key) {
  const re = new RegExp(`^${key}\\s*=\\s*["']([^"']+)["']`, 'im');
  const m = sectionText.match(re);
  return m ? m[1].trim() : null;
}

function extractProjectUrls(text, sectionKey) {
  const section = extractTomlSection(text, sectionKey);
  if (!section) return {};
  const urls = {};
  for (const line of section.split('\n')) {
    const m = line.match(/^(\w[\w\s-]*)?\s*=\s*["']([^"']+)["']/i);
    if (m) urls[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return urls;
}

// ─── Registry verification ────────────────────────────────────────────────────

async function verifyNpm(packageName) {
  const encoded = encodeURIComponent(packageName);
  let res;
  try {
    res = await fetch(`https://registry.npmjs.org/${encoded}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
  } catch (e) {
    return { exists: false, error: e.message };
  }

  if (res.status === 404) return { exists: false };
  if (!res.ok) return { exists: false, error: `npm ${res.status}` };

  let body;
  try {
    body = await res.json();
  } catch {
    return { exists: true, repoUrl: null, homepage: null };
  }

  let repoUrl = null;
  if (body.repository?.url) {
    repoUrl = body.repository.url;
  } else {
    const latestTag = body['dist-tags']?.latest;
    if (latestTag && body.versions?.[latestTag]?.repository?.url) {
      repoUrl = body.versions[latestTag].repository.url;
    }
  }

  const homepage = body.homepage ?? null;
  const description = body.description ?? null;

  return { exists: true, repoUrl, homepage, description };
}

async function verifyPypi(packageName) {
  const encoded = encodeURIComponent(packageName.toLowerCase());
  let res;
  try {
    res = await fetch(`https://pypi.org/pypi/${encoded}/json`, {
      headers: { 'User-Agent': USER_AGENT },
    });
  } catch (e) {
    return { exists: false, error: e.message };
  }

  if (res.status === 404) return { exists: false };
  if (!res.ok) return { exists: false, error: `PyPI ${res.status}` };

  let body;
  try {
    body = await res.json();
  } catch {
    return { exists: true, projectUrls: {}, homepage: null };
  }

  const info = body.info ?? {};
  const projectUrls = info.project_urls ?? {};
  const homepage = info.home_page ?? projectUrls['Homepage'] ?? null;

  return { exists: true, projectUrls, homepage };
}

// ─── URL matching helpers ─────────────────────────────────────────────────────

function normaliseGhUrl(raw) {
  if (!raw) return null;
  return raw
    .replace(/^git\+/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^git:\/\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .toLowerCase()
    .replace(/^github\.com\//, '');
}

// Returns 'owner/repo' if url is a GitHub URL, null otherwise.
function extractGhFullNameFromUrl(url) {
  if (!url) return null;
  const clean = url
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, '')
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  const m = clean.match(/^(?:www\.)?github\.com\/([^/]+\/[^/\s?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function ghUrlMatchesFullName(url, fullName) {
  if (!url || !fullName) return false;
  const norm = normaliseGhUrl(url);
  const target = fullName.toLowerCase();
  return norm === target || norm === `github.com/${target}`;
}

function websiteMatches(registryUrl, websiteUrl) {
  if (!registryUrl || !websiteUrl) return false;
  try {
    const rHost = new URL(registryUrl).hostname.replace(/^www\./, '');
    const wHost = new URL(websiteUrl).hostname.replace(/^www\./, '');
    return rHost === wHost;
  } catch {
    return false;
  }
}

function isPlaceholderName(name) {
  return PLACEHOLDER_NAMES.has(name.toLowerCase());
}

// ─── Confidence scoring ───────────────────────────────────────────────────────

function scoreNpmCandidate(candidate, npmResult, agentRow) {
  if (!npmResult.exists) {
    return { confidence: 50, matchReason: 'not in npm registry', warning: null };
  }

  // Check manual verified mappings.
  const manualKey = `npm:${candidate.name.toLowerCase()}`;
  const manual = MANUAL_VERIFIED_MAPPINGS[manualKey];
  if (manual) {
    if (manual.githubFullName.toLowerCase() === agentRow.github_full_name.toLowerCase()) {
      return {
        confidence: manual.confidence,
        matchReason: `manually verified — ${manual.reason}`,
        warning: null,
      };
    }
    return {
      confidence: 55,
      matchReason: 'manual verification found different GitHub repo',
      warning: `description evidence for ${manual.githubFullName}, not ${agentRow.github_full_name} — ${manual.reason}`,
    };
  }

  // Exact repo URL match → 95
  if (ghUrlMatchesFullName(npmResult.repoUrl, agentRow.github_full_name)) {
    return { confidence: 95, matchReason: 'registry repo URL matches github_full_name', warning: null };
  }

  // Registry repo URL is a different GitHub org → check transfer map or reject
  const registryGhName = extractGhFullNameFromUrl(npmResult.repoUrl);
  if (registryGhName) {
    const agentKey = agentRow.github_full_name.toLowerCase();
    const transfer = KNOWN_REPO_TRANSFERS[agentKey];
    if (transfer && registryGhName === transfer.registryFullName.toLowerCase()) {
      return { confidence: transfer.confidence, matchReason: 'known repo transfer match', warning: transfer.warning };
    }
    // Different GitHub org and not a known transfer → likely name collision
    return {
      confidence: 55,
      matchReason: 'registry repo URL points to different GitHub org',
      warning: `registry repo is ${registryGhName}, expected ${agentRow.github_full_name} — likely name collision`,
    };
  }

  // Homepage matches agent website_url or github_repo_url → 85
  if (
    websiteMatches(npmResult.homepage, agentRow.website_url) ||
    websiteMatches(npmResult.homepage, agentRow.github_repo_url)
  ) {
    return { confidence: 85, matchReason: 'registry homepage matches agent website_url', warning: null };
  }

  // package.json homepage field matches agent URLs → 85
  if (
    candidate.homepage &&
    (ghUrlMatchesFullName(candidate.homepage, agentRow.github_full_name) ||
     websiteMatches(candidate.homepage, agentRow.website_url))
  ) {
    return { confidence: 85, matchReason: 'package.json homepage matches agent URLs', warning: null };
  }

  // Registry exists but no GitHub URL and no homepage match
  const warning = npmResult.repoUrl
    ? `registry repo (${npmResult.repoUrl}) is not a GitHub URL — cannot verify ownership`
    : 'registry exists but no repository URL to verify';

  return { confidence: 70, matchReason: 'in npm registry, no GitHub URL to verify', warning };
}

function scorePypiCandidate(candidate, pypiResult, agentRow) {
  if (!pypiResult.exists) {
    return { confidence: 50, matchReason: 'not in PyPI', warning: null };
  }

  // Check manual verified mappings (evidence from PyPI description inspection).
  const manualKey = `pypi:${candidate.name.toLowerCase()}`;
  const manual = MANUAL_VERIFIED_MAPPINGS[manualKey];
  if (manual) {
    if (manual.githubFullName.toLowerCase() === agentRow.github_full_name.toLowerCase()) {
      return {
        confidence: manual.confidence,
        matchReason: `manually verified — ${manual.reason}`,
        warning: null,
      };
    }
    // Manual evidence points to a different repo than the agent record.
    return {
      confidence: 55,
      matchReason: 'manual verification found different GitHub repo',
      warning: `description evidence for ${manual.githubFullName}, not ${agentRow.github_full_name} — ${manual.reason}`,
    };
  }

  const allUrls = Object.values(pypiResult.projectUrls);
  if (pypiResult.homepage) allUrls.push(pypiResult.homepage);

  // Exact GitHub URL match → 95
  for (const url of allUrls) {
    if (ghUrlMatchesFullName(url, agentRow.github_full_name)) {
      return { confidence: 95, matchReason: 'PyPI project URL matches github_full_name', warning: null };
    }
  }

  // Check for a different GitHub org in project URLs
  const agentKey = agentRow.github_full_name.toLowerCase();
  const transfer = KNOWN_REPO_TRANSFERS[agentKey];
  let mismatchedGhName = null;

  for (const url of allUrls) {
    const ghName = extractGhFullNameFromUrl(url);
    if (!ghName) continue;
    // It's a GitHub URL but didn't match above — check transfer map
    if (transfer && ghName === transfer.registryFullName.toLowerCase()) {
      return { confidence: transfer.confidence, matchReason: 'known repo transfer match', warning: transfer.warning };
    }
    mismatchedGhName = ghName;
  }

  if (mismatchedGhName) {
    // Different GitHub org, not a known transfer → likely collision
    return {
      confidence: 55,
      matchReason: 'PyPI project URL points to different GitHub org',
      warning: `PyPI repo is ${mismatchedGhName}, expected ${agentRow.github_full_name} — likely name collision`,
    };
  }

  // Homepage/website match → 85
  for (const url of allUrls) {
    if (websiteMatches(url, agentRow.website_url)) {
      return { confidence: 85, matchReason: 'PyPI project URL matches agent website_url', warning: null };
    }
  }

  // pyproject.toml URL matches github_full_name → 85
  for (const url of Object.values(candidate.urls ?? {})) {
    if (ghUrlMatchesFullName(url, agentRow.github_full_name)) {
      return { confidence: 85, matchReason: 'pyproject.toml URL matches github_full_name', warning: null };
    }
  }

  // Registry exists but no URLs to verify (genuinely ambiguous)
  return {
    confidence: 70,
    matchReason: 'in PyPI, no project URLs to verify',
    warning: allUrls.length > 0
      ? `PyPI URLs present but none are GitHub links: [${allUrls.slice(0, 2).join(', ')}]`
      : 'PyPI exists but no project URLs declared',
  };
}

// ─── Per-agent processing ─────────────────────────────────────────────────────

function makePlaceholderCandidate(agentRow, meta, registry, name, version) {
  return {
    agent_id: agentRow.agent_id,
    handle: meta.handle ?? agentRow.github_full_name,
    display_name: meta.display_name ?? null,
    github_full_name: agentRow.github_full_name,
    registry,
    package_name: name,
    version,
    registry_exists: false,
    confidence: 0,
    match_reason: 'placeholder/generic package name',
    warning: `"${name}" is a generic build artefact name — hard rejected, never safe to map`,
    registry_repo_url: null,
    fetch_error: null,
    is_fallback: false,
  };
}

async function processAgent(agentRow, agentMeta, token) {
  const { github_full_name, has_package_json, has_pyproject_toml } = agentRow;
  const meta = agentMeta.get(agentRow.agent_id) ?? {};
  const results = [];
  const fetchErrors = [];

  // ── npm / package.json ────────────────────────────────────────────────────
  if (has_package_json) {
    let text = null;
    try {
      text = await fetchFileContent(github_full_name, 'package.json', token);
      await sleep(DELAY_MS);
    } catch (e) {
      fetchErrors.push(`package.json fetch: ${e.message}`);
    }

    if (text) {
      const parsed = parsePackageJson(text);
      if (parsed) {
        // Hard-reject placeholder names before hitting registry.
        if (isPlaceholderName(parsed.name)) {
          results.push(makePlaceholderCandidate(agentRow, meta, 'npm', parsed.name, parsed.version));
        } else {
          let npmResult;
          try {
            npmResult = await verifyNpm(parsed.name);
            await sleep(DELAY_MS);
          } catch (e) {
            fetchErrors.push(`npm verify ${parsed.name}: ${e.message}`);
            npmResult = { exists: false, error: e.message };
          }
          const { confidence, matchReason, warning } = scoreNpmCandidate(parsed, npmResult, agentRow);
          results.push({
            agent_id: agentRow.agent_id,
            handle: meta.handle ?? github_full_name,
            display_name: meta.display_name ?? null,
            github_full_name,
            registry: 'npm',
            package_name: parsed.name,
            version: parsed.version,
            registry_exists: npmResult.exists,
            confidence,
            match_reason: matchReason,
            warning,
            registry_repo_url: npmResult.repoUrl ?? null,
            fetch_error: npmResult.error ?? null,
            is_fallback: false,
          });
        }
      } else {
        fetchErrors.push('package.json parsed but no "name" field found');
      }
    } else if (!fetchErrors.some(e => e.startsWith('package.json'))) {
      fetchErrors.push('package.json: 404 or missing content');
    }
  }

  // ── PyPI / pyproject.toml ─────────────────────────────────────────────────
  if (has_pyproject_toml) {
    let text = null;
    try {
      text = await fetchFileContent(github_full_name, 'pyproject.toml', token);
      await sleep(DELAY_MS);
    } catch (e) {
      fetchErrors.push(`pyproject.toml fetch: ${e.message}`);
    }

    if (text) {
      let parsed = parsePyprojectToml(text);
      let isFallback = false;

      if (!parsed) {
        // Conservative fallback: only for explicitly curated repos.
        const fb = TOML_FALLBACKS[github_full_name.toLowerCase()];
        if (fb && fb.registry === 'pypi') {
          parsed = { section: 'fallback', name: fb.name, version: null, urls: {} };
          isFallback = true;
          fetchErrors.push(
            `pyproject.toml: no [project]/[tool.poetry] name found; ` +
            `using curated fallback "${fb.name}"`
          );
        } else {
          fetchErrors.push('pyproject.toml parsed but no [project] or [tool.poetry] name found');
        }
      }

      if (parsed) {
        if (isPlaceholderName(parsed.name)) {
          results.push(makePlaceholderCandidate(agentRow, meta, 'pypi', parsed.name, parsed.version));
        } else {
          let pypiResult;
          try {
            pypiResult = await verifyPypi(parsed.name);
            await sleep(DELAY_MS);
          } catch (e) {
            fetchErrors.push(`PyPI verify ${parsed.name}: ${e.message}`);
            pypiResult = { exists: false, error: e.message };
          }
          const { confidence, matchReason, warning } = scorePypiCandidate(parsed, pypiResult, agentRow);
          results.push({
            agent_id: agentRow.agent_id,
            handle: meta.handle ?? github_full_name,
            display_name: meta.display_name ?? null,
            github_full_name,
            registry: 'pypi',
            package_name: parsed.name,
            version: parsed.version,
            registry_exists: pypiResult.exists,
            confidence,
            match_reason: matchReason,
            warning,
            registry_repo_url: null,
            fetch_error: pypiResult.error ?? null,
            is_fallback: isFallback,
          });
        }
      }
    } else if (!fetchErrors.some(e => e.startsWith('pyproject.toml'))) {
      fetchErrors.push('pyproject.toml: 404 or missing content');
    }
  }

  return { results, fetchErrors };
}

// ─── Output ───────────────────────────────────────────────────────────────────

function tierLabel(confidence) {
  if (confidence === 0)   return 'HARD_REJECT';
  if (confidence >= 95)   return 'HIGH_AUTO';
  if (confidence >= 85)   return 'GOOD_WARN';
  if (confidence >= 70)   return 'MAN_REVIEW';
  return 'REJECTED';
}

function printCandidateTable(candidates) {
  if (candidates.length === 0) {
    console.log('  (no candidates found)');
    return;
  }

  const cols = {
    handle:          { label: 'Handle',       width: 28 },
    registry:        { label: 'Reg',          width: 5  },
    package_name:    { label: 'Package',       width: 32 },
    version:         { label: 'Version',       width: 10 },
    registry_exists: { label: 'InReg',         width: 5  },
    confidence:      { label: 'Conf',          width: 4  },
    tier:            { label: 'Tier',          width: 11 },
    match_reason:    { label: 'Match reason',  width: 42 },
  };

  const header = Object.values(cols).map(c => c.label.padEnd(c.width)).join('  ');
  const sep    = Object.values(cols).map(c => '─'.repeat(c.width)).join('  ');

  console.log('  ' + header);
  console.log('  ' + sep);

  for (const c of candidates) {
    const tier = tierLabel(c.confidence);
    const fallbackMark = c.is_fallback ? ' [fallback]' : '';
    const row = [
      (c.handle ?? '').slice(0, cols.handle.width).padEnd(cols.handle.width),
      (c.registry ?? '').padEnd(cols.registry.width),
      ((c.package_name ?? '') + fallbackMark).slice(0, cols.package_name.width).padEnd(cols.package_name.width),
      (c.version ?? '—').slice(0, cols.version.width).padEnd(cols.version.width),
      (c.registry_exists ? 'yes' : 'no').padEnd(cols.registry_exists.width),
      String(c.confidence).padEnd(cols.confidence.width),
      tier.padEnd(cols.tier.width),
      (c.match_reason ?? '').slice(0, cols.match_reason.width),
    ].join('  ');
    console.log('  ' + row);

    if (c.warning) {
      console.log('  ' + ' '.repeat(cols.handle.width + 2) + `⚠  ${c.warning}`);
    }
    if (c.fetch_error) {
      console.log('  ' + ' '.repeat(cols.handle.width + 2) + `✗  fetch error: ${c.fetch_error}`);
    }
  }
}

function printSummary(candidates, agentsChecked, agentsSkipped, allErrors) {
  const npm  = candidates.filter(c => c.registry === 'npm');
  const pypi = candidates.filter(c => c.registry === 'pypi');

  const highAuto    = candidates.filter(c => c.confidence >= 95);
  const goodWarn    = candidates.filter(c => c.confidence >= 85 && c.confidence < 95);
  const manReview   = candidates.filter(c => c.confidence >= 70 && c.confidence < 85);
  const rejected    = candidates.filter(c => c.confidence > 0 && c.confidence < 70);
  const hardReject  = candidates.filter(c => c.confidence === 0);

  console.log('\n══ Summary ═══════════════════════════════════════════════════════════════════');
  console.log(`  Agents checked:           ${agentsChecked}  (skipped: ${agentsSkipped})`);
  console.log(`  Candidates found:         ${candidates.length}  (npm: ${npm.length}, pypi: ${pypi.length})`);
  console.log(`  HIGH_AUTO    (≥95):       ${highAuto.length}   — safe for automated write`);
  console.log(`  GOOD_WARN    (85–94):     ${goodWarn.length}   — auto-write with caveat OK`);
  console.log(`  MAN_REVIEW   (70–84):     ${manReview.length}   — needs human sign-off before write`);
  console.log(`  REJECTED     (50–69):     ${rejected.length}   — not in registry or org mismatch`);
  console.log(`  HARD_REJECT  (0):         ${hardReject.length}   — placeholder name, never write`);
  if (allErrors.length > 0) {
    console.log(`  Fetch/parse notes:        ${allErrors.reduce((n, e) => n + e.errors.length, 0)}`);
  }

  // ── HIGH_AUTO ──────────────────────────────────────────────────────────────
  if (highAuto.length > 0) {
    console.log('\n── HIGH_AUTO (≥95) — safe for automated write ───────────────────────────────');
    for (const c of highAuto) {
      const fb = c.is_fallback ? ' [fallback]' : '';
      const dn = c.display_name ? ` (${c.display_name})` : '';
      console.log(`  ${c.registry.padEnd(5)}  ${(c.package_name + fb).padEnd(38)}  conf=95  ${c.github_full_name}${dn}`);
    }
  }

  // ── GOOD_WARN ──────────────────────────────────────────────────────────────
  if (goodWarn.length > 0) {
    console.log('\n── GOOD_WARN (85–94) — auto-write OK, review warnings ───────────────────────');
    for (const c of goodWarn) {
      const dn = c.display_name ? ` (${c.display_name})` : '';
      console.log(`  ${c.registry.padEnd(5)}  ${c.package_name.padEnd(38)}  conf=${c.confidence}  ${c.github_full_name}${dn}`);
      if (c.warning) console.log(`             ⚠  ${c.warning}`);
    }
  }

  // ── MAN_REVIEW ────────────────────────────────────────────────────────────
  if (manReview.length > 0) {
    console.log('\n── MAN_REVIEW (70–84) — needs human sign-off before write ──────────────────');
    for (const c of manReview) {
      console.log(`  ${c.registry.padEnd(5)}  ${c.package_name.padEnd(38)}  conf=${c.confidence}  ${c.github_full_name}`);
      if (c.warning) console.log(`             ⚠  ${c.warning}`);
    }
  }

  // ── REJECTED ──────────────────────────────────────────────────────────────
  if (rejected.length > 0) {
    console.log('\n── REJECTED (50–69) — not in registry or org mismatch ───────────────────────');
    for (const c of rejected) {
      console.log(`  ${c.registry.padEnd(5)}  ${c.package_name.padEnd(38)}  conf=${c.confidence}  ${c.github_full_name}`);
      if (c.warning) console.log(`             ⚠  ${c.warning}`);
    }
  }

  // ── HARD_REJECT ───────────────────────────────────────────────────────────
  if (hardReject.length > 0) {
    console.log('\n── HARD_REJECT (0) — placeholder name, never write ─────────────────────────');
    for (const c of hardReject) {
      console.log(`  ${c.registry.padEnd(5)}  ${c.package_name.padEnd(38)}  ${c.github_full_name}`);
      if (c.warning) console.log(`             ⚠  ${c.warning}`);
    }
  }

  // ── Monorepo / multi-registry ─────────────────────────────────────────────
  const bothMap = new Map();
  for (const c of candidates) {
    if (!bothMap.has(c.agent_id)) bothMap.set(c.agent_id, []);
    bothMap.get(c.agent_id).push(c);
  }
  const multiRegistry = [...bothMap.values()].filter(
    cs => cs.some(c => c.registry === 'npm') && cs.some(c => c.registry === 'pypi')
  );
  if (multiRegistry.length > 0) {
    console.log('\n── Multi-registry agents ────────────────────────────────────────────────────');
    for (const cs of multiRegistry) {
      const first = cs[0];
      console.log(`  ${first.handle ?? first.github_full_name}  →  ${cs.map(c => `${c.registry}:${c.package_name}(${c.confidence})`).join(', ')}`);
    }
    console.log('  Verify each registry independently before writing.');
  }

  // ── Fetch/parse notes ─────────────────────────────────────────────────────
  if (allErrors.length > 0) {
    console.log('\n── Fetch/parse notes ────────────────────────────────────────────────────────');
    for (const { github_full_name, errors } of allErrors) {
      for (const e of errors) {
        console.log(`  ${github_full_name}: ${e}`);
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  await loadEnvFiles(ENV_PATHS);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token       = process.env.GITHUB_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env');
  }
  if (!token) {
    console.warn('Warning: GITHUB_TOKEN not set — GitHub API calls will be rate-limited');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('AgentCrush Package Discovery Worker — DRY RUN');
  console.log(`Limit: ${args.limit} agents`);
  console.log('');

  console.log('Querying agent_docs_quality_signals for package file flags…');
  const rawRows = await fetchSignalRows(supabase, args.limit);
  const signalRows = deduplicateByAgent(rawRows).slice(0, args.limit);

  console.log(`Found ${signalRows.length} agents with package files (after dedup)`);

  if (signalRows.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  const agentIds = signalRows.map(r => r.agent_id);
  const agentMeta = await fetchAgentMeta(supabase, agentIds);

  console.log('\n══ Per-agent results ═════════════════════════════════════════════════════════');
  const allCandidates = [];
  const allErrors = [];
  let agentsSkipped = 0;

  for (const row of signalRows) {
    console.log(`\n  ▶ ${row.github_full_name}  [pkg=${row.has_package_json ? 'json' : '—'} pyp=${row.has_pyproject_toml ? 'toml' : '—'}]`);

    let result;
    try {
      result = await processAgent(row, agentMeta, token);
    } catch (e) {
      console.log(`    ERROR: ${e.message}`);
      agentsSkipped++;
      continue;
    }

    printCandidateTable(result.results);

    if (result.results.length === 0) agentsSkipped++;
    allCandidates.push(...result.results);
    if (result.fetchErrors.length > 0) {
      allErrors.push({ github_full_name: row.github_full_name, errors: result.fetchErrors });
    }
  }

  printSummary(allCandidates, signalRows.length - agentsSkipped, agentsSkipped, allErrors);

  console.log('\nDone. No writes performed.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
