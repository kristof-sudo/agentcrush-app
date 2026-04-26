#!/usr/bin/env node
/**
 * ERC-8004 Reader Prototype v1
 *
 * Read-only probe: checks whether AgentCrush agents overlap with ERC-8004
 * registrations, using the 8004scan.io public API (no auth, no API key).
 *
 * This is a local prototype only. It never writes to Supabase and has no
 * on-chain write capability. See docs/ERC8004_INTEGRATION_EXPLORATION.md.
 *
 * Usage:
 *   node scripts/erc8004-reader-prototype.mjs [options]
 *
 * Options:
 *   --limit N          AgentCrush agents to check (default: 50)
 *   --handle HANDLE    Check a single agent by handle
 *   --no-write         Accepted but no-op — script is always read-only
 *   --output PATH      Write JSON report to PATH
 *                      (default: ./erc8004-reader-report.json)
 *
 * Source: https://8004scan.io/api/v1/agents (181k+ registrations, no auth)
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env.local') })
dotenv.config({ path: resolve(__dirname, '../.env') })

// ── CLI args ─────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2)
let limit = 50
let singleHandle = null
let outputPath = resolve(process.cwd(), 'erc8004-reader-report.json')

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--limit' && rawArgs[i + 1]) { limit = parseInt(rawArgs[++i], 10) || 50 }
  else if (rawArgs[i] === '--handle' && rawArgs[i + 1]) { singleHandle = rawArgs[++i] }
  else if (rawArgs[i] === '--no-write') { /* always read-only, flag accepted */ }
  else if (rawArgs[i] === '--output' && rawArgs[i + 1]) { outputPath = resolve(process.cwd(), rawArgs[++i]) }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SCAN_BASE = 'https://8004scan.io/api/v1/agents'
const SCAN_PAGE_SIZE = 20
const SCAN_DELAY_MS = 350   // polite delay between API calls
const SOURCE = '8004scan.io public API (https://8004scan.io/api/v1/agents)'

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function normalizeName(s) {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Returns a 0–1 similarity score between two names.
 * Uses exact match, then substring containment, then 0.
 * Deliberately conservative to avoid false positives at scale.
 */
function nameSimilarity(a, b) {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1.0
  // Proportional containment
  if (na.includes(nb) || nb.includes(na)) {
    return Math.min(na.length, nb.length) / Math.max(na.length, nb.length)
  }
  return 0
}

/**
 * Extract GitHub org and repo from a GitHub URL.
 */
function parseGitHubUrl(url) {
  if (!url) return { org: null, repo: null }
  const m = url.match(/github\.com\/([^/]+)(?:\/([^/]+))?/)
  if (!m) return { org: null, repo: null }
  return { org: m[1].toLowerCase(), repo: m[2]?.toLowerCase().replace(/\.git$/, '') || null }
}

/**
 * Extract the bare hostname from a URL, stripping www.
 */
function parseDomain(url) {
  if (!url) return null
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase() }
  catch { return null }
}

// ── 8004scan API ──────────────────────────────────────────────────────────────

