/**
 * AgentCrush MCP Server v1
 *
 * Implements MCP JSON-RPC 2.0 over HTTP (protocol version 2024-11-05).
 * Read-only. No auth required. No write actions.
 *
 * POST /api/mcp/v1  — JSON-RPC endpoint
 * GET  /api/mcp/v1  — server info + tool manifest
 *
 * v1 changes from v0 (/api/mcp):
 *   - 7 tools (up from 4): adds list_categories, get_category_ranking, get_methodology
 *   - Knows about the 5 category rankings: model_families, tokenized, service, developer, mcp_server
 *   - get_agent_details returns scores across ALL of an agent's relevant categories
 *   - search_agents takes a structured `filters` object (future-proofs for new filters)
 *   - Fuzzy-match suggestions on not-found (LLMs don't hallucinate "doesn't exist")
 *   - Basic per-IP rate limit (60/min, in-memory)
 *   - Cache-Control headers per endpoint
 *   - URL-versioned (/api/mcp/v1) so v2 can ship without breaking v1 consumers
 *
 * Companion: GET /.well-known/mcp.json (manifest for MCP discoverability)
 */

import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── DB ────────────────────────────────────────────────────────────────────────

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['model_family', 'tokenized', 'service', 'developer', 'mcp_server']

const CATEGORY_VIEW = {
  model_family: 'agent_score_model_family_v1',
  tokenized:    'agent_score_tokenized_v1',
  service:      'agent_score_service_v1',
  mcp_server:   'agent_score_mcp_server_v1',
  // 'developer' uses the existing universal rankings (agent_score_v2 view) — handled separately
}

