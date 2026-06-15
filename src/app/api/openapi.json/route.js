/**
 * GET /api/openapi.json
 *
 * OpenAPI 3.1 spec for all AgentCrush public JSON endpoints + MCP server.
 * Designed for agent toolkits (LangChain, OpenAI SDK, etc.) to auto-generate
 * typed clients. Single canonical machine-readable schema.
 *
 * Static, cached 1 hour at the edge.
 */

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'AgentCrush Public API',
      version: '1.0.0',
      description:
        'AgentCrush is the protocol-neutral market intelligence layer for the AI agent economy. ' +
        'This OpenAPI spec covers the free flat JSON endpoints designed for LLM/agent retrieval. ' +
        'For JSON-RPC MCP access, see /api/mcp/v1 (manifest at /.well-known/mcp.json). ' +
        'Paid endpoints are tagged paid: $0.005-$0.25/call via x402 on Base, or free with a Pro key (X-API-Key header). Pricing: https://agentcrush.xyz/pricing',
      contact: { name: 'AgentCrush', email: 'contact@agentcrush.xyz', url: 'https://agentcrush.xyz' },
      license: { name: 'AgentCrush Terms', url: 'https://agentcrush.xyz/terms' },
    },
    servers: [{ url: 'https://agentcrush.xyz', description: 'Production' }],
    externalDocs: { description: 'Methodology hub', url: 'https://agentcrush.xyz/methodology' },
    tags: [
      { name: 'discovery',   description: 'Market-level and category-level discovery endpoints' },
      { name: 'agent',       description: 'Single-agent details and history' },
      { name: 'methodology', description: 'Scoring methodology, weights, formulas, limitations per category' },
      { name: 'compare',     description: 'Multi-agent comparison' },
      { name: 'feedback',    description: 'Agent-to-AgentCrush feedback channel' },
      { name: 'trust',       description: 'Trust evaluation and liveness (Ghost Index)' },
      { name: 'paid',        description: 'x402-gated endpoints ($0.005-$0.25 per call, USDC on Base) - all free with an AgentCrush Pro key (X-API-Key)' },
      { name: 'oracle',      description: 'Signed attestations + on-chain proof-of-index' },
    ],
    paths: {
      '/api/agent-economy/llm-summary': {
        get: {
          tags: ['discovery'],
          summary: 'Market-level summary',
          description: 'Compact, citation-ready summary of the AgentCrush index: indexed counts, evidence-ranked counts, tracked surfaces, all 5 category methodology versions, machine-readable endpoint map.',
          operationId: 'getAgentEconomySummary',
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentEconomySummary' } } } },
          },
        },
      },
      '/api/rankings/{category}/llm-summary': {
        get: {
          tags: ['discovery'],
          summary: 'Full ranking for one category',
          description: 'Returns agents ordered by composite score with all sub-scores. Mirrors MCP get_category_ranking.',
          operationId: 'getCategoryRanking',
          parameters: [
            { name: 'category', in: 'path', required: true, schema: { type: 'string', enum: ['model_family', 'tokenized', 'service', 'developer'] } },
            { name: 'evidence_ready_only', in: 'query', schema: { type: 'boolean', default: true }, description: 'Filter to evidence-ranked only' },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryRanking' } } } },
            '400': { description: 'Invalid category', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/agent/{handle}/llm-summary': {
        get: {
          tags: ['agent'],
          summary: 'Single-agent details',
          description: 'Full per-agent breakdown with scores across ALL categories the agent qualifies for. Mirrors MCP get_agent_details. Returns fuzzy-match suggestions on 404.',
          operationId: 'getAgentSummary',
          parameters: [
            { name: 'handle', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,64}$' } },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentSummary' } } } },
            '404': { description: 'Not found (returns suggestions)', content: { 'application/json': { schema: { $ref: '#/components/schemas/NotFoundWithSuggestions' } } } },
          },
        },
      },
      '/api/agents/bulk': {
        get: {
          tags: ['agent'],
          summary: 'Bulk agent lookup (up to 50 in one call)',
          description: 'Returns compact details for multiple agents in a single round-trip. Designed for comparison-shopping agents that would otherwise make 50 separate requests.',
          operationId: 'getBulkAgents',
          parameters: [
            { name: 'handles', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated list of agent handles (max 50)', example: 'qwen,gemini,llama,mistral,cohere,hermes' },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/BulkAgents' } } } },
            '400': { description: 'Too many handles or none provided', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/compare/llm-summary': {
        get: {
          tags: ['compare'],
          summary: 'Multi-agent comparison (2-5 agents)',
          description: 'Side-by-side scoring summary. Includes cross-category warning when agents span different primary categories.',
          operationId: 'getCompareSummary',
          parameters: [
            { name: 'agents', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated 2-5 handles', example: 'qwen,gemini,llama' },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/CompareSummary' } } } },
          },
        },
      },
      '/api/methodology/{category}/llm-summary': {
        get: {
          tags: ['methodology'],
          summary: 'Methodology breakdown for one category',
          description: 'Weights, signal sources, formulas, evidence-ready rule, and known limitations. Methodology travels with data — call this when explaining HOW a ranking works.',
          operationId: 'getMethodology',
          parameters: [
            { name: 'category', in: 'path', required: true, schema: { type: 'string', enum: ['model_family', 'tokenized', 'service', 'developer'] } },
          ],
          responses: {
            '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Methodology' } } } },
          },
        },
      },
      '/api/agents/find': {
        get: {
          tags: ['discovery', 'trust'],
          summary: 'Counterparty discovery (free tier: top 3)',
          description: 'Which agents can do X and are safe to pay. Ranked candidates with liveness (30-day Ghost Index rule), evidence tier, verified payment rails, scores, endpoints. Top 3 free + total match count; full list at /api/agents/find/full.',
          operationId: 'findAgents',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Capability keyword, e.g. trading, wallet risk' },
            { name: 'category', in: 'query', schema: { type: 'string', enum: ['model_family', 'tokenized', 'service', 'developer', 'mcp_server'] } },
            { name: 'rails', in: 'query', schema: { type: 'string' }, description: 'Payment rail filter, e.g. x402' },
            { name: 'alive', in: 'query', schema: { type: 'boolean' }, description: 'Only agents alive per the 30-day liveness rule' },
            { name: 'min_tier', in: 'query', schema: { type: 'string', enum: ['evidence_ranked'] } },
          ],
          responses: { '200': { description: 'Top 3 candidates + total_matches + full_results pointer' }, '400': { description: 'Missing q' } },
        },
      },
      '/api/agents/find/full': {
        get: {
          tags: ['discovery', 'paid'],
          summary: 'Counterparty discovery (full: up to 50) - $0.05 x402 or Pro key',
          description: 'Same query surface as /api/agents/find plus limit (1-50). Returns the full ranked candidate list. Payment: $0.05 per call via x402 on Base (the 402 response carries a machine-payable quote), or free with an AgentCrush Pro key.',
          operationId: 'findAgentsFull',
          security: [{ ApiKeyAuth: [] }, {}],
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 25 } },
          ],
          responses: { '200': { description: 'Full ranked list' }, '402': { description: 'x402 payment required (quote in body)' } },
        },
      },
      '/api/trust/evaluate': {
        get: {
          tags: ['trust'],
          summary: 'Trust evaluation (standard depth, free)',
          description: 'Verdict, confidence tier, liveness, risk flags, claim status for one indexed agent. Full depth with raw signal breakdown at /api/trust/evaluate/full ($0.10 x402 or Pro key).',
          operationId: 'trustEvaluate',
          parameters: [{ name: 'handle', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Trust verdict' }, '400': { description: 'Missing handle' } },
        },
      },
      '/api/trust/evaluate/full': {
        get: {
          tags: ['trust', 'paid'],
          summary: 'Trust evaluation (full depth) - $0.10 x402 or Pro key',
          operationId: 'trustEvaluateFull',
          security: [{ ApiKeyAuth: [] }, {}],
          parameters: [{ name: 'handle', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Full verdict + raw signals' }, '402': { description: 'x402 payment required' } },
        },
      },
      '/api/ghost-index/v1': {
        get: {
          tags: ['trust', 'discovery'],
          summary: 'Ghost Index - agent-economy liveness (free)',
          operationId: 'getGhostIndex',
          parameters: [
            { name: 'history', in: 'query', schema: { type: 'integer', maximum: 365, default: 30 } },
            { name: 'live', in: 'query', schema: { type: 'boolean' }, description: 'Compute real-time instead of last stored snapshot' },
          ],
          responses: { '200': { description: 'Liveness score + breakdowns + optional history' } },
        },
      },
      '/api/reliability/v1': {
        get: {
          tags: ['trust', 'discovery'],
          summary: 'Agent Reliability Score - rolling uptime (free)',
          description: 'Per-agent rolling liveness (reliability_30d/90d) forward-collected from the daily Ghost-Index signal, plus currently_alive and days_since_active. Every row carries a coverage flag. Omit handle for the leaderboard.',
          operationId: 'getReliability',
          parameters: [{ name: 'handle', in: 'query', schema: { type: 'string' } }],
          responses: { '200': { description: 'Reliability detail or leaderboard' } },
        },
      },
      '/api/x402/demand/v1': {
        get: {
          tags: ['discovery', 'x402'],
          summary: 'x402 Demand Leaderboard - who actually gets paid (free)',
          description: 'Operators already taking x402 payments, ranked by unique paying wallets, live from the Coinbase CDP Bazaar. Multi-chain (Base, Solana, Polygon, ...). The demand-side map of the agent economy.',
          operationId: 'getX402Demand',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 30, default: 14 } },
            { name: 'top', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
            { name: 'chain', in: 'query', schema: { type: 'string' }, description: 'Filter to a chain, e.g. Solana' },
          ],
          responses: { '200': { description: 'Ranked funded operators + per-chain breakdown' } },
        },
      },
      '/api/public/trust/{agentId}': {
        get: {
          tags: ['trust'],
          summary: 'Public trust query - IETF-compatible external signal (free)',
          description: 'Trust record schema-compatible with draft-sharif-agent-payment-trust-00 (trust.score, level, recommendation, spendLimits). AgentCrush external market-intelligence signal - advisory, not a Trust-Authority authorization. Batch: POST /api/public/trust/batch.',
          operationId: 'getPublicTrust',
          parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' }, description: 'AgentCrush handle' }],
          responses: { '200': { description: 'IETF-shaped trust record' }, '404': { description: 'Not indexed' } },
        },
      },
      '/api/reputation/multiplier/{agentId}': {
        get: {
          tags: ['trust'],
          summary: 'Counterparty price multiplier (free)',
          description: 'Advisory multiplier (1.00 trusted -> 0.50 avoid) plus risk_premium_pct to apply when pricing/routing a transaction with a counterparty, derived from the AgentCrush trust signal. Not financial advice.',
          operationId: 'getReputationMultiplier',
          parameters: [{ name: 'agentId', in: 'path', required: true, schema: { type: 'string' }, description: 'AgentCrush handle' }],
          responses: { '200': { description: 'price_multiplier + risk_premium_pct + recommendation' }, '404': { description: 'Not indexed' } },
        },
      },
      '/api/changes/v1': {
        get: {
          tags: ['discovery'],
          summary: 'What changed today - daily index diff (free)',
          description: 'Rank movers, new agents, tier promotions, deaths, resurrections. RSS at /changes.xml.',
          operationId: 'getChanges',
          parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 7, default: 1 } }],
          responses: { '200': { description: 'Grouped changes + counts' } },
        },
      },
      '/api/oracle/attest': {
        get: {
          tags: ['oracle', 'paid'],
          summary: 'Signed attestation - $0.25 x402 or Pro key',
          description: 'Ed25519-signed, timestamped statement over index data (liveness, tier, ghost_index), referencing the daily proof-of-index digest anchored on Base. Public key: /.well-known/agentcrush-oracle.json. Market-rule templates: /oracle.',
          operationId: 'oracleAttest',
          security: [{ ApiKeyAuth: [] }, {}],
          parameters: [
            { name: 'metric', in: 'query', required: true, schema: { type: 'string', enum: ['liveness', 'tier', 'ghost_index'] } },
            { name: 'handle', in: 'query', schema: { type: 'string' }, description: 'Required for liveness/tier' },
          ],
          responses: { '200': { description: 'Signed attestation' }, '402': { description: 'x402 payment required' } },
        },
      },
      '/api/proof-of-index/v1': {
        get: {
          tags: ['oracle'],
          summary: 'Proof-of-index - daily on-chain digests (free)',
          operationId: 'getProofOfIndex',
          responses: { '200': { description: 'Daily SHA-256 digests + Base tx hashes' } },
        },
      },
      '/api/agent-feedback': {
        post: {
          tags: ['feedback'],
          summary: 'Agent feedback channel',
          description: 'Submit feedback as an AI agent using AgentCrush. Used to flag missing data, unclear methodology, integration friction, or feature requests. Free, no auth. Rate-limited.',
          operationId: 'submitAgentFeedback',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedbackRequest' } } },
          },
          responses: {
            '201': { description: 'Feedback recorded', content: { 'application/json': { schema: { $ref: '#/components/schemas/FeedbackResponse' } } } },
            '400': { description: 'Invalid feedback payload', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'AgentCrush Pro key ($29/mo, https://agentcrush.xyz/pricing). Skips all x402 payment gates. Alternative: pay per call via x402 (USDC on Base) - a 402 response carries the machine-payable quote.',
        },
      },
      schemas: {
        Category: { type: 'string', enum: ['model_family', 'tokenized', 'service', 'developer'] },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            source_urls: { type: 'array', items: { type: 'string' } },
          },
          required: ['error', 'message'],
        },
        NotFoundWithSuggestions: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'agent_not_found' },
            message: { type: 'string' },
            suggestions: { type: 'array', items: { type: 'object', properties: { handle: { type: 'string' }, name: { type: 'string' } } } },
            hint: { type: 'string' },
          },
        },
        AgentEconomySummary: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'agent_economy_llm_summary' },
            url: { type: 'string', format: 'uri' },
            summary: { type: 'string' },
            metrics: { type: 'object', properties: {
              indexed_agents: { type: 'integer' },
              evidence_ranked_total: { type: 'integer' },
              historical_snapshots: { type: 'integer' },
              x402_endpoints_in_bazaar: { type: 'integer' },
              tracked_protocol_surfaces: { type: 'integer' },
            }},
            categories: { type: 'array', items: { type: 'object' } },
            tracked_surfaces: { type: 'array', items: { type: 'string' } },
            machine_readable_endpoints: { type: 'object' },
            positioning: { type: 'string' },
            limitations: { type: 'array', items: { type: 'string' } },
            last_updated: { type: 'string', format: 'date-time' },
            source_urls: { type: 'array', items: { type: 'string', format: 'uri' } },
          },
        },
        CategoryRanking: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'category_ranking_llm_summary' },
            category: { $ref: '#/components/schemas/Category' },
            name: { type: 'string' },
            methodology_version: { type: 'string' },
            methodology_url: { type: 'string', format: 'uri' },
            ranking_page_url: { type: 'string', format: 'uri' },
            count: { type: 'integer' },
            ranking: { type: 'array', items: { type: 'object' } },
            limitations: { type: 'array', items: { type: 'string' } },
            last_updated: { type: 'string', format: 'date-time' },
          },
        },
        AgentSummary: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'agent_llm_summary' },
            handle: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            primary_category: { $ref: '#/components/schemas/Category' },
            secondary_categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
            tier: { type: 'string' },
            archetype: { type: 'string' },
            ecosystem_layer: { type: 'string' },
            verified: { type: 'boolean' },
            erc8004_registered: { type: 'boolean' },
            socially_visible: { type: 'boolean' },
            identity: { type: 'object' },
            scores_by_category: { type: 'object' },
            limitations: { type: 'array', items: { type: 'string' } },
            last_updated: { type: 'string', format: 'date-time' },
            source_urls: { type: 'array', items: { type: 'string', format: 'uri' } },
          },
        },
        BulkAgents: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'agents_bulk_summary' },
            count: { type: 'integer' },
            requested: { type: 'integer' },
            agents: { type: 'array', items: { type: 'object' } },
            not_found: { type: 'array', items: { type: 'string' } },
            limitations: { type: 'array', items: { type: 'string' } },
            last_updated: { type: 'string', format: 'date-time' },
          },
        },
        CompareSummary: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'agent_comparison_llm_summary' },
            agents: { type: 'array', items: { type: 'object' } },
            compare_page_url: { type: 'string', format: 'uri', nullable: true },
            summary: { type: 'string' },
            cross_category_warning: { type: 'string', nullable: true },
            limitations: { type: 'array', items: { type: 'string' } },
            last_updated: { type: 'string', format: 'date-time' },
          },
        },
        Methodology: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'methodology_llm_summary' },
            category: { $ref: '#/components/schemas/Category' },
            name: { type: 'string' },
            methodology_version: { type: 'string' },
            description: { type: 'string' },
            signals: { type: 'array', items: { type: 'object' } },
            evidence_ready_rule: { type: 'string' },
            limitations: { type: 'array', items: { type: 'string' } },
          },
        },
        FeedbackRequest: {
          type: 'object',
          required: ['feedback_type', 'message'],
          properties: {
            feedback_type: { type: 'string', enum: ['missing_data', 'wrong_data', 'methodology_question', 'integration_friction', 'feature_request', 'other'], description: 'Category of feedback' },
            message: { type: 'string', maxLength: 2000, description: 'The actual feedback text' },
            agent_handle: { type: 'string', description: 'Handle of the agent the feedback is about (if applicable)' },
            category: { $ref: '#/components/schemas/Category' },
            query_attempted: { type: 'string', description: 'The query / question that triggered the feedback' },
            client_identifier: { type: 'string', description: 'Optional self-identifier — bot name, MCP client, etc. Used to deduplicate.' },
            contact: { type: 'string', description: 'Optional contact (email or handle) if reply welcomed' },
          },
        },
        FeedbackResponse: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            feedback_id: { type: 'string', format: 'uuid' },
            message: { type: 'string' },
          },
        },
      },
    },
  }

  return Response.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
    },
  })
}
