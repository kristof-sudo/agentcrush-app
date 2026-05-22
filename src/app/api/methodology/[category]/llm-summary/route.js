/**
 * GET /api/methodology/[category]/llm-summary
 *
 * Free flat JSON: methodology breakdown for one category.
 * No auth, no payment. Cached 1 hour.
 *
 * Mirrors the MCP get_methodology(category) tool for HTTP retrieval clients.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
}

const VALID = ['model_family', 'tokenized', 'service', 'developer']

const METHODOLOGY = {
  model_family: {
    name: 'Model Family',
    version: 'v1.4-with-deployment',
    description: 'Scores AI model families (Qwen, Gemini, DeepSeek, Llama, Hermes, etc.) on adoption, capability, downstream usage, research impact, and cross-protocol agent-economy deployment.',
    signals: [
      { key: 'hf_score',          label: 'HuggingFace',     weight: 30, note: 'Composite of downloads + likes + recency + breadth + top-model, aggregated by HF author.', formula: 'Weighted basket of 5 sub-scores' },
      { key: 'lmarena_score',     label: 'LMArena',         weight: 25, note: 'Bradley-Terry capability score from chat.lmarena.ai.', formula: 'LEAST(100, ROUND((MAX(arena_score) − 700) / 8))' },
      { key: 'derivatives_score', label: 'HF Derivatives',  weight: 20, note: 'Count of fine-tunes / downstream models per base, counted from tags.', formula: 'LEAST(100, ROUND(LOG10(SUM(derivatives_count)) × 25))' },
      { key: 'citations_score',   label: 'Paper Citations', weight: 15, note: 'Semantic Scholar citation counts on canonical lab papers.', formula: 'LEAST(100, ROUND(LOG10(SUM(citation_count)) × 16))' },
      { key: 'deployment_score',  label: 'Deployment',      weight: 10, note: 'Cross-protocol agent-economy mentions across 6 source tables. The moat signal.', formula: 'LEAST(100, ROUND(LOG10(SUM(deployment_count)) × 30))' },
    ],
    evidence_ready_rule: '3 of 5 signals AND ≥1 capability signal (derivatives, LMArena, citations, or deployment).',
    limitations: [
      'Currently 5 seeded model families (Qwen, Gemini, DeepSeek, Llama, Hermes). View covers all model_family agents; seed set is curated.',
      'Citation backfill depends on Semantic Scholar API; some papers may have 0 cites due to S2 indexing delay.',
      'Deployment signal is volume-based; high counts can indicate generic model adoption rather than specific deployment of one variant.',
    ],
  },
  tokenized: {
    name: 'Tokenized Agent',
    version: 'v1.1-tokenized-tvl',
    description: 'Scores tokenized AI agents (Virtuals Protocol) economics-first: market cap, on-chain liquidity, holder distribution, capital locked, plus social.',
    signals: [
      { key: 'market_cap_score',       label: 'Market Cap',         weight: 25, note: 'Log-scaled USD market cap.', formula: 'LEAST(100, ROUND(LOG10(market_cap_usd) × 12))' },
      { key: 'liquidity_volume_score', label: 'Liquidity + Volume', weight: 20, note: 'On-chain liquidity (65%) + 24h volume (35%). Anti-honeypot weighting.', formula: 'liquidity_score × 0.65 + volume_score × 0.35' },
      { key: 'holders_basket_score',   label: 'Holders',            weight: 15, note: 'Holder count (55%) + inverse top-10 concentration (45%).', formula: 'holders_count_score × 0.55 + (100 − top10_pct) × 0.45' },
      { key: 'price_momentum_score',   label: 'Price Momentum 24h', weight: 10, note: 'Bounded around neutral 50. Extreme volatility (>±100%) treated neutral.', formula: 'GREATEST(0, LEAST(100, 50 + price_change_pct))' },
      { key: 'tvl_score',              label: 'TVL',                weight: 15, note: 'Total value locked in token contracts.', formula: 'LEAST(100, ROUND(LOG10(tvl_usd) × 14))' },
      { key: 'social_score',           label: 'Social Visibility',  weight: 15, note: 'v1.1 binary curated flag. v1.2 will integrate X follower count + Farcaster engagement.', formula: 'socially_visible ? 100 : 0' },
    ],
    evidence_ready_rule: '3 of 6 signals AND ≥1 economic signal (mc, liquidity, holders, or TVL > 0).',
    limitations: [
      'Cross-protocol presence signal is tracked but currently unweighted — agent economy has not penetrated cross-protocol descriptions enough yet.',
      'Social signal in v1.1 is binary; aixbt is the only socially-flagged agent.',
      'Only covers Virtuals Protocol agents (16 promoted). Other tokenized ecosystems not yet integrated.',
    ],
  },
  service: {
    name: 'Service Agent',
    version: 'v1.1-service-forks',
    description: 'Scores callable service agents (A2A, Agentverse, x402, ERC-8004) on adoption, source quality, activity, protocol breadth, fork engagement.',
    signals: [
      { key: 'adoption_score',         label: 'Adoption',         weight: 25, note: 'GitHub stars (A2A) OR Agentverse interactions. Log-scaled. Higher of the two wins.', formula: 'GREATEST(stars_log×18, interactions_log×22)' },
      { key: 'source_quality_score',   label: 'Source Quality',   weight: 20, note: 'A2A signal_strength (0-100) OR Agentverse rating × 20.', formula: 'GREATEST(a2a_signal_strength, ROUND(av_rating × 20))' },
      { key: 'activity_score',         label: 'Activity Recency', weight: 15, note: 'Age-decay since most recent push or last-seen.', formula: 'Time-bucketed: 7d→100, 30d→80, 90d→60, 180d→40, 365d→20' },
      { key: 'protocol_breadth_score', label: 'Protocol Breadth', weight: 15, note: 'Count of declared protocols/topics × 25.', formula: 'LEAST(100, COUNT(protocols) × 25)' },
      { key: 'forks_score',            label: 'Forks',            weight: 15, note: 'GitHub forks log-scaled. Forks measure active engagement vs passive starring.', formula: 'LEAST(100, ROUND(LOG10(forks) × 22))' },
      { key: 'social_score',           label: 'Discourse / Social', weight: 10, note: 'v1.2 will integrate X + Farcaster mention volume.', formula: 'currently NULL (placeholder)' },
    ],
    evidence_ready_rule: '3 of 6 signals AND ≥1 adoption signal (stars > 0, interactions > 0, or forks > 0).',
    limitations: [
      'Currently sources from A2A (28 agents) + Agentverse (0 active — all is_active=false in current scrape).',
      'v1.2 will add ERC-8004 registry (29K agents) and Bazaar x402 endpoints (46K) as additional service surfaces.',
    ],
  },
  developer: {
    name: 'Developer Agent',
    version: 'v2.c-public',
    description: 'Scores developer-tool agents (frameworks, runtimes, dev tools) on GitHub activity, package usage, dependency adoption, ecosystem links, docs, discourse, trust signals. Dynamic per-agent weights.',
    signals: [
      { key: 'github_score',        label: 'GitHub Activity',         weight: null, note: 'Stars, commits, contributors, recency.' },
      { key: 'package_usage_score', label: 'Package Usage',           weight: null, note: 'npm/PyPI download volume.' },
      { key: 'dependency_score',    label: 'Dependency Adoption',     weight: null, note: 'Reverse-dependencies — how many other projects depend on this.' },
      { key: 'docs_quality_score',  label: 'Docs Quality',            weight: null, note: 'README depth, API docs, examples coverage.' },
      { key: 'ecosystem_score',     label: 'Ecosystem Relationships', weight: null, note: 'Cross-referenced with other indexed agents.' },
      { key: 'hn_score',            label: 'Discourse (HN)',          weight: null, note: 'Hacker News story / comment activity.' },
      { key: 'trust_score',         label: 'Trust Signals',           weight: null, note: 'Registry context, identity attestation.' },
    ],
    evidence_ready_rule: 'Multi-signal coverage threshold OR top-100 ranked OR single signal ≥ 90 with ≥ 2 corroborating signals > 50.',
    limitations: [
      'Methodology weights computed dynamically per agent (active_weight_total) rather than fixed.',
      'Universal ranking includes 1,300+ agents; evidence_ready subset is the public-rank list.',
    ],
  },
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS })
}

export async function GET(req, { params }) {
  const raw = (await params).category
  const category = typeof raw === 'string' ? raw.toLowerCase() : ''

  if (!VALID.includes(category)) {
    return Response.json({
      error: 'invalid_category',
      message: `Category must be one of: ${VALID.join(', ')}`,
      valid_categories: VALID,
      source_urls: ['https://agentcrush.xyz/methodology'],
    }, { status: 400, headers: HEADERS })
  }

  const m = METHODOLOGY[category]
  return Response.json({
    type: 'methodology_llm_summary',
    category,
    name: m.name,
    methodology_version: m.version,
    description: m.description,
    signals: m.signals,
    evidence_ready_rule: m.evidence_ready_rule,
    limitations: m.limitations,
    methodology_url: `https://agentcrush.xyz/methodology#${category}`,
    ranking_url: category === 'model_family' ? 'https://agentcrush.xyz/rankings/model-families'
              : category === 'tokenized'    ? 'https://agentcrush.xyz/rankings/tokenized-agents'
              : category === 'service'      ? 'https://agentcrush.xyz/rankings/service-agents'
              : 'https://agentcrush.xyz/rankings',
    last_updated: '2026-05-16',
    source_urls: [
      'https://agentcrush.xyz/methodology',
      `https://agentcrush.xyz/methodology#${category}`,
    ],
  }, { headers: HEADERS })
}