const METHODOLOGY = {
  model_family: {
    name: 'Model Family',
    version: 'v1.4-with-deployment',
    description: 'Scores model families (Hermes, Llama, Mistral, Qwen, DeepSeek, etc.) on adoption, capability, downstream usage, research impact, and agent-economy deployment.',
    signals: [
      { key: 'hf_score',         label: 'HuggingFace',     weight: 30, note: 'Downloads, likes, recency, breadth, top-model — aggregated by author.' },
      { key: 'lmarena_score',    label: 'LMArena',         weight: 25, note: 'Bradley-Terry capability score from chat.lmarena.ai.' },
      { key: 'derivatives_score', label: 'HF Derivatives', weight: 20, note: 'Count of fine-tunes / downstream models per base. LOG10(SUM) × 25.' },
      { key: 'citations_score',  label: 'Paper Citations', weight: 15, note: 'Semantic Scholar citation counts on canonical lab papers.' },
      { key: 'deployment_score', label: 'Deployment',      weight: 10, note: 'Cross-protocol agent-economy mentions across 6 source tables. The moat signal — only AgentCrush has this view unified.' },
    ],
    evidence_ready_rule: '3 of 5 signals AND ≥1 capability signal (derivatives, LMArena, citations, or deployment).',
    limitations: [
      'Citations API (Semantic Scholar) free tier rate-limited; some papers may have 0 cites due to indexing delay.',
      'Deployment signal is volume-based; high counts can indicate generic model adoption rather than specific deployment.',
      'Currently 5 seeded model families (Qwen, Gemini, DeepSeek, Llama, Hermes). View covers all model_family agents but seed set is curated.',
    ],
  },
  tokenized: {
    name: 'Tokenized Agent',
    version: 'v1.1-tokenized-tvl',
    description: 'Scores tokenized AI agents (Virtuals Protocol, etc.) economics-first: market cap, on-chain liquidity, holder distribution, capital locked, plus social.',
    signals: [
      { key: 'market_cap_score',       label: 'Market Cap',         weight: 25, note: 'Log-scaled USD market cap.' },
      { key: 'liquidity_volume_score', label: 'Liquidity + Volume', weight: 20, note: 'On-chain liquidity (65%) + 24h volume (35%). Anti-honeypot: low liquidity = low score regardless of cap.' },
      { key: 'holders_basket_score',   label: 'Holders',            weight: 15, note: 'Holder count (55%) + inverse top-10 concentration (45%). More distributed = higher score.' },
      { key: 'price_momentum_score',   label: 'Price Momentum 24h', weight: 10, note: 'Bounded around neutral 50. Extreme volatility (>±100%) treated as neutral.' },
      { key: 'tvl_score',              label: 'TVL',                weight: 15, note: 'Total value locked in token-related contracts. Capital commitment beyond market cap or liquidity.' },
      { key: 'social_score',           label: 'Social Visibility',  weight: 15, note: 'v1.0 binary curated flag. v1.2 will integrate X follower count + Farcaster engagement.' },
    ],
    evidence_ready_rule: '3 of 6 signals AND ≥1 economic signal (mc, liquidity, holders, or TVL > 0).',
    limitations: [
      'Cross-protocol presence signal is tracked but currently unweighted — agent economy hasn\'t penetrated cross-protocol descriptions enough yet.',
      'Social signal in v1.1 is binary; aixbt is the only socially-flagged agent.',
      'Only covers Virtuals Protocol agents (16 promoted). Other tokenized ecosystems (Daos.fun, Bittensor) not yet integrated.',
    ],
  },
  service: {
    name: 'Service Agent',
    version: 'v1.1-service-forks',
    description: 'Scores service agents (A2A protocol, Agentverse, x402, ERC-8004) on adoption, source quality, activity, protocol breadth, fork engagement, and social.',
    signals: [
      { key: 'adoption_score',         label: 'Adoption',         weight: 25, note: 'GitHub stars (A2A) OR Agentverse interactions (Fetch.ai). Log-scaled. Higher of the two wins.' },
      { key: 'source_quality_score',   label: 'Source Quality',   weight: 20, note: 'A2A signal_strength (0-100) OR Agentverse rating × 20.' },
      { key: 'activity_score',         label: 'Activity Recency', weight: 15, note: 'Age-decay since most recent push or last-seen. Recent = high score.' },
      { key: 'protocol_breadth_score', label: 'Protocol Breadth', weight: 15, note: 'Count of declared protocols/topics × 25.' },
      { key: 'forks_score',            label: 'Forks',            weight: 15, note: 'GitHub forks log-scaled. Forks measure active engagement vs passive starring.' },
      { key: 'social_score',           label: 'Discourse / Social', weight: 10, note: 'v1.2 will integrate X + Farcaster mention volume.' },
    ],
    evidence_ready_rule: '3 of 6 signals AND ≥1 adoption signal (stars > 0, interactions > 0, or forks > 0).',
    limitations: [
      'Currently sources from A2A (28 agents) + Agentverse (0 active — all is_active=false in current scrape).',
      'v1.2 will add ERC-8004 registry (29K agents) and Bazaar x402 endpoints (46K) as additional service surfaces.',
      'Cross-protocol presence tracked in cross_protocol_presence but unweighted in v1.1 composite.',
    ],
  },
  mcp_server: {
    name: 'MCP Server',
    version: 'v1.0-mcp',
    description: 'Scores Model Context Protocol servers on tool count, GitHub stars/forks, registry listings (Smithery, mcp.so, Official, Glama, Continue.dev), and community adoption. The first evidence-based ranking for the MCP ecosystem.',
    signals: [
      { key: 'github_stars',      label: 'GitHub Stars',       weight: 30, note: 'Proxy for developer trust + discoverability. Capped at 50k.' },
      { key: 'tool_count',        label: 'Tool Count',         weight: 25, note: 'Number of tools the MCP server exposes. Capped at 30.' },
      { key: 'registry_listings', label: 'Registry Listings',  weight: 20, note: 'Presence on Smithery, mcp.so, Official registry, Glama, Continue.dev. Each = verified quality signal.' },
      { key: 'github_forks',      label: 'GitHub Forks',       weight: 15, note: 'Actual integrations — fork = someone using it. Capped at 5k.' },
      { key: 'follower_count',    label: 'Community Signal',   weight: 10, note: 'Follower count / social signal. Capped at 100k.' },
    ],
    evidence_ready_rule: 'At least 1 registry listing AND (github_stars > 0 OR tool_count > 0).',
    limitations: [
      'Tool counts are hand-seeded in v1.0; automated tool-count fetching from registry APIs planned for v1.1.',
      'Only covers MCP servers with a public GitHub repo or registry entry.',
      'Seed set of 15 servers (June 2026). New servers added via evidence ingest pipeline.',
    ],
  },
  developer: {
    name: 'Developer Agent',
    version: 'v2.c-public',
    description: 'Scores developer agents (frameworks, tools, operators) on GitHub activity, package usage, dependency adoption, ecosystem links, docs, discourse, and trust signals.',
    signals: [
      { key: 'github_score',        label: 'GitHub Activity',       weight: null, note: 'Stars, commits, contributors, recency.' },
      { key: 'package_usage_score', label: 'Package Usage',         weight: null, note: 'npm/PyPI download volume.' },
      { key: 'dependency_score',    label: 'Dependency Adoption',   weight: null, note: 'Reverse dependencies — how many other projects depend on this.' },
      { key: 'docs_quality_score',  label: 'Docs Quality',          weight: null, note: 'README depth, API docs, examples coverage.' },
      { key: 'ecosystem_score',     label: 'Ecosystem Relationships', weight: null, note: 'Cross-referenced with other indexed agents.' },
      { key: 'hn_score',            label: 'Discourse (HN)',        weight: null, note: 'Hacker News story/comment activity.' },
      { key: 'trust_score',         label: 'Trust Signals',         weight: null, note: 'Registry context, verified claims, identity.' },
    ],
    evidence_ready_rule: 'Multi-signal coverage threshold OR top-100 ranked OR single signal ≥ 90 with ≥ 2 corroborating signals > 50.',
    limitations: [
      'Methodology weights computed dynamically per agent (active_weight_total) rather than fixed.',
      'Universal ranking includes 1,300+ agents; evidence_ready subset is the public-rank list.',
    ],
  },
}

// ── Rate limiter (60 requests / minute per IP) ────────────────────────────────

const RATE_LIMIT = 60
const WINDOW_MS = 60_000
const ipBuckets = new Map() // ip -> { count, windowStart }

function rateLimit(ip) {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    ipBuckets.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: RATE_LIMIT - 1, resetSeconds: 60 }
  }
  if (bucket.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetSeconds: Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000) }
  }
  bucket.count++
  return { allowed: true, remaining: RATE_LIMIT - bucket.count, resetSeconds: Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000) }
}

// Best-effort GC every ~5min
let lastGc = Date.now()
function maybeGc() {
  const now = Date.now()
  if (now - lastGc < 300_000) return
  lastGc = now
  for (const [ip, b] of ipBuckets) if (now - b.windowStart > WINDOW_MS * 2) ipBuckets.delete(ip)
}

function getIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
}

// ── Sanitization ──────────────────────────────────────────────────────────────

function sanitizeHandle(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

function sanitizeSearch(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[%_'"\\]/g, '').trim().slice(0, 100)
}

function clamp(val, def, min, max) {
  const n = Number(val)
  if (!Number.isFinite(n)) return def
  return Math.min(Math.max(Math.floor(n), min), max)
}

function isValidCategory(c) {
  return typeof c === 'string' && VALID_CATEGORIES.includes(c)
}

// ── Fuzzy match for not-found suggestions ─────────────────────────────────────

async function fuzzySuggestHandles(query, limit = 5) {
  if (!query || query.length < 2) return []
  const supabase = db()
  const safe = sanitizeSearch(query)
  const { data } = await supabase
    .from('agents')
    .select('handle, display_name')
    .or(`handle.ilike.%${safe}%,display_name.ilike.%${safe}%`)
    .limit(limit)
  return (data || []).map((r) => ({ handle: r.handle, name: r.display_name || r.handle }))
}

// ── Tool definitions ──────────────────────────────────────────────────────────
// All tools are read-only (no DB writes). annotations.readOnlyHint=true.
// openWorldHint=true on tools that hit live DB state (counts/rankings change).
// Every tool declares outputSchema so MCP clients know the response shape
// without a sample call.

const TOOLS = [
  {
    name: 'search_agents',
    title: 'Search AgentCrush Index',
    description: 'Search AI agents by name or keyword across AgentCrush\'s evidence-ranked index. Returns matching agents with category, tier, and rank info. Use the `filters` object for structured constraints; future versions will add filter keys without breaking the API.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword or partial agent name (1-100 chars).' },
        filters: {
          type: 'object',
          description: 'Optional structured filters.',
          properties: {
            primary_category:      { type: 'string', enum: VALID_CATEGORIES, description: 'Restrict to one of the 4 AgentCrush categories.' },
            evidence_ranked_only:  { type: 'boolean', description: 'Only return evidence-ranked agents. Default false (include indexed too).' },
            limit:                 { type: 'number', description: 'Max results (1-50, default 10).' },
          },
        },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        query:   { type: 'string' },
        filters: { type: 'object' },
        count:   { type: 'integer', description: 'Number of results returned.' },
        agents:  {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              handle:               { type: 'string' },
              name:                 { type: 'string' },
              primary_category:     { type: 'string', enum: VALID_CATEGORIES },
              secondary_categories: { type: 'array', items: { type: 'string' } },
              tier:                 { type: 'string' },
              archetype:            { type: 'string' },
              ecosystem_layer:      { type: 'string' },
              profile_url:          { type: 'string', format: 'uri' },
            },
          },
        },
      },
    },
  },
  {
    name: 'get_agent_details',
    title: 'Get Full Agent Details',
    description: 'Get full details for a specific AI agent including all category scores it qualifies for (model_family, tokenized, service, developer). Returns identity, raw signals, sub-scores, evidence-ready status. Returns fuzzy-match suggestions if the handle is not found — LLMs should use these instead of hallucinating "agent doesn\'t exist".',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { handle: { type: 'string', description: 'Agent handle slug (e.g. "qwen", "crewai", "aixbt"). Alphanumeric/hyphen/underscore, max 64 chars.' } },
      required: ['handle'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        name:   { type: 'string' },
        tier:   { type: 'string' },
        archetype: { type: 'string' },
        primary_category:     { type: 'string', enum: VALID_CATEGORIES },
        secondary_categories: { type: 'array', items: { type: 'string' } },
        verified:             { type: 'boolean' },
        erc8004_registered:   { type: 'boolean' },
        bio:           { type: 'string' },
        profile_url:   { type: 'string', format: 'uri' },
        identity:      { type: 'object', description: 'External identifiers (hf_author, lmarena_keys, paper_ids, virtuals_id, agentverse_id, github_full_name).' },
        scores:        { type: 'object', description: 'Per-category scoring data keyed by category slug.' },
        error:         { type: 'string', description: 'Set when agent not found.' },
        suggestions:   { type: 'array', items: { type: 'object' }, description: 'Fuzzy-match suggestions when not found.' },
      },
    },
  },
  {
    name: 'get_agent_history',
    title: 'Get Agent Rank/Score History',
    description: 'Get rank and score history for an AI agent over the past 1–90 days. Daily snapshots, deduplicated per calendar day. Returns trend summary (rising/falling/flat). Useful for showing how an agent\'s standing has evolved.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'Agent handle slug.' },
        days:   { type: 'number', description: 'Days of history to return (1-90, default 30).' },
      },
      required: ['handle'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        handle:           { type: 'string' },
        name:             { type: 'string' },
        days_requested:   { type: 'integer' },
        snapshot_count:   { type: 'integer' },
        history:          { type: 'array', items: { type: 'object' } },
        summary:          { type: 'object', description: 'rank_start, rank_current, score_start, score_current, trend (rising/falling/flat).' },
      },
    },
  },
  {
    name: 'compare_agents',
    title: 'Compare AI Agents Side-by-Side',
    description: 'Compare 2-5 AI agents side-by-side across all their categories. Returns full per-agent scoring data + comparison context. Use for "X vs Y" queries. AgentCrush does not declare a universal winner — comparison shows evidence differences.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        handles: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 5,
          description: 'Array of 2-5 agent handles to compare.',
        },
      },
      required: ['handles'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        compare_url: { type: 'string', format: 'uri', nullable: true, description: 'Human-readable comparison page URL (2-agent comparisons only).' },
        agents:      { type: 'array', items: { type: 'object', description: 'Full agent details per handle.' } },
      },
    },
  },
  {
    name: 'list_categories',
    title: 'List AgentCrush Categories',
    description: 'List the 4 AgentCrush agent categories with tracked + evidence-ranked counts and current methodology versions. Use this for market-level discovery — what kinds of agents does AgentCrush track and how many of each?',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category:             { type: 'string', enum: VALID_CATEGORIES },
              display_name:         { type: 'string' },
              description:          { type: 'string' },
              methodology_version:  { type: 'string', description: 'e.g. v1.4-with-deployment for model_family.' },
              total_tracked:        { type: 'integer' },
              evidence_ranked:      { type: 'integer' },
              ranking_url:          { type: 'string', format: 'uri' },
            },
          },
        },
      },
    },
  },
  {
    name: 'get_category_ranking',
    title: 'Get Category Ranking',
    description: 'Get the full ranking for one of the 5 categories. Returns agents ordered by composite score with all sub-scores visible. Defaults to evidence-ranked only.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        category:             { type: 'string', enum: VALID_CATEGORIES, description: 'Which of the 4 AgentCrush categories to rank.' },
        evidence_ready_only:  { type: 'boolean', description: 'Filter to evidence-ranked only. Default true.' },
        limit:                { type: 'number', description: 'Max results to return (1-100, default 50).' },
      },
      required: ['category'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        category:             { type: 'string', enum: VALID_CATEGORIES },
        methodology_version:  { type: 'string' },
        count:                { type: 'integer' },
        ranking:              { type: 'array', items: { type: 'object', description: 'Per-agent ranking row with sub-scores.' } },
      },
    },
  },
  {
    name: 'get_methodology',
    title: 'Get Scoring Methodology',
    description: 'Get the scoring methodology for one category — weights, signal sources, formulas, evidence-ready rule, and known limitations. **Methodology travels with data**: call this when explaining HOW a ranking works so the LLM can give a methodology-accurate answer instead of guessing.',
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { category: { type: 'string', enum: VALID_CATEGORIES, description: 'Which category methodology to retrieve.' } },
      required: ['category'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        category:             { type: 'string', enum: VALID_CATEGORIES },
        name:                 { type: 'string' },
        methodology_version:  { type: 'string' },
        description:          { type: 'string' },
        signals:              { type: 'array', items: { type: 'object', description: 'Per-signal weight + formula + note.' } },
        evidence_ready_rule:  { type: 'string' },
        limitations:          { type: 'array', items: { type: 'string' } },
        methodology_url:      { type: 'string', format: 'uri' },
      },
    },
  },
  {
    name: 'get_agent_trust',
    title: 'Get Composite Trust Score',
    description: 'Single-call composite trust score (0-100) + classification (verified / provisional / unverified / low_trust) for delegation decisions. Combines confidence_tier, evidence tier, ERC-8004 verified identity, and risk flags. Mirror of GET /api/agent/{handle}/trust.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: { handle: { type: 'string', description: 'Agent handle slug.' } },
      required: ['handle'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        handle:                    { type: 'string' },
        name:                      { type: 'string' },
        trust_score:               { type: 'number', description: '0-100 composite score.' },
        classification:            { type: 'string', enum: ['verified', 'provisional', 'unverified', 'low_trust'] },
        classification_thresholds: { type: 'object' },
        factors:                   { type: 'object', description: 'confidence_by_category, tier, risk_flags, surfaces.' },
        score_breakdown:           { type: 'array', items: { type: 'object' } },
        delegation_hint:           { type: 'string' },
      },
    },
  },
  {
    name: 'get_top_movers',
    title: 'Get Top Weekly Movers',
    description: 'Returns the top weekly rank movers (up + down) computed from agents.weekly_delta. Useful for surfacing notable changes since last week. Default limit 10 per direction.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'both'], description: 'Movement direction. Default "both".' },
        limit:     { type: 'number', description: 'Max results per direction (1-25, default 10).' },
        category:  { type: 'string', enum: VALID_CATEGORIES, description: 'Restrict to one category.' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string' },
        up:        { type: 'array', items: { type: 'object', properties: { handle: { type: 'string' }, name: { type: 'string' }, weekly_delta: { type: 'number' }, tier: { type: 'string' }, primary_category: { type: 'string' }, profile_url: { type: 'string' } } } },
        down:      { type: 'array', items: { type: 'object' } },
      },
    },
  },
  {
    name: 'get_protocol_adoption',
    title: 'Get Protocol Adoption Counts',
    description: 'How many indexed agents touch each major protocol/surface (ERC-8004 verified, Virtuals tokens, Agentverse, x402/Bazaar, HuggingFace, GitHub). Useful for ecosystem-state questions.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        total_agents:  { type: 'integer' },
        adoption: {
          type: 'object',
          properties: {
            erc_8004_verified:    { type: 'integer' },
            virtuals_token:       { type: 'integer' },
            agentverse_listed:    { type: 'integer' },
            github_mapped:        { type: 'integer' },
            x402_bazaar_endpoint: { type: 'integer' },
          },
        },
        last_updated: { type: 'string' },
      },
    },
  },
  {
    name: 'get_agent_changes',
    title: 'Get Per-Agent Change Feed',
    description: 'Pairwise delta scan over an agent\'s recent snapshots. Reports material changes in score, rank, github_stars, follower_count, identity_type, etc. Mirror of GET /api/agent/{handle}/changes.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'Agent handle slug.' },
        since:  { type: 'string', description: 'ISO date cutoff (default 7 days ago).' },
        limit:  { type: 'number', description: 'Max changes to return (1-100, default 30).' },
      },
      required: ['handle'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        handle:       { type: 'string' },
        since:        { type: 'string' },
        change_count: { type: 'integer' },
        changes:      { type: 'array', items: { type: 'object' } },
      },
    },
  },
  {
    name: 'get_ecosystem_summary',
    title: 'Get Ecosystem Summary',
    description: 'One-call ecosystem-level summary: counts (total, evidence-ranked, archived), category mix (model_family/tokenized/service/developer/mcp_server), category leaders, snapshot volume last 30 days. Mirror of GET /api/trends/summary.',
    annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        summary:       { type: 'string' },
        totals:        { type: 'object' },
        category_mix:  { type: 'object' },
        leaders:       { type: 'object' },
        snapshot_window: { type: 'object' },
      },
    },
  },
]

