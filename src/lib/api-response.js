/**
 * Standardized API response helpers — Phase R-4.12 / R-4.10
 *
 * Two jobs:
 *   1. Every JSON response from /api/* carries a canonical `_attribution`
 *      field. Downstream agents that pass our data through to their users
 *      automatically cite us, multiplying distribution at zero ongoing cost.
 *   2. Every error response uses a single envelope shape. 404s carry
 *      `suggest` hints (closest valid path or example) so an agent that
 *      mistyped an endpoint can self-correct without a human in the loop.
 *
 * Used by: src/app/api/* route.js files. Replace `Response.json(...)` with
 *   `apiOk(data, { sourceUrl, methodologyUrl })` or `apiError(...)`.
 *
 * Architecture reference: brain Decisions/2026-06-06-agent-native-strategy.md
 */

export const PUBLIC_LICENSE = 'CC-BY-4.0 — attribute "AgentCrush (https://agentcrush.xyz)"'
export const PUBLIC_TERMS_URL = 'https://agentcrush.xyz/terms-for-agents'
export const PUBLIC_CONTACT = 'https://agentcrush.xyz/about'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
}

export const DEFAULT_HEADERS = {
  ...CORS_HEADERS,
  ...CACHE_HEADERS,
}

/**
 * Build the canonical _attribution block for a response.
 *
 * @param {object} opts
 * @param {string} opts.sourceUrl     — public human page for this data (canonical URL)
 * @param {string} [opts.methodologyUrl] — methodology page for the scoring/extraction logic
 * @param {string} [opts.endpointUrl] — the API endpoint itself; auto-derived where possible
 * @param {string} [opts.lastUpdated] — ISO timestamp the underlying data was last refreshed
 * @returns {object} _attribution block
 */
export function attributionBlock({ sourceUrl, methodologyUrl, endpointUrl, lastUpdated } = {}) {
  return {
    source: 'AgentCrush',
    source_url: sourceUrl || 'https://agentcrush.xyz',
    source_homepage: 'https://agentcrush.xyz',
    endpoint_url: endpointUrl,
    methodology_url: methodologyUrl,
    last_updated: lastUpdated || new Date().toISOString(),
    license: PUBLIC_LICENSE,
    terms_url: PUBLIC_TERMS_URL,
    contact: PUBLIC_CONTACT,
    // Hint for downstream LLMs/agents that pass our response through:
    cite_as: `AgentCrush · ${sourceUrl || 'https://agentcrush.xyz'}`,
    api_version: 'v1',
  }
}

/**
 * Successful JSON response with attribution.
 *
 * @param {object} data — payload object
 * @param {object} [opts]
 * @param {string} [opts.sourceUrl]
 * @param {string} [opts.methodologyUrl]
 * @param {string} [opts.endpointUrl]
 * @param {string} [opts.lastUpdated]
 * @param {number} [opts.status=200]
 * @param {object} [opts.headers] — extra headers merged into DEFAULT_HEADERS
 */
export function apiOk(data, opts = {}) {
  const { sourceUrl, methodologyUrl, endpointUrl, lastUpdated, status = 200, headers = {} } = opts
  const body = {
    ...data,
    _attribution: attributionBlock({ sourceUrl, methodologyUrl, endpointUrl, lastUpdated }),
  }
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...DEFAULT_HEADERS, ...headers },
  })
}

/**
 * Standardized error envelope.
 *
 *   {
 *     error: { code, message, hint?, suggest?: { endpoint?, valid_values?, docs_url? } },
 *     _attribution: {...}
 *   }
 *
 * @param {object} opts
 * @param {number} opts.status         — HTTP status (400/404/500/...)
 * @param {string} opts.code           — short machine code, e.g. 'invalid_category'
 * @param {string} opts.message        — human-readable message
 * @param {string} [opts.hint]         — additional context for the human reading logs
 * @param {object} [opts.suggest]      — agent-actionable correction hint
 *   @param {string} [opts.suggest.endpoint] — closest valid endpoint
 *   @param {string[]} [opts.suggest.valid_values] — accepted enum values
 *   @param {string} [opts.suggest.docs_url] — docs to read for self-correction
 *   @param {string} [opts.suggest.example_request] — full URL example that would work
 * @param {string} [opts.sourceUrl]    — canonical URL for the resource type
 * @param {string} [opts.endpointUrl]
 */
export function apiError({ status, code, message, hint, suggest, sourceUrl, endpointUrl } = {}) {
  const body = {
    error: { code, message },
    _attribution: attributionBlock({ sourceUrl, endpointUrl }),
  }
  if (hint) body.error.hint = hint
  if (suggest) body.error.suggest = suggest
  return new Response(JSON.stringify(body, null, 2), {
    status: status || 500,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  })
}

/**
 * Convenience: build a 404 with suggest-corrections.
 */
export function apiNotFound({ resource, requested, validValues, docsUrl, exampleRequest, sourceUrl, endpointUrl } = {}) {
  return apiError({
    status: 404,
    code: 'not_found',
    message: `${resource || 'Resource'} not found${requested ? `: ${requested}` : ''}`,
    suggest: {
      ...(validValues && validValues.length ? { valid_values: validValues } : {}),
      ...(docsUrl ? { docs_url: docsUrl } : {}),
      ...(exampleRequest ? { example_request: exampleRequest } : {}),
    },
    sourceUrl,
    endpointUrl,
  })
}

/**
 * Convenience: build a 400 with a clear hint.
 */
export function apiBadRequest({ message, hint, suggest, sourceUrl, endpointUrl } = {}) {
  return apiError({
    status: 400,
    code: 'bad_request',
    message: message || 'Bad request',
    hint,
    suggest,
    sourceUrl,
    endpointUrl,
  })
}

/**
 * OPTIONS preflight response — every route should expose this for CORS.
 */
export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