async function searchERC8004(query) {
  const url = `${SCAN_BASE}?search=${encodeURIComponent(query)}&limit=${SCAN_PAGE_SIZE}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AgentCrush-ERC8004-Reader/1.0 (prototype; read-only)',
    },
  })
  if (!res.ok) throw new Error(`8004scan HTTP ${res.status} for query "${query}"`)
  const data = await res.json()
  return data.items || []
}

// ── Matching ──────────────────────────────────────────────────────────────────

function matchAgent(acAgent, erc8004Records) {
  const handle = acAgent.handle?.toLowerCase() || ''
  const displayName = acAgent.display_name || acAgent.handle || ''
  const { org: ghOrg, repo: ghRepo } = parseGitHubUrl(acAgent.github_url)
  const websiteDomain = parseDomain(acAgent.website_url)

  const results = []

  for (const rec of erc8004Records) {
    const recName = rec.name || ''
    const recDesc = (rec.description || '').toLowerCase()
    const recImageUrl = (rec.image_url || '').toLowerCase()
    const reasons = []

    // Priority 1 – exact handle or normalized display-name match (Medium-High)
    const handleSim = nameSimilarity(handle, recName)
    const displaySim = nameSimilarity(displayName, recName)
    const bestSim = Math.max(handleSim, displaySim)

    if (normalizeName(handle) === normalizeName(recName) && normalizeName(handle).length >= 4) {
      reasons.push(`exact handle match: "${handle}" = "${recName}"`)
    } else if (normalizeName(displayName) === normalizeName(recName) && normalizeName(displayName).length >= 4) {
      reasons.push(`exact display name match: "${displayName}" = "${recName}"`)
    } else if (bestSim >= 0.85 && normalizeName(recName).length >= 4) {
      const who = handleSim >= displaySim ? handle : displayName
      reasons.push(`name similarity ${(bestSim * 100).toFixed(0)}%: "${who}" ~ "${recName}"`)
    }

    // Priority 2 – GitHub org match in description (High)
    if (ghOrg && recDesc.includes(`github.com/${ghOrg}`)) {
      reasons.push(`github org "${ghOrg}" found in description`)
    }

    // Priority 3 – GitHub repo match in description (Medium)
    if (ghRepo && ghRepo.length >= 4 && recDesc.includes(ghRepo)) {
      reasons.push(`github repo "${ghRepo}" found in description`)
    }

    // Priority 4 – Website domain match in description or image URL (Medium)
    if (websiteDomain && websiteDomain.length >= 5) {
      if (recDesc.includes(websiteDomain)) {
        reasons.push(`website domain "${websiteDomain}" found in description`)
      } else if (recImageUrl.includes(websiteDomain)) {
        reasons.push(`website domain "${websiteDomain}" found in image URL`)
      }
    }

    if (reasons.length === 0) continue

    // Confidence assignment
    const isHighReason = reasons.some(
      (r) => r.startsWith('exact') || r.includes('github org') || r.includes('website domain')
    )
    const isMediumReason = reasons.some(
      (r) => r.includes('similarity') && bestSim >= 0.85
    )

    let confidence
    if (isHighReason && isMediumReason) confidence = 'high'
    else if (isHighReason) confidence = 'medium-high'
    else if (isMediumReason) confidence = 'medium'
    else confidence = 'low'

    results.push({
      agent_handle: acAgent.handle,
      agent_name: acAgent.display_name || acAgent.handle,
      match_confidence: confidence,
      match_reasons: reasons,
      erc8004_chain: `eip155:${rec.chain_id}`,
      erc8004_registry: rec.contract_address,
      erc8004_agent_id: rec.agent_id,
      erc8004_agent_uri: null,   // agentURI not exposed by 8004scan summary API
      erc8004_name: rec.name,
      erc8004_owner_or_controller: rec.owner_address,
      erc8004_endpoints: rec.supported_protocols || [],
      erc8004_supported_trust: rec.x402_supported ? ['x402'] : [],
      raw_reference: {
        id: rec.id,
        agent_id: rec.agent_id,
        chain_id: rec.chain_id,
        token_id: rec.token_id,
        name: rec.name,
        description: rec.description,
        image_url: rec.image_url,
        is_verified: rec.is_verified,
        supported_protocols: rec.supported_protocols,
        x402_supported: rec.x402_supported,
        total_score: rec.total_score,
        created_at: rec.created_at,
      },
    })
  }

  return results
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function fetchAgents(supabase) {
  if (singleHandle) {
    const { data, error } = await supabase
      .from('agents')
      .select('id, handle, display_name, github_url, website_url, tier')
      .eq('handle', singleHandle)
      .limit(1)
    if (error) throw new Error(`Supabase: ${error.message}`)
    if (!data?.length) throw new Error(`Agent not found in AgentCrush: "${singleHandle}"`)
    return data
  }

  // Prioritize evidence_ranked then indexed
  const { data: ranked, error: e1 } = await supabase
    .from('agents')
    .select('id, handle, display_name, github_url, website_url, tier')
    .eq('tier', 'evidence_ranked')
    .not('handle', 'is', null)
    .order('handle', { ascending: true })
    .limit(limit)
  if (e1) throw new Error(`Supabase (ranked): ${e1.message}`)

  const needed = limit - (ranked?.length || 0)
  let indexed = []
  if (needed > 0) {
    const { data, error: e2 } = await supabase
      .from('agents')
      .select('id, handle, display_name, github_url, website_url, tier')
      .eq('tier', 'indexed')
      .not('handle', 'is', null)
      .order('handle', { ascending: true })
      .limit(needed)
    if (e2) throw new Error(`Supabase (indexed): ${e2.message}`)
    indexed = data || []
  }

  return [...(ranked || []), ...indexed]
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date().toISOString()
  console.log('\n─── ERC-8004 Reader Prototype v1 ───────────────────────────')
  console.log(`  source : ${SOURCE}`)
  console.log(`  mode   : ${singleHandle ? `single handle (${singleHandle})` : `batch (limit ${limit})`}`)
  console.log(`  output : ${outputPath}`)
  console.log('────────────────────────────────────────────────────────────\n')

  // ── Supabase client (read-only anon key) ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set.')
    console.error('       Run from the project root or ensure .env.local is present.')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  // ── Load AgentCrush agents ──
  console.log('Loading AgentCrush agents from Supabase…')
  const agents = await fetchAgents(supabase)
  console.log(`  → ${agents.length} agents loaded`)
  if (agents.length === 0) {
    console.log('No agents found. Exiting.')
    process.exit(0)
  }

  // ── Query 8004scan and match ──
  const allMatches = []
  const errors = []
  let erc8004FetchCount = 0

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i]
    const indicator = `[${String(i + 1).padStart(agents.length.toString().length, ' ')}/${agents.length}]`
    process.stdout.write(`${indicator} ${agent.handle} … `)

    // Build unique search terms
    const terms = new Set()
    if (agent.handle) terms.add(agent.handle)
    if (
      agent.display_name &&
      normalizeName(agent.display_name) !== normalizeName(agent.handle)
    ) {
      terms.add(agent.display_name)
    }

    // Collect 8004scan candidates (deduped by record id)
    const candidates = new Map()
    let fetchError = null
    for (const term of terms) {
      try {
        const records = await searchERC8004(term)
        erc8004FetchCount++
        for (const r of records) candidates.set(r.id, r)
        await sleep(SCAN_DELAY_MS)
      } catch (err) {
        fetchError = err.message
        errors.push({ handle: agent.handle, query: term, error: err.message })
      }
    }

    const matches = matchAgent(agent, [...candidates.values()])
    allMatches.push(...matches)

    const confident = matches.filter((m) => m.match_confidence !== 'low')
    const tag =
      matches.length === 0
        ? 'no match'
        : confident.length > 0
        ? `${confident.length} match(es) [${confident.map((m) => m.match_confidence).join(', ')}]`
        : `${matches.length} low-confidence match(es)`

    if (fetchError) process.stdout.write(`ERROR (${fetchError})\n`)
    else console.log(tag)
  }

  // ── Summarize ──
  const confidentMatches = allMatches.filter((m) => m.match_confidence !== 'low')
  const uncertainMatches = allMatches.filter((m) => m.match_confidence === 'low')

  console.log('\n─── Summary ────────────────────────────────────────────────')
  console.log(`  AgentCrush agents checked : ${agents.length}`)
  console.log(`  8004scan searches made    : ${erc8004FetchCount}`)
  console.log(`  Total ERC-8004 total      : 181,000+ (per API metadata)`)
  console.log(`  Confident matches         : ${confidentMatches.length}`)
  console.log(`  Uncertain/low matches     : ${uncertainMatches.length}`)
  console.log(`  Errors / skips            : ${errors.length}`)
  console.log('────────────────────────────────────────────────────────────')

  if (confidentMatches.length > 0) {
    console.log('\nConfident matches:')
    for (const m of confidentMatches) {
      console.log(
        `  ${m.agent_handle} → "${m.erc8004_name}" [${m.match_confidence}] chain eip155:${m.raw_reference?.chain_id} token ${m.raw_reference?.token_id}`
      )
      for (const r of m.match_reasons) console.log(`      · ${r}`)
    }
  }

  if (uncertainMatches.length > 0) {
    console.log('\nLow-confidence matches (require manual review):')
    for (const m of uncertainMatches) {
      console.log(
        `  ${m.agent_handle} → "${m.erc8004_name}" · ${m.match_reasons.join(', ')}`
      )
    }
  }

  // ── Write report ──
  const report = {
    generated_at: startedAt,
    source: SOURCE,
    agents_checked: agents.length,
    matches_found: confidentMatches.length,
    uncertain_matches: uncertainMatches.length,
    errors: errors.length,
    matches: allMatches,
    _errors: errors,
  }

  writeFileSync(outputPath, JSON.stringify(report, null, 2))
  console.log(`\nReport written to: ${outputPath}\n`)
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