// ── Tool implementations ──────────────────────────────────────────────────────

async function tool_search_agents(args) {
  const query = sanitizeSearch(args?.query)
  if (!query) return { error: 'query is required', agents: [] }

  const filters = args?.filters || {}
  const limit = clamp(filters.limit, 10, 1, 50)
  const supabase = db()

  let q = supabase
    .from('agents')
    .select('handle, display_name, primary_category, secondary_categories, tier, archetype, ecosystem_layer, visibility_score')
    .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`)

  if (filters.primary_category && isValidCategory(filters.primary_category)) {
    q = q.eq('primary_category', filters.primary_category)
  }
  if (filters.evidence_ranked_only === true) {
    q = q.eq('tier', 'evidence_ranked')
  }

  q = q.order('visibility_score', { ascending: false, nullsFirst: false }).limit(limit)
  const { data, error } = await q
  if (error) return { error: 'Search unavailable', agents: [] }

  return {
    query,
    filters,
    count: data?.length ?? 0,
    agents: (data || []).map((a) => ({
      handle: a.handle,
      name: a.display_name || a.handle,
      primary_category: a.primary_category,
      secondary_categories: a.secondary_categories || [],
      tier: a.tier,
      archetype: a.archetype,
      ecosystem_layer: a.ecosystem_layer,
      profile_url: `https://agentcrush.xyz/agent/${a.handle}`,
    })),
  }
}

