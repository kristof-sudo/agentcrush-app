/**
 * POST /api/agent-json/validate         — body is candidate agent.json
 * POST /api/agent-json/validate?url=<u> — fetch URL and validate
 * GET  /api/agent-json/validate?url=<u> — same as POST?url= (convenience)
 *
 * Returns:
 *   {
 *     valid: boolean,
 *     spec_version: "0.1",
 *     errors:   [{ path, message, severity: "error"   }],
 *     warnings: [{ path, message, severity: "warning" }],
 *     score:    0..100   // % of optional recommended fields present
 *     summary:  string
 *   }
 *
 * Hand-rolled validator: avoids adding ajv (~1MB) to the deploy. agent.json
 * v0.1 has ~20 top-level fields — totally tractable to check by hand and
 * faster cold-start on Vercel.
 */

import { apiOk, apiBadRequest, corsPreflight } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ENDPOINT_URL = 'https://agentcrush.xyz/api/agent-json/validate'
const SOURCE_URL = 'https://agentcrush.xyz/agent-json'
const SPEC_URL = 'https://agentcrush.xyz/schemas/agent.v1.json'
const REFERENCE_IMPL = 'https://agentcrush.xyz/.well-known/agent.json'

const REQUIRED = ['agent_json_version', 'name', 'homepage_url', 'description']
const RECOMMENDED = [
  'handle', 'tagline', 'logo_url', 'agent_type', 'capabilities', 'endpoints',
  'standards_implemented', 'identity', 'trust_and_safety', 'contact',
  'registered_with', 'last_updated',
]
const AGENT_TYPES = [
  'model_family', 'tokenized_agent', 'service_agent', 'developer_agent',
  'framework', 'platform', 'infrastructure', 'registry', 'other',
]
const ECOSYSTEM_LAYERS = [
  'L0_settlement', 'L1_wallet', 'L2_routing', 'L3_protocol', 'L4_governance',
  'L5_application', 'data', 'compute', 'model', 'interface',
]
const TRANSPORTS = ['http', 'stdio', 'sse']
const AUTH_KINDS = ['none', 'api_key', 'oauth', 'x402']
const PRICING_KINDS = ['free', 'x402', 'subscription', 'oauth_metered', 'custom']

const URI_RE = /^https?:\/\/[^\s<>]+$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ETH_ADDR_RE = /^0x[a-fA-F0-9]{40}$/

export async function OPTIONS() { return corsPreflight() }

export async function GET(req) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return showHelp()
  return validateFromUrl(url)
}

export async function POST(req) {
  const url = new URL(req.url).searchParams.get('url')
  if (url) return validateFromUrl(url)

  let body
  try {
    body = await req.json()
  } catch (e) {
    return apiBadRequest({
      message: 'Body must be valid JSON.',
      hint: 'POST your candidate agent.json as the request body, or pass ?url=<canonical-url> to fetch.',
      suggest: {
        example_request: `${ENDPOINT_URL}?url=${encodeURIComponent('https://agentcrush.xyz/.well-known/agent.json')}`,
        docs_url: SOURCE_URL,
      },
      sourceUrl: SOURCE_URL,
      endpointUrl: ENDPOINT_URL,
    })
  }
  return runValidation(body, { source: 'request_body' })
}

function showHelp() {
  return apiOk({
    type: 'agent_json_validate_help',
    spec: SPEC_URL,
    reference_implementation: REFERENCE_IMPL,
    docs: SOURCE_URL,
    usage: {
      validate_remote_file: `${ENDPOINT_URL}?url=https://your-domain.com/.well-known/agent.json`,
      validate_inline: `POST ${ENDPOINT_URL} with body = candidate agent.json`,
    },
  }, { sourceUrl: SOURCE_URL, endpointUrl: ENDPOINT_URL, methodologyUrl: SPEC_URL })
}

