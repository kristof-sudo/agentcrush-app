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
        'For paid x402 endpoints (history, trust-summary, verification-status), see /api-docs.',
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
    ],
    paths: {
      '/api/agent-economy/llm-summary': {
        get: {
          tags: ['discovery'],
          summary: 'Market-level summary',
          description: 'Compact, citation-ready summary of the AgentCrush index: indexed counts, evidence-ranked counts, tracked surfaces, all 4 category methodology versions, machine-readable endpoint map.',
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
