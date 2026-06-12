#!/usr/bin/env node
/**
 * bot-fetch-friendliness-scanner.mjs
 *
 * Scans the homepage / website_url of each indexed agent for
 * machine-discoverable signals:
 *
 *   - GET  /.well-known/x402           (HEAD)
 *   - GET  /.well-known/agent-card.json (HEAD)
 *   - GET  /.well-known/mcp.json       (HEAD)
 *   - GET  /openapi.json or /openapi.yaml (HEAD)
 *   - GET  /robots.txt                 (fetch + heuristic check)
 *
 * Writes a jsonb summary plus a smallint score (0..5) into the agents table.
 *
 * NOT a ranking signal. Display-only.
 *
 * Flags:
 *   --dry-run            Do not write to DB
 *   --limit N            Only scan N agents
 *   --agent-handle X     Only scan this handle
 *   --concurrency N      Default 10
 *   --timeout-ms N       Default 5000
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const DEFAULT_ENV_PATH = '/opt/agentcrush/scanner/.env';
const SURFACES = [
  'has_well_known_x402',
  'has_agent_card',
  'has_mcp_manifest',
  'has_openapi',
  'has_robots_txt_allow',
];

function parseArgs(argv) {
  const args = { dryRun: false, limit: null, agentHandle: null, concurrency: 10, timeoutMs: 5000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--agent-handle') args.agentHandle = argv[++i];
    else if (a === '--concurrency') args.concurrency = parseInt(argv[++i], 10);
    else if (a === '--timeout-ms') args.timeoutMs = parseInt(argv[++i], 10);
  }
  return args;
}

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadEnvFile(path) {
  try {
    const text = await fs.readFile(path, 'utf8');
    const parsed = parseEnv(text);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // optional — env can also come from the shell
  }
}

function normalizeBaseUrl(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

async function probe(url, timeoutMs, { method = 'HEAD' } = {}) {
  try {
    const res = await fetchWithTimeout(url, {
      method,
      headers: { 'User-Agent': 'agentcrush-bot-fetch-friendliness-scanner/1.0' },
    }, timeoutMs);
    if (res.status === 429 || res.status === 503) {
      await new Promise(r => setTimeout(r, 1500));
      const res2 = await fetchWithTimeout(url, {
        method,
        headers: { 'User-Agent': 'agentcrush-bot-fetch-friendliness-scanner/1.0' },
      }, timeoutMs);
      return res2;
    }
    return res;
  } catch {
    return null;
  }
}

function isOk(res) {
  return res && res.status >= 200 && res.status < 300;
}

// Soft-404 guard (2026-06-12): many sites (SPAs, GitHub Pages) return 200 HTML
// for ANY path, so a 2xx on /.well-known/* proves nothing. A surface only
// counts if the body parses as JSON AND carries at least one key the spec
// actually requires. This bug inflated the PCS-3 cohort with awesome-list
// repos "supporting" x402/A2A/MCP.
async function probeJsonShape(url, timeoutMs, requiredAnyKeys) {
  const res = await probe(url, timeoutMs);
  if (!isOk(res)) return false;
  let text;
  try { text = await res.text(); } catch { return false; }
  const t = text.trim();
  if (!t || t[0] === '<') return false; // HTML soft-404
  let parsed;
  try { parsed = JSON.parse(t); } catch { return false; }
  if (typeof parsed !== 'object' || parsed === null) return false;
  const keys = Object.keys(Array.isArray(parsed) ? (parsed[0] || {}) : parsed);
  return requiredAnyKeys.some((k) => keys.includes(k));
}

async function checkOpenApi(base, timeoutMs) {
  if (await probeJsonShape(`${base}/openapi.json`, timeoutMs, ['openapi', 'swagger'])) return true;
  const b = await probe(`${base}/openapi.yaml`, timeoutMs);
  if (!isOk(b)) return false;
  try {
    const text = (await b.text()).trim();
    return text[0] !== '<' && /(^|\n)\s*(openapi|swagger)\s*:/.test(text.slice(0, 2000));
  } catch { return false; }
}

async function checkRobotsAllow(base, timeoutMs) {
  const res = await probe(`${base}/robots.txt`, timeoutMs, { method: 'GET' });
  if (!isOk(res)) return false;
  let text;
  try { text = await res.text(); } catch { return false; }
  if (!text || text.length === 0) return false;
  if (text.trim().startsWith('<')) return false; // HTML soft-404, not a robots.txt

  // Heuristic: not "entirely Disallow: /". Any Allow: line, or any
  // Disallow with no path/comment-only, counts as permissive.
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let sawAllow = false;
  let sawDisallowAll = false;
  let sawAnyDisallow = false;
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    if (/^Allow:\s*\S/i.test(line)) sawAllow = true;
    if (/^Disallow:\s*\/\s*$/i.test(line)) sawDisallowAll = true;
    if (/^Disallow:/i.test(line)) sawAnyDisallow = true;
  }
  if (sawAllow) return true;
  if (!sawAnyDisallow) return true; // no rules = effectively allow
  return !sawDisallowAll;
}

async function scanAgent(agent, timeoutMs) {
  const base = normalizeBaseUrl(agent.website_url);
  if (!base) {
    return { agent, base: null, result: null, skipped: 'no_website' };
  }

  const [x402, agentCard, mcp, openapi, robotsAllow] = await Promise.all([
    probeJsonShape(`${base}/.well-known/x402`, timeoutMs, ['x402Version', 'accepts', 'resources']),
    probeJsonShape(`${base}/.well-known/agent-card.json`, timeoutMs, ['skills', 'capabilities', 'protocolVersion', 'url']),
    probeJsonShape(`${base}/.well-known/mcp.json`, timeoutMs, ['tools', 'endpoint', 'mcpServers', 'protocol', 'transports']),
    checkOpenApi(base, timeoutMs),
    checkRobotsAllow(base, timeoutMs),
  ]);

  const flags = {
    has_well_known_x402: !!x402,
    has_agent_card: !!agentCard,
    has_mcp_manifest: !!mcp,
    has_openapi: !!openapi,
    has_robots_txt_allow: !!robotsAllow,
  };
  const score = SURFACES.reduce((acc, k) => acc + (flags[k] ? 1 : 0), 0);
  const result = { ...flags, score, scanned_at: new Date().toISOString() };
  return { agent, base, result, skipped: null };
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadEnvFile(DEFAULT_ENV_PATH);

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from('agents')
    .select('id, handle, display_name, website_url')
    .not('website_url', 'is', null);

  if (args.agentHandle) query = query.ilike('handle', args.agentHandle);
  if (args.limit && !args.agentHandle) query = query.limit(args.limit);

  const { data: agents, error } = await query;
  if (error) throw error;

  console.log(`[bot-fetch-friendliness] scanning ${agents.length} agents (dry-run=${args.dryRun}, concurrency=${args.concurrency}, timeout=${args.timeoutMs}ms)`);

  const scanResults = await runWithConcurrency(agents, args.concurrency, (a) => scanAgent(a, args.timeoutMs));

  const counts = { has_well_known_x402: 0, has_agent_card: 0, has_mcp_manifest: 0, has_openapi: 0, has_robots_txt_allow: 0 };
  let scanned = 0;
  let skipped = 0;

  for (const r of scanResults) {
    if (r.skipped) { skipped++; continue; }
    scanned++;
    for (const k of SURFACES) if (r.result[k]) counts[k]++;
  }

  console.log(`\n[bot-fetch-friendliness] results: scanned=${scanned} skipped=${skipped}`);
  for (const k of SURFACES) {
    const pct = scanned > 0 ? Math.round((counts[k] / scanned) * 100) : 0;
    console.log(`  ${k.padEnd(22)} ${counts[k]}/${scanned} (${pct}%)`);
  }

  if (args.dryRun) {
    console.log('\n[bot-fetch-friendliness] --dry-run: no DB writes');
    // Print top scoring agents for sanity
    const top = scanResults
      .filter(r => r.result)
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 10);
    console.log('\nTop scoring (sample):');
    for (const r of top) {
      console.log(`  ${r.agent.handle.padEnd(30)} score=${r.result.score} ${SURFACES.filter(k => r.result[k]).join(',')}`);
    }
    return;
  }

  let updated = 0;
  for (const r of scanResults) {
    if (r.skipped) continue;
    const { error: upErr } = await supabase
      .from('agents')
      .update({
        bot_fetch_friendliness: r.result,
        bot_fetch_friendliness_score: r.result.score,
      })
      .eq('id', r.agent.id);
    if (upErr) {
      console.error(`[bot-fetch-friendliness] update failed for ${r.agent.handle}: ${upErr.message}`);
    } else {
      updated++;
    }
  }

  console.log(`\n[bot-fetch-friendliness] wrote ${updated} agents`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
