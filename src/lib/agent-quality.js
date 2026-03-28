const ARCHETYPE_MAP = {
  research: 'Researcher',
  researcher: 'Researcher',
  analyst: 'Researcher',
  operator: 'Operator',
  ops: 'Operator',
  builder: 'Builder',
  developer: 'Builder',
  dev: 'Builder',
  creator: 'Creator',
  creative: 'Creator',
  finance: 'Finance',
  financial: 'Finance',
  crypto: 'Crypto',
  corporate: 'Corporate',
  fitness: 'Fitness',
  social: 'Socialite',
  socialite: 'Socialite',
  mystic: 'Mystic',
  lifestyle: 'Lifestyle',
  romantic: 'Romantic',
  caretaker: 'Caretaker',
  rebel: 'Rebel',
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function titleCase(value) {
  return normalizeWhitespace(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function inferArchetypeFromText(agent) {
  const source = `${agent?.archetype || ''} ${agent?.tagline || ''} ${agent?.bio || ''} ${agent?.framework_name || ''} ${agent?.network_name || ''}`.toLowerCase()

  if (/\bresearch|analysis|analy|insight|summary|brief|report\b/.test(source)) return 'Researcher'
  if (/\bbuild|developer|coding|code|prototype|ship|sdk\b/.test(source)) return 'Builder'
  if (/\bops|operator|workflow|automation|coordination|systems\b/.test(source)) return 'Operator'
  if (/\bcontent|creator|media|brand|marketing\b/.test(source)) return 'Creator'
  if (/\bcrypto|defi|token|onchain|wallet|chain\b/.test(source)) return 'Crypto'
  if (/\bfinance|market|trading|invest\b/.test(source)) return 'Finance'
  if (/\bsocial|community|audience|x posts?\b/.test(source)) return 'Socialite'
  if (/\bfitness|health|wellness|coach\b/.test(source)) return 'Fitness'

  return 'Operator'
}

export function normalizeArchetype(value, agent = null) {
  const normalized = normalizeWhitespace(value)
  const lowered = normalized.toLowerCase()

  if (ARCHETYPE_MAP[lowered]) return ARCHETYPE_MAP[lowered]
  if (normalized) return titleCase(normalized)
  if (agent) return inferArchetypeFromText(agent)
  return 'Operator'
}

function looksWeakDescription(value) {
  const text = normalizeWhitespace(value).toLowerCase()

  if (!text) return true
  if (text.length < 12) return true

  return [
    /^ai agent[.!]?$/,
    /^agent[.!]?$/,
    /^ai assistant[.!]?$/,
    /^assistant[.!]?$/,
    /^helpful assistant[.!]?$/,
    /^digital companion[.!]?$/,
    /^coming soon[.!]?$/,
    /^demo[.!]?$/,
    /^test[.!]?$/,
    /^placeholder[.!]?$/,
    /^tbd[.!]?$/,
    /^n\/a[.!]?$/,
    /^no bio available yet[.!]?$/,
    /lorem ipsum/,
  ].some((pattern) => pattern.test(text))
}

function toSentence(value) {
  const cleaned = normalizeWhitespace(value).replace(/\s+[|•-]\s+/g, '. ')
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned
  const trimmed = firstSentence.replace(/\.+$/, '').trim()
  if (!trimmed) return ''
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`
}

// Explicit demo/fake handles — supplement regex matching below
// Add known non-real agents here. Does not affect DB. UI filter only.
const DEMO_HANDLES = new Set([
  'dealvector', 'mayaai', 'agent_demo', 'demoagent', 'testbot',
  'agentx', 'agent001', 'agenttest', 'placeholder_agent',
])

export function isDemoAgent(agent) {
  if (agent?.is_demo === true) return true
  if (agent?.handle && DEMO_HANDLES.has(agent.handle.toLowerCase())) return true

  const source = `${agent?.handle || ''} ${agent?.display_name || ''} ${agent?.tagline || ''} ${agent?.bio || ''}`.toLowerCase()
  return /\b(demo|test|mock|sample|sandbox|placeholder)\b/.test(source)
}

export function getAgentDisplayName(agent) {
  return normalizeWhitespace(agent?.display_name) || normalizeWhitespace(agent?.handle) || 'Unknown agent'
}

export function getAgentArchetype(agent) {
  return normalizeArchetype(agent?.archetype, agent)
}

export function getAgentShortDescription(agent) {
  const bio = toSentence(agent?.bio)
  const tagline = toSentence(agent?.tagline)

  if (bio && !looksWeakDescription(bio)) return bio
  if (tagline && !looksWeakDescription(tagline)) return tagline

  const archetype = getAgentArchetype(agent)

  if (isDemoAgent(agent)) {
    return `Demo ${archetype.toLowerCase()} agent for previews and testing.`
  }

  if (agent?.framework_name) {
    return `${archetype} agent built with ${normalizeWhitespace(agent.framework_name)}.`
  }

  if (agent?.network_name) {
    return `${archetype} agent active in ${normalizeWhitespace(agent.network_name)}.`
  }

  return `${archetype} agent focused on practical tasks.`
}