async function tool_get_agent_details(args) {
  const handle = sanitizeHandle(args?.handle)
  if (!handle) return { error: 'handle is required' }

  const supabase = db()
  const { data: agent } = await supabase
    .from('agents')
    .select('id, handle, display_name, tier, archetype, bio, tagline, primary_category, secondary_categories, ecosystem_layer, verified, identity_status, hf_author, lmarena_model_keys, semantic_scholar_paper_ids, virtuals_id, agentverse_id, github_full_name, socially_visible')
    .ilike('handle', handle)
    .maybeSingle()

  if (!agent) {
    const suggestions = await fuzzySuggestHandles(handle)
    return {
      error: `Agent not found: ${handle}`,
      suggestions,
      hint: suggestions.length > 0 ? 'Did you mean one of the suggestions? Use search_agents for broader search.' : 'No similar handles found. Try search_agents with a partial keyword.',
    }
  }

  // Collect category scores for all categories this agent participates in
  const categoriesToCheck = new Set([agent.primary_category, ...(agent.secondary_categories || [])])
  const categoryScores = {}

  for (const cat of categoriesToCheck) {
    if (cat === 'developer') continue // handled separately below
    const view = CATEGORY_VIEW[cat]
    if (!view) continue
    const { data } = await supabase.from(view).select('*').eq('agent_id', agent.id).maybeSingle()
    if (data) categoryScores[cat] = data
  }

  // Developer ranking via v2 view
  if (categoriesToCheck.has('developer')) {
    const { data } = await supabase
      .from('agent_score_v2_top50_public_candidate')
      .select('handle, rank_v2_c_public, score_v2_c_public_candidate, active_weight_total, coverage_tier, github_score, package_usage_score, dependency_score, ecosystem_score, docs_quality_score, hn_score, trust_score, evidence_ready_for_public_rank')
      .eq('handle', agent.handle)
      .maybeSingle()
    if (data) categoryScores.developer = data
  }

  return {
    handle: agent.handle,
    name: agent.display_name || agent.handle,
    tier: agent.tier,
    archetype: agent.archetype,
    primary_category: agent.primary_category,
    secondary_categories: agent.secondary_categories || [],
    ecosystem_layer: agent.ecosystem_layer,
    verified: agent.verified || agent.identity_status === 'verified',
    erc8004_registered: agent.identity_status === 'verified',
    bio: agent.bio || agent.tagline || null,
    profile_url: `https://agentcrush.xyz/agent/${agent.handle}`,
    identity: {
      hf_author: agent.hf_author,
      lmarena_model_keys: agent.lmarena_model_keys,
      semantic_scholar_paper_ids: agent.semantic_scholar_paper_ids,
      virtuals_id: agent.virtuals_id,
      agentverse_id: agent.agentverse_id,
      github_full_name: agent.github_full_name,
      socially_visible: agent.socially_visible,
    },
    scores: categoryScores,
  }
}