async function validateFromUrl(rawUrl) {
  if (!URI_RE.test(rawUrl)) {
    return apiBadRequest({
      message: 'url must be an http(s) URL.',
      suggest: { example_request: `${ENDPOINT_URL}?url=${encodeURIComponent('https://agentcrush.xyz/.well-known/agent.json')}` },
      sourceUrl: SOURCE_URL,
      endpointUrl: ENDPOINT_URL,
    })
  }
  try {
    const res = await fetch(rawUrl, { headers: { Accept: 'application/json' }, redirect: 'follow' })
    if (!res.ok) {
      return apiOk({
        type: 'agent_json_validate_result',
        valid: false,
        source: { fetched_url: rawUrl, http_status: res.status },
        errors: [{ path: '$', message: `Fetch failed: HTTP ${res.status}`, severity: 'error' }],
        warnings: [],
        score: 0,
        summary: `Could not fetch ${rawUrl} — HTTP ${res.status}`,
      }, { sourceUrl: SOURCE_URL, endpointUrl: ENDPOINT_URL })
    }
    const body = await res.json()
    return runValidation(body, { source: 'remote_url', url: rawUrl })
  } catch (e) {
    return apiOk({
      type: 'agent_json_validate_result',
      valid: false,
      source: { fetched_url: rawUrl },
      errors: [{ path: '$', message: `Fetch or parse error: ${e.message}`, severity: 'error' }],
      warnings: [],
      score: 0,
      summary: `Could not validate ${rawUrl}: ${e.message}`,
    }, { sourceUrl: SOURCE_URL, endpointUrl: ENDPOINT_URL })
  }
}

