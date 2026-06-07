/**
 * AgentCrush API client — thin fetch wrapper over agentcrush.xyz public endpoints.
 * Can be used as a library: import { getAgent, getTrust, ... } from 'agentcrush'
 */

const BASE = 'https://agentcrush.xyz';

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'agentcrush-cli/0.1.0 (npmjs.com/package/agentcrush)',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`agentcrush API ${res.status} at ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** Full LLM-optimised agent summary */
export async function getAgent(handle) {
  const h = normalizeHandle(handle);
  return get(`/api/agent/${h}/llm-summary`);
}

/** Composite trust score (0–100) with classification and evidence breakdown */
export async function getTrust(handle) {
  const h = normalizeHandle(handle);
  return get(`/api/agent/${h}/trust`);
}

/** Change feed — material changes across snapshots */
export async function getChanges(handle, { limit = 10 } = {}) {
  const h = normalizeHandle(handle);
  return get(`/api/agent/${h}/changes?limit=${limit}`);
}

/** Badge URL (not JSON — returns badge metadata including the SVG URL) */
export function getBadgeUrl(handle, { style = 'rank' } = {}) {
  const h = normalizeHandle(handle);
  return `${BASE}/api/badge/${h}?style=${style}`;
}

/** Ecosystem trends summary */
export async function getTrends() {
  return get('/api/trends/summary');
}

/** Top movers (weekly) */
export async function getTopMovers({ limit = 10, direction = 'up' } = {}) {
  return get(`/api/trends/summary`).then(d => {
    const movers = direction === 'up' ? (d.top_movers_up || []) : (d.top_movers_down || []);
    return movers.slice(0, limit);
  });
}

/** Ecosystem LLM summary — the full /api/agent-economy/llm-summary */
export async function getEcosystemSummary() {
  return get('/api/agent-economy/llm-summary');
}

/** Protocol adoption stats */
export async function getProtocolAdoption() {
  return get('/api/protocol-adoption/summary');
}

/** Search agents via MCP tool interface */
export async function searchAgents(query, { limit = 10 } = {}) {
  const res = await fetch(`${BASE}/api/mcp/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'agentcrush-cli/0.1.0',
    },
    body: JSON.stringify({
      method: 'tools/call',
      params: {
        name: 'search_agents',
        arguments: { query, limit },
      },
    }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  return json?.result?.content?.[0]?.text
    ? JSON.parse(json.result.content[0].text)
    : json;
}

/** List top-ranked agents via MCP */
export async function getTopAgents({ limit = 20, category } = {}) {
  const args = { limit };
  if (category) args.category = category;
  const res = await fetch(`${BASE}/api/mcp/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'agentcrush-cli/0.1.0',
    },
    body: JSON.stringify({
      method: 'tools/call',
      params: {
        name: 'get_top_agents',
        arguments: args,
      },
    }),
  });
  if (!res.ok) throw new Error(`Top agents failed: ${res.status}`);
  const json = await res.json();
  return json?.result?.content?.[0]?.text
    ? JSON.parse(json.result.content[0].text)
    : json;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function normalizeHandle(handle) {
  return String(handle).replace(/^@/, '').toLowerCase().trim();
}