async function tool_get_agent_history(args) {
  const handle = sanitizeHandle(args?.handle)
  if (!handle) return { error: 'handle is required', history: [] }
  const days = clamp(args?.days, 30, 1, 90)

  const supabase = db()
  const { data: agent } = await supabase
    .from('agents')
    .select('id, handle, display_name, tier')
    .ilike('handle', handle)
    .maybeSingle()

  if (!agent) {
    const suggestions = await fuzzySuggestHandles(handle)
    return { error: `Agent not found: ${handle}`, suggestions, history: [] }
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: rows } = await supabase
    .from('rankings')
    .select('global_rank, score_total, score_visibility, score_reputation, computed_at')
    .eq('agent_id', agent.id)
    .gte('computed_at', since.toISOString())
    .order('computed_at', { ascending: true })

  const byDate = {}
  for (const r of rows ?? []) byDate[r.computed_at.slice(0, 10)] = r
  const history = Object.keys(byDate).sort().map((date) => ({
    date,
    rank: byDate[date].global_rank,
    score_total: byDate[date].score_total ?? 0,
    score_visibility: byDate[date].score_visibility ?? 0,
    score_reputation: byDate[date].score_reputation ?? 0,
  }))

  const s0 = history[0]?.score_total ?? 0
  const sN = history[history.length - 1]?.score_total ?? 0
  let trend = 'flat'
  if (s0 > 0) {
    if (sN > s0 * 1.05) trend = 'rising'
    else if (sN < s0 * 0.95) trend = 'falling'
  }

  return {
    handle: agent.handle,
    name: agent.display_name || agent.handle,
    tier: agent.tier,
    days_requested: days,
    snapshot_count: history.length,
    history,
    summary: {
      rank_start: history[0]?.rank ?? null,
      rank_current: history[history.length - 1]?.rank ?? null,
      score_start: s0,
      score_current: sN,
      trend,
    },
    profile_url: `https://agentcrush.xyz/agent/${agent.handle}`,
  }
}

async function tool_compare_agents(args) {
  const handles = Array.isArray(args?.handles) ? args.handles.map(sanitizeHandle).filter(Boolean) : []
  if (handles.length < 2) return { error: 'Need at least 2 handles to compare' }
  if (handles.length > 5) return { error: 'Max 5 handles' }
  const unique = [...new Set(handles)]
  if (unique.length !== handles.length) return { error: 'Handles must be unique' }

  const details = await Promise.all(handles.map((h) => tool_get_agent_details({ handle: h })))
  return {
    compare_url: handles.length === 2 ? `https://agentcrush.xyz/compare/${handles[0]}-vs-${handles[1]}` : null,
    agents: details,
  }
}

async function tool_list_categories() {
  const supabase = db()
  const out = []
  for (const cat of VALID_CATEGORIES) {
    const meta = METHODOLOGY[cat]
    let totalCount = 0
    let evidenceCount = 0

    if (cat === 'developer') {
      const { count: tot } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('primary_category', cat)
      const { count: er } = await supabase
        .from('agent_score_v2_top50_public_candidate')
        .select('handle', { count: 'exact', head: true })
        .eq('evidence_ready_for_public_rank', true)
      totalCount = tot ?? 0
      evidenceCount = er ?? 0
    } else {
      const view = CATEGORY_VIEW[cat]
      const { count: tot } = await supabase.from(view).select('agent_id', { count: 'exact', head: true })
      const { count: er } = await supabase.from(view).select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
      totalCount = tot ?? 0
      evidenceCount = er ?? 0
    }

    out.push({
      category: cat,
      display_name: meta.name,
      description: meta.description,
      methodology_version: meta.version,
      total_tracked: totalCount,
      evidence_ranked: evidenceCount,
      ranking_url: `https://agentcrush.xyz/rankings/${cat === 'model_family' ? 'model-families' : cat === 'tokenized' ? 'tokenized-agents' : cat === 'service' ? 'service-agents' : cat === 'mcp_server' ? 'mcp-servers' : 'developer'}`,
    })
  }
  return { categories: out }
}

async function tool_get_category_ranking(args) {
  if (!isValidCategory(args?.category)) return { error: 'Invalid category. Use one of: ' + VALID_CATEGORIES.join(', ') }
  const cat = args.category
  const limit = clamp(args?.limit, 50, 1, 100)
  const evidenceReadyOnly = args?.evidence_ready_only !== false // default true

  const supabase = db()

  if (cat === 'developer') {
    let q = supabase
      .from('agent_score_v2_top50_public_candidate')
      .select('handle, rank_v2_c_public, score_v2_c_public_candidate, github_score, package_usage_score, dependency_score, ecosystem_score, docs_quality_score, hn_score, trust_score, coverage_tier, evidence_ready_for_public_rank')
      .order('rank_v2_c_public', { ascending: true })
      .limit(limit)
    if (evidenceReadyOnly) q = q.eq('evidence_ready_for_public_rank', true)
    const { data } = await q
    return {
      category: cat,
      methodology_version: METHODOLOGY[cat].version,
      count: data?.length ?? 0,
      ranking: data || [],
    }
  }

  const view = CATEGORY_VIEW[cat]
  const orderCol = cat === 'model_family' ? 'rank_in_model_family'
    : cat === 'tokenized' ? 'rank_in_tokenized'
    : cat === 'mcp_server' ? 'score'  // mcp_server view orders by score DESC natively; use score for limit
    : 'rank_in_service'
  // mcp_server view is already sorted by score DESC — order ascending=false for score
  const ascending = cat === 'mcp_server' ? false : true
  let q = supabase.from(view).select('*').order(orderCol, { ascending }).limit(limit)
  // mcp_server doesn't have evidence_ready_for_public_rank column
  if (evidenceReadyOnly && cat !== 'mcp_server') q = q.eq('evidence_ready_for_public_rank', true)
  const { data } = await q
  return {
    category: cat,
    methodology_version: METHODOLOGY[cat].version,
    count: data?.length ?? 0,
    ranking: data || [],
  }
}

