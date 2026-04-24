/**
 * Dependency graph dry-run worker — indexed repos only.
 *
 * Scans GitHub repos for AgentCrush agents, finds which repos depend on
 * verified agent packages, and prints a dependency edge report.
 *
 * This is a dry-run-only worker. It never writes to Supabase.
 *
 * Modes:
 *   --dry-run          Fetch, match, print. No writes. (required)
 *   --source indexed   Only scan AgentCrush indexed repos. (required for v1)
 *   --limit N          Max repos to scan (default 20, max 45).
 *
 * Trust policy:
 *   Only mapping_status='high_auto' AND confidence>=95 from
 *   agent_package_mapping_latest are used for matching.
 *
 * Never writes: agents, rankings, Supabase tables, any RPC.
 * Never prints: secrets, tokens, keys.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const ENV_PATHS = [
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

const DEFAULT_LIMIT  = 20;
const MAX_LIMIT      = 45;
const GH_BASE        = 'https://api.github.com';
const USER_AGENT     = 'AgentCrush-DepGraph-Worker/1.0 (agentcrush.com)';
const GH_DELAY_MS    = 350;   // inter-request delay — stays well inside secondary rate limits

// Dep files we parse (in order of preference per repo).
const DEP_FILES = ['package.json', 'requirements.txt', 'pyproject.toml'];

// Lockfiles and generated files — skip these even if present.
const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'poetry.lock', 'requirements-dev.txt', 'setup.py', 'setup.cfg',
]);

// ─── Argument parsing ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, source: null, limit: DEFAULT_LIMIT };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') { args.dryRun = true; continue; }

    if (arg === '--write') {
      console.error('Error: --write is not supported in v1. This worker is dry-run only.');
      process.exit(1);
    }

    if (arg === '--source') {
      const raw = argv[i + 1];
      if (!raw) throw new Error('Missing value for --source');
      if (raw !== 'indexed') throw new Error(`--source "${raw}" not supported. Only "indexed" is available in v1.`);
      args.source = raw;
      i++;
      continue;
    }
    if (arg.startsWith('--source=')) {
      const raw = arg.slice('--source='.length);
      if (raw !== 'indexed') throw new Error(`--source "${raw}" not supported. Only "indexed" is available in v1.`);
      args.source = raw;
      continue;
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

  if (!args.dryRun) throw new Error('--dry-run is required. This worker never writes.');
  if (!args.source) throw new Error('--source indexed is required.');

  return args;
}

function parseLimit(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) throw new Error('--limit must be a positive integer');
  return Math.min(n, MAX_LIMIT);
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
      // Optional — files vary by deployment.
    }
  }
}

// ─── Supabase (read-only) ─────────────────────────────────────────────────────

async function fetchHighAutoMappings(supabase) {
  const { data, error } = await supabase
    .from('agent_package_mapping_latest')
    .select('agent_id, registry, package_name, confidence, github_full_name')
    .eq('mapping_status', 'high_auto')
    .gte('confidence', 95);

  if (error) throw error;
  return data || [];
}

async function fetchIndexedAgents(supabase, limit) {
  const { data, error } = await supabase
    .from('agents')
    .select('id, handle, display_name, github_full_name')
    .not('github_full_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ─── Package lookup maps ───────────────────────────────────────────────────────

function normalizePypiName(name) {
  // PEP 503 normalized name: lowercase, underscores/hyphens/dots → hyphen
  return name.toLowerCase().replace(/[-_.]+/g, '-');
}

function buildLookupMaps(mappings) {
  // npm: exact package_name → mapping row
  const npmMap = new Map();
  // pypi: normalized name → mapping row
  const pypiMap = new Map();

  for (const m of mappings) {
    if (m.registry === 'npm') {
      npmMap.set(m.package_name, m);
    } else if (m.registry === 'pypi') {
      pypiMap.set(normalizePypiName(m.package_name), m);
    }
  }

  return { npmMap, pypiMap };
}

// ─── GitHub API ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ghGet(path, token) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': USER_AGENT,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${GH_BASE}${path}`, { headers });
  if (res.status === 404) return { status: 404, data: null };
  if (res.status === 403 || res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const wait = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 60_000;
    console.warn(`  [rate-limit] waiting ${Math.round(wait / 1000)}s…`);
    await sleep(wait);
    // Retry once.
    const r2 = await fetch(`${GH_BASE}${path}`, { headers });
    if (!r2.ok) return { status: r2.status, data: null, error: `GitHub ${r2.status}` };
    return { status: r2.status, data: await r2.json() };
  }
  if (!res.ok) return { status: res.status, data: null, error: `GitHub ${res.status}` };
  return { status: res.status, data: await res.json() };
}

async function fetchRootContents(fullName, token) {
  const { status, data, error } = await ghGet(`/repos/${fullName}/contents`, token);
  if (status === 404) return { found: false, files: new Set() };
  if (error || !Array.isArray(data)) return { found: false, files: new Set(), error };
  const files = new Set(data.filter(f => f.type === 'file').map(f => f.name.toLowerCase()));
  return { found: true, files };
}

async function fetchFileText(fullName, filePath, token) {
  const { status, data, error } = await ghGet(`/repos/${fullName}/contents/${filePath}`, token);
  if (status === 404) return { text: null, missing: true };
  if (error || !data) return { text: null, error: error ?? 'no data' };
  if (!data.content || data.encoding !== 'base64') return { text: null, error: 'unexpected encoding' };
  const text = Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf8');
  return { text };
}

// ─── Dependency file parsers ───────────────────────────────────────────────────

// Returns { deps: [{name, depType}], error }
function parsePackageJsonDeps(text) {
  let pkg;
  try { pkg = JSON.parse(text); } catch (e) {
    return { deps: [], error: `JSON parse error: ${e.message}` };
  }
  if (!pkg || typeof pkg !== 'object') return { deps: [], error: 'not an object' };

  const deps = [];
  const add = (obj, depType) => {
    if (obj && typeof obj === 'object') {
      for (const name of Object.keys(obj)) {
        if (typeof name === 'string' && name.trim()) {
          deps.push({ name: name.trim(), depType });
        }
      }
    }
  };

  add(pkg.dependencies,    'dependency');
  add(pkg.devDependencies, 'dev_dependency');
  add(pkg.peerDependencies,'peer_dependency');

  return { deps };
}

// Returns { deps: [{name, depType}], error }
function parseRequirementsTxt(text) {
  const deps = [];
  const errors = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    // Skip comments, blank lines, flags, file includes.
    if (!line || line.startsWith('#') || line.startsWith('-') || line.startsWith('.')) continue;

    // Strip inline comment.
    const noComment = line.split('#')[0].trim();
    if (!noComment) continue;

    // Strip extras [extras] and version specifiers.
    // PEP 508: name[extras] (version) ; marker
    const m = noComment.match(/^([A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?)/);
    if (!m) {
      errors.push(`Could not parse line: ${line.slice(0, 60)}`);
      continue;
    }

    deps.push({ name: m[1], depType: 'dependency' });
  }

  return { deps, error: errors.length > 0 ? errors.join('; ') : null };
}

// Returns { deps: [{name, depType}], error }
// Handles both PEP 621 [project].dependencies array and Poetry [tool.poetry.dependencies] table.
function parsePyprojectTomlDeps(text) {
  const deps = [];
  const errors = [];

  // ── PEP 621: [project].dependencies = ["pkg>=1.0", ...] ──────────────────
  const projectM = text.match(/^\[project\][ \t]*$([\s\S]*?)(?=^\[)/im);
  if (projectM) {
    const section = projectM[1];
    // Find the start of the dependencies array, then find its closing ']' on its own line.
    // Matching on bare ']' would be broken by extras notation like package[extras].
    const startM = section.match(/^dependencies\s*=\s*\[/im);
    if (startM) {
      const afterOpen = section.slice((section.indexOf(startM[0]) + startM[0].length));
      const closeIdx = afterOpen.search(/^\]/m); // ']' at start of a line = array close
      const block = closeIdx >= 0 ? afterOpen.slice(0, closeIdx) : afterOpen;
      // Parse line-by-line: each line holds exactly one package spec.
      // Cross-line regex matching breaks on PEP 508 env markers like '; python_version<'3.10''.
      for (const line of block.split('\n')) {
        const lineT = line.trim();
        if (!lineT || lineT.startsWith('#')) continue;
        // Take the first quoted string on the line — the package spec.
        const qm = lineT.match(/^["']([^"']+)/);
        if (!qm) continue;
        const raw = qm[1].trim();
        const nm = raw.match(/^([A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?)/);
        if (nm) {
          deps.push({ name: nm[1], depType: 'dependency' });
        } else {
          errors.push(`Could not parse [project] dep: ${raw.slice(0, 60)}`);
        }
      }
    }
  }

  // ── Poetry: [tool.poetry.dependencies] key = "version" table ─────────────
  // Shape: package_name = "version" or package_name = {version = "...", ...}
  // Skip: python (interpreter constraint, not a package dep).
  const poetryM = text.match(/^\[tool\.poetry\.dependencies\][ \t]*$([\s\S]*?)(?=^\[)/im);
  if (poetryM) {
    const section = poetryM[1];
    for (const line of section.split('\n')) {
      const lineT = line.trim();
      if (!lineT || lineT.startsWith('#')) continue;
      // key = value — extract key only.
      const m = lineT.match(/^([A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?)\s*=/);
      if (!m) continue;
      const name = m[1];
      if (name.toLowerCase() === 'python') continue; // interpreter constraint
      deps.push({ name, depType: 'dependency' });
    }
  }

  return { deps, error: errors.length > 0 ? errors.join('; ') : null };
}

// ─── Matching ──────────────────────────────────────────────────────────────────

function matchDeps(deps, depFile, scannedRepo, scannedAgent, mappings, npmMap, pypiMap) {
  const edges = [];
  const selfMatches = [];

  for (const { name, depType } of deps) {
    const registry = depFile === 'package.json' ? 'npm' : 'pypi';
    let mapping = null;
    let matchSource = null;

    if (registry === 'npm') {
      if (npmMap.has(name)) {
        mapping = npmMap.get(name);
        matchSource = 'exact';
      }
    } else {
      const norm = normalizePypiName(name);
      if (pypiMap.has(norm)) {
        mapping = pypiMap.get(norm);
        matchSource = norm === name ? 'exact' : 'normalized';
      }
    }

    if (!mapping) continue;

    const edge = {
      scanned_repo:       scannedRepo.github_full_name,
      scanned_agent_id:   scannedAgent.id,
      scanned_agent_handle: scannedAgent.handle,
      scanned_display_name: scannedAgent.display_name,
      matched_package:    mapping.package_name,
      matched_agent_id:   mapping.agent_id,
      matched_github_full_name: mapping.github_full_name,
      registry,
      dep_file:           depFile,
      dep_type:           depType,
      match_source:       matchSource,
      mapping_confidence: mapping.confidence,
      source_tier:        'indexed',
    };

    // Self-match: the scanned repo IS the matched agent's repo.
    if (
      scannedRepo.github_full_name &&
      mapping.github_full_name &&
      scannedRepo.github_full_name.toLowerCase() === mapping.github_full_name.toLowerCase()
    ) {
      selfMatches.push(edge);
    } else {
      edges.push(edge);
    }
  }

  return { edges, selfMatches };
}

// ─── Per-repo processing ───────────────────────────────────────────────────────

async function processRepo(agent, mappings, npmMap, pypiMap, token, stats) {
  const fullName = agent.github_full_name;
  process.stdout.write(`  [${fullName}] `);

  // Fetch root contents listing.
  const { found, files, error: contentsError } = await fetchRootContents(fullName, token);
  await sleep(GH_DELAY_MS);

  if (!found) {
    process.stdout.write(`repo not found or empty\n`);
    stats.fetchErrors.push(`${fullName}: root contents — ${contentsError ?? '404'}`);
    return { edges: [], selfMatches: [] };
  }

  const presentDepFiles = DEP_FILES.filter(f => files.has(f.toLowerCase()));
  process.stdout.write(`files=[${presentDepFiles.join(',') || 'none'}] `);
  stats.filesFetched += presentDepFiles.length;

  const allEdges = [];
  const allSelfMatches = [];

  for (const depFile of presentDepFiles) {
    const { text, missing, error: fetchError } = await fetchFileText(fullName, depFile, token);
    await sleep(GH_DELAY_MS);

    if (missing || !text) {
      if (fetchError) stats.fetchErrors.push(`${fullName}/${depFile}: ${fetchError}`);
      continue;
    }

    let parsed;
    if (depFile === 'package.json') {
      parsed = parsePackageJsonDeps(text);
    } else if (depFile === 'requirements.txt') {
      parsed = parseRequirementsTxt(text);
    } else if (depFile === 'pyproject.toml') {
      parsed = parsePyprojectTomlDeps(text);
    } else {
      continue;
    }

    if (parsed.error) {
      stats.parseErrors.push(`${fullName}/${depFile}: ${parsed.error}`);
    }

    const { edges, selfMatches } = matchDeps(
      parsed.deps, depFile, agent, agent, mappings, npmMap, pypiMap
    );
    allEdges.push(...edges);
    allSelfMatches.push(...selfMatches);
  }

  const matchCount = allEdges.length + allSelfMatches.length;
  process.stdout.write(`matches=${allEdges.length}${allSelfMatches.length > 0 ? ` self=${allSelfMatches.length}` : ''}\n`);

  return { edges: allEdges, selfMatches: allSelfMatches };
}

// ─── Reporting ────────────────────────────────────────────────────────────────

// Build a lookup of agent_id → handle from mappings + agents list.
function buildAgentHandleMap(mappings, agents) {
  const map = new Map();
  for (const a of agents) map.set(a.id, a.handle ?? a.display_name ?? a.id.slice(0, 8));
  return map;
}

function printReport(agents, mappings, allEdges, allSelfMatches, stats, args) {
  const agentHandleMap = buildAgentHandleMap(mappings, agents);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Dependency Graph Worker — DRY-RUN — source=indexed');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  repos_checked              ${stats.reposChecked}`);
  console.log(`  files_fetched              ${stats.filesFetched}`);
  console.log(`  package_mappings_loaded    ${mappings.length}`);
  console.log(`  dependency_matches_found   ${allEdges.length}`);
  console.log(`  self_matches_excluded      ${allSelfMatches.length}`);
  console.log(`  parse_errors               ${stats.parseErrors.length}`);
  console.log(`  fetch_errors               ${stats.fetchErrors.length}`);
  console.log('');

  if (allEdges.length > 0) {
    console.log('  Dependency edges (non-self):');
    console.log('  ─────────────────────────────────────────────────────────────');
    for (const e of allEdges) {
      const matchedHandle = agentHandleMap.get(e.matched_agent_id) ?? e.matched_agent_id?.slice(0, 8);
      console.log(
        `  [${e.registry}] ${e.scanned_repo.padEnd(35)} ` +
        `depends on  ${e.matched_package.padEnd(22)} ` +
        `(${matchedHandle})`
      );
      console.log(
        `           file=${e.dep_file}  dep_type=${e.dep_type}  ` +
        `match=${e.match_source}  conf=${e.mapping_confidence}  tier=${e.source_tier}`
      );
    }
    console.log('');
  } else {
    console.log('  No dependency edges found (non-self).');
    console.log('');
  }

  if (allSelfMatches.length > 0) {
    console.log('  Self-matches excluded (scanned repo IS the matched agent):');
    console.log('  ─────────────────────────────────────────────────────────────');
    for (const e of allSelfMatches) {
      console.log(`  [${e.registry}] ${e.scanned_repo}  →  ${e.matched_package}  (self)`);
    }
    console.log('');
  }

  // Top matched packages.
  if (allEdges.length > 0) {
    const pkgCounts = new Map();
    for (const e of allEdges) {
      pkgCounts.set(e.matched_package, (pkgCounts.get(e.matched_package) ?? 0) + 1);
    }
    const topPkgs = [...pkgCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log('  Top matched packages (by dependent repo count):');
    console.log('  ─────────────────────────────────────────────────────────────');
    for (const [pkg, count] of topPkgs) {
      console.log(`  ${count.toString().padStart(3)}  ${pkg}`);
    }
    console.log('');

    // Top dependent repos.
    const repoCounts = new Map();
    for (const e of allEdges) {
      repoCounts.set(e.scanned_repo, (repoCounts.get(e.scanned_repo) ?? 0) + 1);
    }
    const topRepos = [...repoCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log('  Top dependent repos (by matched package count):');
    console.log('  ─────────────────────────────────────────────────────────────');
    for (const [repo, count] of topRepos) {
      console.log(`  ${count.toString().padStart(3)}  ${repo}`);
    }
    console.log('');
  }

  if (stats.parseErrors.length > 0) {
    console.log('  Parse errors:');
    for (const e of stats.parseErrors) console.log(`  ⚠  ${e}`);
    console.log('');
  }

  if (stats.fetchErrors.length > 0) {
    console.log('  Fetch errors:');
    for (const e of stats.fetchErrors) console.log(`  ✗  ${e}`);
    console.log('');
  }

  console.log('  No writes made. Dry-run complete.');
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Usage: dependency-graph-worker.mjs --dry-run --source indexed [--limit N]');
    process.exit(1);
  }

  await loadEnvFiles(ENV_PATHS);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const ghToken = process.env.GITHUB_TOKEN ?? null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Load package mappings and build lookup maps.
  console.log('Loading high_auto package mappings…');
  const mappings = await fetchHighAutoMappings(supabase);
  console.log(`Loaded ${mappings.length} high_auto mappings.`);
  const { npmMap, pypiMap } = buildLookupMaps(mappings);
  console.log(`  npm packages: ${npmMap.size}  PyPI packages (normalized): ${pypiMap.size}`);

  // Load indexed agents.
  console.log(`\nLoading indexed agents (limit=${args.limit})…`);
  const agents = await fetchIndexedAgents(supabase, args.limit);
  console.log(`Loaded ${agents.length} agents with github_full_name.`);

  if (agents.length === 0) {
    console.log('No agents to scan. Exiting.');
    return;
  }

  // Build a map of github_full_name → agent for the scanned set.
  const agentByRepo = new Map();
  for (const a of agents) {
    agentByRepo.set(a.github_full_name.toLowerCase(), a);
  }

  const stats = {
    reposChecked: 0,
    filesFetched: 0,
    fetchErrors:  [],
    parseErrors:  [],
  };

  const allEdges       = [];
  const allSelfMatches = [];

  console.log(`\nScanning ${agents.length} repos for dependency references…`);
  console.log('  (delay=' + GH_DELAY_MS + 'ms between GitHub requests)');
  console.log('');

  for (const agent of agents) {
    stats.reposChecked++;
    const { edges, selfMatches } = await processRepo(
      agent, mappings, npmMap, pypiMap, ghToken, stats
    );
    allEdges.push(...edges);
    allSelfMatches.push(...selfMatches);
  }

  printReport(agents, mappings, allEdges, allSelfMatches, stats, args);
}

main().catch(err => {
  console.error('Fatal:', err.message ?? err);
  process.exit(1);
});