function runValidation(body, source) {
  const errors = []
  const warnings = []
  const isObj = body && typeof body === 'object' && !Array.isArray(body)

  if (!isObj) {
    return apiOk({
      type: 'agent_json_validate_result',
      valid: false,
      source,
      errors: [{ path: '$', message: 'Root must be a JSON object.', severity: 'error' }],
      warnings: [],
      score: 0,
      summary: 'Invalid root — expected object.',
    }, { sourceUrl: SOURCE_URL, endpointUrl: ENDPOINT_URL })
  }

  // 1. Required fields
  for (const f of REQUIRED) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      errors.push({ path: `$.${f}`, message: `Required field missing.`, severity: 'error' })
    }
  }

  // 2. Spec version pin
  if (body.agent_json_version && body.agent_json_version !== '0.1') {
    errors.push({ path: '$.agent_json_version', message: `Only "0.1" is currently supported; got "${body.agent_json_version}".`, severity: 'error' })
  }

  // 3. Field types
  const stringFields = ['name', 'description', 'tagline', 'homepage_url', 'logo_url', 'version', 'handle', 'agent_type', 'ecosystem_layer', 'last_updated']
  for (const f of stringFields) {
    if (body[f] !== undefined && typeof body[f] !== 'string') {
      errors.push({ path: `$.${f}`, message: `Expected string, got ${typeof body[f]}.`, severity: 'error' })
    }
  }

  // 4. URIs
  for (const f of ['homepage_url', 'logo_url']) {
    if (typeof body[f] === 'string' && !URI_RE.test(body[f])) {
      errors.push({ path: `$.${f}`, message: 'Must be http(s) URL.', severity: 'error' })
    }
  }

  // 5. Lengths
  if (typeof body.name === 'string' && (body.name.length < 1 || body.name.length > 120)) {
    errors.push({ path: '$.name', message: 'Must be 1–120 chars.', severity: 'error' })
  }
  if (typeof body.description === 'string' && body.description.length < 20) {
    warnings.push({ path: '$.description', message: 'Description shorter than 20 chars — agents reading this benefit from substantive description.', severity: 'warning' })
  }

  // 6. Handle pattern
  if (body.handle !== undefined && !/^[a-zA-Z0-9_-]{1,64}$/.test(body.handle || '')) {
    errors.push({ path: '$.handle', message: 'Must match ^[a-zA-Z0-9_-]{1,64}$.', severity: 'error' })
  }

  // 7. Enums
  if (body.agent_type && !AGENT_TYPES.includes(body.agent_type)) {
    errors.push({ path: '$.agent_type', message: `Must be one of: ${AGENT_TYPES.join(', ')}.`, severity: 'error' })
  }
  if (body.ecosystem_layer && !ECOSYSTEM_LAYERS.includes(body.ecosystem_layer)) {
    warnings.push({ path: '$.ecosystem_layer', message: `Unrecognised layer "${body.ecosystem_layer}". Standard values: ${ECOSYSTEM_LAYERS.join(', ')}.`, severity: 'warning' })
  }

  // 8. Capabilities
  if (body.capabilities !== undefined) {
    if (!Array.isArray(body.capabilities)) {
      errors.push({ path: '$.capabilities', message: 'Must be array.', severity: 'error' })
    } else {
      body.capabilities.forEach((c, i) => {
        if (!c || typeof c !== 'object') {
          errors.push({ path: `$.capabilities[${i}]`, message: 'Must be object.', severity: 'error' })
          return
        }
        if (!c.id || typeof c.id !== 'string') errors.push({ path: `$.capabilities[${i}].id`, message: 'Required string.', severity: 'error' })
        else if (!/^[a-z][a-z0-9_]+$/.test(c.id)) errors.push({ path: `$.capabilities[${i}].id`, message: 'Must match ^[a-z][a-z0-9_]+$.', severity: 'error' })
        if (!c.description) errors.push({ path: `$.capabilities[${i}].description`, message: 'Required.', severity: 'error' })
        if (c.entry_points !== undefined) {
          if (!Array.isArray(c.entry_points)) errors.push({ path: `$.capabilities[${i}].entry_points`, message: 'Must be array.', severity: 'error' })
          else c.entry_points.forEach((u, j) => {
            if (typeof u !== 'string' || !URI_RE.test(u)) errors.push({ path: `$.capabilities[${i}].entry_points[${j}]`, message: 'Must be http(s) URL.', severity: 'error' })
          })
        }
        if (c.pricing && !PRICING_KINDS.includes(c.pricing)) {
          warnings.push({ path: `$.capabilities[${i}].pricing`, message: `Unrecognised pricing "${c.pricing}". Standard values: ${PRICING_KINDS.join(', ')}.`, severity: 'warning' })
        }
      })
    }
  } else {
    warnings.push({ path: '$.capabilities', message: 'No capabilities declared — strongly recommended for agents deciding whether to delegate.', severity: 'warning' })
  }

  // 9. Endpoints — MCP shape check
  if (body.endpoints && typeof body.endpoints === 'object') {
    const ep = body.endpoints
    if (ep.mcp) {
      if (ep.mcp.url && !URI_RE.test(ep.mcp.url)) errors.push({ path: '$.endpoints.mcp.url', message: 'Must be http(s) URL.', severity: 'error' })
      if (ep.mcp.transports && Array.isArray(ep.mcp.transports)) {
        ep.mcp.transports.forEach((t, i) => {
          if (!TRANSPORTS.includes(t)) warnings.push({ path: `$.endpoints.mcp.transports[${i}]`, message: `Unrecognised transport "${t}". Standard: ${TRANSPORTS.join(', ')}.`, severity: 'warning' })
        })
      }
      if (ep.mcp.auth && !AUTH_KINDS.includes(ep.mcp.auth)) {
        warnings.push({ path: '$.endpoints.mcp.auth', message: `Unrecognised auth "${ep.mcp.auth}". Standard: ${AUTH_KINDS.join(', ')}.`, severity: 'warning' })
      }
    }
    for (const k of ['openapi', 'llms_txt', 'llms_full_txt', 'ai_agents_json', 'feedback']) {
      if (ep[k] && typeof ep[k] === 'string' && !URI_RE.test(ep[k])) {
        errors.push({ path: `$.endpoints.${k}`, message: 'Must be http(s) URL.', severity: 'error' })
      }
    }
  }

  // 10. Identity — ERC-8004 check
  if (body.identity?.erc_8004) {
    const e = body.identity.erc_8004
    if (e.registry_address && !ETH_ADDR_RE.test(e.registry_address)) {
      errors.push({ path: '$.identity.erc_8004.registry_address', message: 'Must be a 0x-prefixed 40-hex address.', severity: 'error' })
    }
  }

  // 11. Contact email
  if (body.contact?.email && !EMAIL_RE.test(body.contact.email)) {
    errors.push({ path: '$.contact.email', message: 'Must be a valid email.', severity: 'error' })
  }

  // 12. Score — % of recommended optional fields populated
  let scoreCount = 0
  for (const f of RECOMMENDED) {
    const v = body[f]
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) scoreCount++
  }
  const score = Math.round((scoreCount / RECOMMENDED.length) * 100)

  const valid = errors.length === 0
  let summary
  if (valid && warnings.length === 0) summary = `Valid agent.json v0.1. Recommended-field coverage: ${score}%.`
  else if (valid) summary = `Valid agent.json v0.1 with ${warnings.length} warning(s). Coverage: ${score}%.`
  else summary = `Invalid: ${errors.length} error(s), ${warnings.length} warning(s).`

  return apiOk({
    type: 'agent_json_validate_result',
    spec_version: '0.1',
    spec_url: SPEC_URL,
    source,
    valid,
    errors,
    warnings,
    score,
    coverage_breakdown: {
      required_present: REQUIRED.filter(f => body[f] !== undefined && body[f] !== null && body[f] !== '').length,
      required_total: REQUIRED.length,
      recommended_present: scoreCount,
      recommended_total: RECOMMENDED.length,
    },
    reference_implementation: REFERENCE_IMPL,
    summary,
  }, { sourceUrl: SOURCE_URL, endpointUrl: ENDPOINT_URL, methodologyUrl: SPEC_URL })
}