async function tool_get_methodology(args) {
  if (!isValidCategory(args?.category)) return { error: 'Invalid category. Use one of: ' + VALID_CATEGORIES.join(', ') }
  const meta = METHODOLOGY[args.category]
  return {
    category: args.category,
    name: meta.name,
    methodology_version: meta.version,
    description: meta.description,
    signals: meta.signals,
    evidence_ready_rule: meta.evidence_ready_rule,
    limitations: meta.limitations,
    methodology_url: `https://agentcrush.xyz/rankings/${args.category === 'model_family' ? 'model-families' : args.category === 'tokenized' ? 'tokenized-agents' : args.category === 'service' ? 'service-agents' : args.category === 'mcp_server' ? 'mcp-servers' : 'developer'}`,
  }
}

// ── New tool implementations (R-4.5) ──────────────────────────────────────────

async function tool_get_agent_trust(args) {
  const handle = sanitizeHandle(args?.handle)
  if (!handle) return { error: 'handle is required' }
  // Reuse the public trust endpoint logic by HTTP-fetching ourselves —
  // avoids duplicating the score formula in two places.
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://agentcrush.xyz'
  try {
    const res = await fetch(`${base}/api/agent/${encodeURIComponent(handle)}/trust`)
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      return { error: j?.error?.message || `Trust lookup failed (${res.status})`, suggest: j?.error?.suggest }
    }
    const j = await res.json()
    // Drop _attribution from MCP payload (already in the JSON-RPC envelope)
    delete j._attribution
    return j
  } catch (e) {
    return { error: `Trust lookup failed: ${e.message}` }
  }
}

async function tool_get_top_movers(args) {
  const direction = ['up', 'down', 'both'].includes(args?.direction) ? args.direction : 'both'
  const limit = Math.max(1, Math.min(25, parseInt(args?.limit ?? 10, 10) || 10))
  const category = isValidCategory(args?.category) ? args.category : null
  const supabase = db()
  const sel = 'handle, display_name, weekly_delta, tier, primary_category'

  const fetchSide = async (ascending) => {
    let q = supabase.from('agents').select(sel)
      .not('weekly_delta', 'is', null)
      [ascending ? 'lt' : 'gt']('weekly_delta', 0)
      .order('weekly_delta', { ascending })
      .limit(limit)
    if (category) q = q.eq('primary_category', category)
    const { data } = await q
    return (data || []).map(a => ({
      handle: a.handle, name: a.display_name || a.handle,
      weekly_delta: a.weekly_delta, tier: a.tier, primary_category: a.primary_category,
      profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(a.handle)}`,
    }))
  }

  const result = { direction, limit, category, up: [], down: [] }
  if (direction === 'up' || direction === 'both') result.up = await fetchSide(false)
  if (direction === 'down' || direction === 'both') result.down = await fetchSide(true)
  return result
}

async function tool_get_protocol_adoption() {
  const supabase = db()
  const head = (q) => q.select('id', { count: 'exact', head: true })
  const [
    { count: total },
    { count: erc8004 },
    { count: virtuals },
    { count: agentverse },
    { count: github },
  ] = await Promise.all([
    head(supabase.from('agents')),
    head(supabase.from('agents').eq('identity_status', 'verified')),
    head(supabase.from('agents').not('virtuals_id', 'is', null)),
    head(supabase.from('agents').not('agentverse_id', 'is', null)),
    head(supabase.from('agents').not('github_url', 'is', null)),
  ])
  // x402 endpoints — counted from bazaar_resources table if it exists
  let x402 = null
  try {
    const { count } = await supabase.from('bazaar_resources').select('id', { count: 'exact', head: true })
    x402 = count ?? null
  } catch { /* table may not exist */ }
  return {
    total_agents: total || 0,
    adoption: {
      erc_8004_verified: erc8004 || 0,
      virtuals_token: virtuals || 0,
      agentverse_listed: agentverse || 0,
      github_mapped: github || 0,
      x402_bazaar_endpoint: x402,
    },
    last_updated: new Date().toISOString(),
  }
}

async function tool_get_agent_changes(args) {
  const handle = sanitizeHandle(args?.handle)
  if (!handle) return { error: 'handle is required' }
  const since = args?.since
  const limit = Math.max(1, Math.min(100, parseInt(args?.limit ?? 30, 10) || 30))
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://agentcrush.xyz'
  try {
    const params = new URLSearchParams()
    if (since) params.set('since', since)
    params.set('limit', String(limit))
    const res = await fetch(`${base}/api/agent/${encodeURIComponent(handle)}/changes?${params}`)
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      return { error: j?.error?.message || `Change feed failed (${res.status})`, suggest: j?.error?.suggest }
    }
    const j = await res.json()
    delete j._attribution
    return j
  } catch (e) {
    return { error: `Change feed failed: ${e.message}` }
  }
}

async function tool_get_ecosystem_summary() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://agentcrush.xyz'
  try {
    const res = await fetch(`${base}/api/trends/summary`)
    if (!res.ok) return { error: `Trends summary failed (${res.status})` }
    const j = await res.json()
    delete j._attribution
    return j
  } catch (e) {
    return { error: `Trends summary failed: ${e.message}` }
  }
}

// ── JSON-RPC ──────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Cache TTLs per method (seconds). 0 = no cache.
const CACHE_TTL = {
  'tools/list': 3600,
  'initialize': 3600,
  'ping': 0,
  'tools/call:list_categories':      300,
  'tools/call:get_methodology':     3600,
  'tools/call:get_category_ranking': 300,
  'tools/call:get_agent_history':    180,
  'tools/call:get_agent_details':    120,
  'tools/call:search_agents':         60,
  'tools/call:compare_agents':       120,
}

function buildHeaders(rl, ttl = 0) {
  const h = { ...CORS }
  if (ttl > 0) h['Cache-Control'] = `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${Math.min(ttl, 60)}`
  if (rl) {
    h['X-RateLimit-Limit'] = String(RATE_LIMIT)
    h['X-RateLimit-Remaining'] = String(rl.remaining)
    h['X-RateLimit-Reset'] = String(rl.resetSeconds)
  }
  return h
}

function jsonResult(id, result, rl, ttl = 0) {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, result }, { headers: buildHeaders(rl, ttl) })
}

function jsonError(id, code, message, rl) {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { headers: buildHeaders(rl) })
}

async function dispatchTool(id, params, rl) {
  const { name, arguments: args } = params || {}
  let result
  try {
    switch (name) {
      case 'search_agents':         result = await tool_search_agents(args); break
      case 'get_agent_details':     result = await tool_get_agent_details(args); break
      case 'get_agent_history':     result = await tool_get_agent_history(args); break
      case 'compare_agents':        result = await tool_compare_agents(args); break
      case 'list_categories':       result = await tool_list_categories(); break
      case 'get_category_ranking':  result = await tool_get_category_ranking(args); break
      case 'get_methodology':       result = await tool_get_methodology(args); break
      case 'get_agent_trust':       result = await tool_get_agent_trust(args); break
      case 'get_top_movers':        result = await tool_get_top_movers(args); break
      case 'get_protocol_adoption': result = await tool_get_protocol_adoption(); break
      case 'get_agent_changes':     result = await tool_get_agent_changes(args); break
      case 'get_ecosystem_summary': result = await tool_get_ecosystem_summary(); break
      default:                      return jsonError(id, -32601, `Unknown tool: ${name}`, rl)
    }
  } catch (e) {
    return jsonError(id, -32603, `Tool execution error: ${e.message}`, rl)
  }
  const ttl = CACHE_TTL[`tools/call:${name}`] || 0
  return jsonResult(id, {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    isError: Boolean(result?.error),
  }, rl, ttl)
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(request) {
  const ip = getIp(request)
  maybeGc()
  const rl = rateLimit(ip)
  return Response.json({
    name: 'AgentCrush MCP Server',
    version: '1.0.0',
    api_version: 'v1',
    protocol: 'MCP',
    protocolVersion: '2024-11-05',
    description: 'Read-only AI agent market intelligence. Evidence-ranked across 5 category rankings: model families, tokenized agents, service agents, developer agents, MCP servers. Live deployment, citation, on-chain, and adoption signals.',
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    endpoint: 'POST https://agentcrush.xyz/api/mcp/v1',
    docs: 'https://agentcrush.xyz/developers/mcp',
    rate_limit: `${RATE_LIMIT} requests/minute per IP`,
  }, { headers: buildHeaders(rl, 3600) })
}

export async function POST(request) {
  const ip = getIp(request)
  maybeGc()
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return jsonError(null, -32029, `Rate limit exceeded. ${RATE_LIMIT} requests/minute per IP. Reset in ${rl.resetSeconds}s.`, rl)
  }

  let body
  try { body = await request.json() } catch { return jsonError(null, -32700, 'Parse error: invalid JSON', rl) }
  const { jsonrpc, id, method, params } = body || {}
  if (jsonrpc !== '2.0') return jsonError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"', rl)

  switch (method) {
    case 'initialize':
      return jsonResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: 'AgentCrush', version: '1.0.0', api_version: 'v1' },
      }, rl, CACHE_TTL['initialize'])
    case 'initialized':
    case 'notifications/initialized':
      return jsonResult(id, {}, rl)
    case 'ping':
      return jsonResult(id, {}, rl)
    case 'tools/list':
      return jsonResult(id, { tools: TOOLS }, rl, CACHE_TTL['tools/list'])
    case 'tools/call':
      return dispatchTool(id, params, rl)
    // Standard MCP optional methods. We expose no resources / prompts —
    // returning empty arrays is the correct response (rather than "method
    // not found"). Smithery quality-score expects these.
    case 'resources/list':
      return jsonResult(id, { resources: [] }, rl, 3600)
    case 'resources/templates/list':
      return jsonResult(id, { resourceTemplates: [] }, rl, 3600)
    case 'prompts/list':
      return jsonResult(id, { prompts: [] }, rl, 3600)
    default:
      return jsonError(id, -32601, `Method not found: ${method}`, rl)
  }
}
