#!/usr/bin/env node
/**
 * sync-erc8004-registrations.mjs
 *
 * Syncs ERC-8004 identity registry matches into the AgentCrush
 * agent_erc8004_registrations table. Read-only external integration —
 * no blockchain writes, no private keys.
 *
 * Default mode: dry-run (no DB writes). Pass --write to upsert.
 *
 * Usage:
 *   node scripts/sync-erc8004-registrations.mjs [options]
 *
 * Options:
 *   --limit N          AgentCrush agents to check (default: 50)
 *   --handle HANDLE    Check a single agent by handle
 *   --write            Upsert confident matches to Supabase
 *                      (requires SUPABASE_SERVICE_ROLE_KEY in env)
 *   --output PATH      Write JSON report to PATH
 *                      (default: ./erc8004-sync-report.json)
 *
 * Confidence thresholds:
 *   stored in DB  : 'medium' (0.5), 'medium-high' (0.75), 'high' (1.0)
 *   report only   : 'low' (0.25) — never written to DB
 *
 * External source: 8004scan.io/api/v1/agents (public, no auth)
 * See: docs/ERC8004_INTEGRATION_EXPLORATION.md
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env.local') })
dotenv.config({ path: resolve(__dirname, '../.env') })

// ── CLI args ──────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2)
let limit = 50
let singleHandle = null
let writeMode = false
let outputPath = resolve(process.cwd(), 'erc8004-sync-report.json')

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--limit' && rawArgs[i + 1]) { limit = parseInt(rawArgs[++i], 10) || 50 }
  else if (rawArgs[i] === '--handle' && rawArgs[i + 1]) { singleHandle = rawArgs[++i] }
  else if (rawArgs[i] === '--write') { writeMode = true }
  else if (rawArgs[i] === '--output' && rawArgs[i + 1]) { outputPath = resolve(process.cwd(), rawArgs[++i]) }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SCAN_BASE = 'https://8004scan.io/api/v1/agents'
const SCAN_PAGE_SIZE = 20
const SCAN_DELAY_MS = 350
const SOURCE = '8004scan'
const MIN_CONFIDENCE_TO_STORE = 0.5  // 'medium' and above

// ── Manual verification allowlist ─────────────────────────────────────────────
//
// Tokens that have been manually verified by AgentCrush as legitimately
// belonging to the named agent. Auto-matcher rules are strict (require
// corroborating evidence beyond name) so name-only matches get filtered out.
// This allowlist lets us keep tokens we've independently confirmed (via
// onchain owner check, team confirmation, or other out-of-band evidence)
// without weakening the auto-matcher.
//
// To add: verify onchain (ownerOf, tokenURI), check that the owner address
// is the project's known wallet or that the metadata explicitly identifies
// the project. Record the verification method.
//
// Tuple: agent_handle | chain_id (eip155:N) | token_id | verified_by
const VERIFIED_MATCHES = [
  {
    agent_handle: 'crewai',
    chain_id: 'eip155:8453',
    registry_address: '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
    token_id: 17997,
    verified_by: 'On-chain check 2026-05-08 (CS#2): token #17997 on Base, tokenURI metadata declares x402_supported: true. Match confidence forced to 1.00 by manual verification.',
  },
  // NOTE: token #9634 ("AgentLab") was previously stored for handle "agentlab"
  // via name-only match. On-chain verification 2026-05-13 showed owner has no
  // Coral/AgentLab affiliation. NOT added here — attribution unconfirmed.
]

// Confidence label → numeric score
const CONFIDENCE_MAP = {
  high:            1.00,
  'medium-high':   0.75,
  medium:          0.50,
  low:             0.25,
}

// chain_id integer → human name
const CHAIN_NAMES = {
  1:     'ethereum',
  8453:  'base',
  56:    'bnb',
  137:   'polygon',
  42161: 'arbitrum',
  10:    'optimism',
  43114: 'avalanche',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function normalizeName(s) {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function nameSimilarity(a, b) {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1.0
  if (na.includes(nb) || nb.includes(na)) {
    return Math.min(na.length, nb.length) / Math.max(na.length, nb.length)
  }
  return 0
}

function parseGitHubUrl(url) {
  if (!url) return { org: null, repo: null }
  const m = url.match(/github\.com\/([^/]+)(?:\/([^/]+))?/)
  if (!m) return { org: null, repo: null }
  return { org: m[1].toLowerCase(), repo: m[2]?.toLowerCase().replace(/\.git$/, '') || null }
}

function parseDomain(url) {
  if (!url) return null
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase() }
  catch { return null }
}

function confidenceScore(label) {
  return CONFIDENCE_MAP[label] ?? 0
}

// ── 8004scan API ──────────────────────────────────────────────────────────────

async function searchERC8004(query) {
  const url = `${SCAN_BASE}?search=${encodeURIComponent(query)}&limit=${SCAN_PAGE_SIZE}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AgentCrush-ERC8004-Sync/1.0 (read-only; no-blockchain-write)',
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

    const handleSim = nameSimilarity(handle, recName)
    const displaySim = nameSimilarity(displayName, recName)
    const bestSim = Math.max(handleSim, displaySim)

    // Exact name match (handle or display name)
    if (normalizeName(handle) === normalizeName(recName) && normalizeName(handle).length >= 4) {
      reasons.push(`exact handle match: "${handle}" = "${recName}"`)
    } else if (normalizeName(displayName) === normalizeName(recName) && normalizeName(displayName).length >= 4) {
      reasons.push(`exact display name match: "${displayName}" = "${recName}"`)
    } else if (bestSim >= 0.85 && normalizeName(recName).length >= 4) {
      const who = handleSim >= displaySim ? handle : displayName
      reasons.push(`name similarity ${(bestSim * 100).toFixed(0)}%: "${who}" ~ "${recName}"`)
    }

    // GitHub org in description (must be the github.com/{org} URL form, not bare org name)
    if (ghOrg && recDesc.includes(`github.com/${ghOrg}`)) {
      reasons.push(`github org "${ghOrg}" found in description`)
    }

    // GitHub repo in description — require the FULL "{org}/{repo}" pattern,
    // not just the bare repo name. "manifest" alone (repo only) would match
    // any description that mentions the word, producing 20+ false positives.
    // Requiring "{org}/{repo}" co-occurrence makes the match specific to
    // the actual repository.
    if (ghOrg && ghRepo && ghRepo.length >= 3 && recDesc.includes(`${ghOrg}/${ghRepo}`)) {
      reasons.push(`github repo "${ghOrg}/${ghRepo}" found in description`)
    }

    // Website domain in description or image URL
    if (websiteDomain && websiteDomain.length >= 5) {
      if (recDesc.includes(websiteDomain)) {
        reasons.push(`website domain "${websiteDomain}" found in description`)
      } else if (recImageUrl.includes(websiteDomain)) {
        reasons.push(`website domain "${websiteDomain}" found in image URL`)
      }
    }

    if (reasons.length === 0) continue

    // Confidence label
    //
    // The 2026-05-13 update: a name match alone (even exact) is NOT enough.
    // The original logic stored token #9634 ("AgentLab") for AgentCrush handle
    // "agentlab" via exact-name-only — and onchain verification showed the
    // owner had no Coral/AgentLab affiliation. Public attribution scandal-class
    // mistake. Fix: require independent corroborating evidence to stand on
    // its own; pure name matches are downgraded to `low` and not stored.
    //
    // Signal types:
    //   - hasExactName       : exact handle/display name match
    //   - hasNameSimilarity  : ≥85% similarity
    //   - hasGitHubMatch     : github.com/{org} or repo name in description
    //   - hasDomainMatch     : website domain in description or image URL
    //
    // Corroboration = github match OR domain match. These are evidence that
    // ties the token to a project's actual public assets, not just a label.

    const hasExactName       = reasons.some((r) => r.startsWith('exact'))
    const hasNameSimilarity  = reasons.some((r) => r.includes('similarity'))
    const hasGitHubMatch     = reasons.some((r) => r.includes('github org') || r.includes('github repo'))
    const hasDomainMatch     = reasons.some((r) => r.includes('website domain'))
    const hasCorroboration   = hasGitHubMatch || hasDomainMatch
    const hasAnyNameSignal   = hasExactName || hasNameSimilarity

    let confidenceLabel
    if (hasAnyNameSignal && hasCorroboration) {
      // Name + (github OR domain) = strong, both signals independent
      confidenceLabel = 'high'
    } else if (hasGitHubMatch && hasDomainMatch) {
      // Both corroborating signals, no name = still strong
      confidenceLabel = 'high'
    } else if (hasCorroboration) {
      // GitHub or domain alone, no name = reasonable
      confidenceLabel = 'medium-high'
    } else {
      // Name-only (exact OR similarity) with no corroboration = not enough
      // to publish as a match. Downgraded from previous medium-high to low.
      confidenceLabel = 'low'
    }

    const chainIdInt = rec.chain_id
    const chainIdStr = `eip155:${chainIdInt}`

    results.push({
      // Report fields
      agent_handle: acAgent.handle,
      agent_name: acAgent.display_name || acAgent.handle,
      match_confidence_label: confidenceLabel,
      match_confidence: confidenceScore(confidenceLabel),
      match_reasons: reasons,
      erc8004_chain: chainIdStr,
      erc8004_registry: rec.contract_address,
      erc8004_agent_id: rec.agent_id,
      erc8004_name: rec.name,
      erc8004_owner: rec.owner_address,
      erc8004_endpoints: rec.supported_protocols || [],
      erc8004_supported_trust: rec.x402_supported ? ['x402'] : [],
      erc8004_x402_supported: rec.x402_supported ?? false,

      // DB row (agent_erc8004_registrations)
      _db_row: {
        agent_id: acAgent.id,
        agent_handle: acAgent.handle,
        chain_id: chainIdStr,
        chain_name: CHAIN_NAMES[chainIdInt] || String(chainIdInt),
        registry_address: (rec.contract_address || '').toLowerCase(),
        token_id: String(rec.token_id),
        agent_uri: null,
        erc8004_name: rec.name,
        owner_address: rec.owner_address,
        controller_address: null,
        endpoints: rec.supported_protocols || [],
        supported_trust: rec.x402_supported ? ['x402'] : [],
        x402_supported: rec.x402_supported ?? false,
        match_confidence: confidenceScore(confidenceLabel),
        match_reasons: reasons,
        source: SOURCE,
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
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
  }

  return results
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function makeReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
  return createClient(url, key)
}

function makeWriteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for --write mode.\n' +
      '  Add it to .env.local and re-run.\n' +
      '  The service role key can be found in your Supabase project settings.'
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function fetchAgents(supabase) {
  if (singleHandle) {
    const { data, error } = await supabase
      .from('agents')
      .select('id, handle, display_name, github_url, website_url, tier')
      .eq('handle', singleHandle)
      .limit(1)
    if (error) throw new Error(`Supabase: ${error.message}`)
    if (!data?.length) throw new Error(`Agent not found: "${singleHandle}"`)
    return data
  }

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

  console.log('\n─── ERC-8004 Registration Sync ─────────────────────────────')
  console.log(`  mode   : ${writeMode ? '⚠️  WRITE (upsert to DB)' : 'dry-run (no DB writes)'}`)
  console.log(`  agents : ${singleHandle ? `single (${singleHandle})` : `batch, limit ${limit}`}`)
  console.log(`  source : ${SCAN_BASE}`)
  console.log(`  output : ${outputPath}`)
  console.log('────────────────────────────────────────────────────────────\n')

  const readClient = makeReadClient()
  let writeClient = null
  if (writeMode) {
    writeClient = makeWriteClient()  // fails fast if key missing
  }

  console.log('Loading AgentCrush agents…')
  const agents = await fetchAgents(readClient)
  console.log(`  → ${agents.length} agents loaded\n`)

  if (agents.length === 0) {
    console.log('No agents to process. Exiting.')
    process.exit(0)
  }

  const allMatches = []
  const toStore = []    // confident matches (>= MIN_CONFIDENCE_TO_STORE)
  const toSkip = []     // low-confidence matches kept in report only
  const errors = []
  let fetchCount = 0
  let upsertCount = 0
  let upsertErrors = 0

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i]
    const pad = agents.length.toString().length
    const indicator = `[${String(i + 1).padStart(pad, ' ')}/${agents.length}]`
    process.stdout.write(`${indicator} ${agent.handle} … `)

    const terms = new Set()
    if (agent.handle) terms.add(agent.handle)
    if (agent.display_name && normalizeName(agent.display_name) !== normalizeName(agent.handle)) {
      terms.add(agent.display_name)
    }

    const candidates = new Map()
    let fetchError = null
    for (const term of terms) {
      try {
        const records = await searchERC8004(term)
        fetchCount++
        for (const r of records) candidates.set(r.id, r)
        await sleep(SCAN_DELAY_MS)
      } catch (err) {
        fetchError = err.message
        errors.push({ handle: agent.handle, query: term, error: err.message })
      }
    }

    const matches = matchAgent(agent, [...candidates.values()])
    allMatches.push(...matches)

    // Promote any match that's on the manual VERIFIED_MATCHES allowlist
    // up to confidence 1.00, regardless of automated confidence.
    for (const m of matches) {
      const verified = VERIFIED_MATCHES.find(
        (v) =>
          v.agent_handle === m.agent_handle &&
          v.chain_id === m.erc8004_chain &&
          String(v.token_id) === String(m._db_row.token_id)
      )
      if (verified) {
        m.match_confidence = 1.0
        m.match_confidence_label = 'high'
        m._db_row.match_confidence = 1.0
        m.match_reasons = [...(m.match_reasons || []), `MANUALLY VERIFIED: ${verified.verified_by}`]
      }
    }

    const confident = matches.filter((m) => m.match_confidence >= MIN_CONFIDENCE_TO_STORE)
    const weak = matches.filter((m) => m.match_confidence < MIN_CONFIDENCE_TO_STORE)
    toStore.push(...confident)
    toSkip.push(...weak)

    if (fetchError) {
      process.stdout.write(`ERROR (${fetchError})\n`)
    } else if (confident.length > 0) {
      const labels = confident.map((m) => `${m.erc8004_name} [${m.match_confidence_label}]`).join(', ')
      console.log(`${confident.length} match(es): ${labels}`)
    } else if (weak.length > 0) {
      console.log(`${weak.length} low-confidence (skipped)`)
    } else {
      console.log('no match')
    }
  }

  // ── DB upsert ──
  if (writeMode && toStore.length > 0) {
    console.log(`\nUpserting ${toStore.length} confident match(es) to agent_erc8004_registrations…`)
    for (const match of toStore) {
      const row = match._db_row
      const { error } = await writeClient
        .from('agent_erc8004_registrations')
        .upsert(row, {
          onConflict: 'agent_id,chain_id,registry_address,token_id',
          ignoreDuplicates: false,
        })
      if (error) {
        console.error(`  ✗ ${match.agent_handle} → ${match.erc8004_name}: ${error.message}`)
        upsertErrors++
      } else {
        console.log(`  ✓ ${match.agent_handle} → ${match.erc8004_name} (${match.erc8004_chain} token ${match._db_row.token_id})`)
        upsertCount++
      }
    }
  } else if (writeMode && toStore.length === 0) {
    console.log('\nNo confident matches to upsert.')
  }

  // ── DB cleanup: full-sync semantics ──
  // The 8004scan reader is canonical. Any row in the DB that wasn't
  // re-confirmed by this run is stale (matcher rules changed, source data
  // changed, or the match no longer holds). Prune it.
  //
  // Pruning rule: delete any row whose (agent_handle, chain_id, token_id)
  // tuple is not present in this run's toStore. This catches:
  //   - Old matches downgraded by stricter rules (e.g. AgentLab name-only)
  //   - False positives from looser previous matcher logic
  //   - Matches whose underlying 8004scan record was removed
  if (writeMode) {
    console.log('\nPruning rows not re-confirmed by this run…')
    const confirmedKeys = new Set(
      toStore.map((m) => `${m.agent_handle}|${m._db_row.chain_id}|${m._db_row.token_id}`)
    )
    const { data: existing, error: selErr } = await writeClient
      .from('agent_erc8004_registrations')
      .select('id, agent_handle, token_id, chain_id, match_confidence')
    if (selErr) {
      console.warn(`  could not query for stale rows: ${selErr.message}`)
    } else if (existing && existing.length > 0) {
      let pruned = 0
      for (const row of existing) {
        const key = `${row.agent_handle}|${row.chain_id}|${row.token_id}`
        if (confirmedKeys.has(key)) continue
        const { error: delErr } = await writeClient
          .from('agent_erc8004_registrations')
          .delete()
          .eq('id', row.id)
        if (delErr) {
          console.warn(`  ✗ failed to delete row id=${row.id}: ${delErr.message}`)
        } else {
          console.log(`  ✓ pruned ${row.agent_handle} → token ${row.token_id} (${row.chain_id}, conf ${row.match_confidence})`)
          pruned++
        }
      }
      if (pruned === 0) console.log('  (none)')
    } else {
      console.log('  (none)')
    }
  }

  // ── Summary ──
  console.log('\n─── Summary ────────────────────────────────────────────────')
  console.log(`  Agents checked         : ${agents.length}`)
  console.log(`  8004scan searches      : ${fetchCount}`)
  console.log(`  Confident matches      : ${toStore.length}`)
  console.log(`  Low-confidence (skipped) : ${toSkip.length}`)
  console.log(`  Errors                 : ${errors.length}`)
  if (writeMode) {
    console.log(`  DB upserts succeeded   : ${upsertCount}`)
    console.log(`  DB upsert errors       : ${upsertErrors}`)
  } else {
    console.log(`  DB writes              : none (dry-run)`)
  }
  console.log('────────────────────────────────────────────────────────────')

  if (toStore.length > 0) {
    console.log('\nConfident matches:')
    for (const m of toStore) {
      const stored = writeMode ? (upsertErrors === 0 ? '✓ stored' : '✗ error') : '(dry-run)'
      console.log(`  ${m.agent_handle} → "${m.erc8004_name}" [${m.match_confidence_label}] ${m.erc8004_chain} token ${m._db_row.token_id} ${stored}`)
      for (const r of m.match_reasons) console.log(`      · ${r}`)
    }
  }

  if (toSkip.length > 0) {
    console.log('\nLow-confidence (report only, not stored):')
    for (const m of toSkip) {
      console.log(`  ${m.agent_handle} → "${m.erc8004_name}" · ${m.match_reasons.join(', ')}`)
    }
  }

  // ── Report ──
  const report = {
    generated_at: startedAt,
    mode: writeMode ? 'write' : 'dry-run',
    source: SCAN_BASE,
    agents_checked: agents.length,
    confident_matches: toStore.length,
    low_confidence_matches: toSkip.length,
    errors: errors.length,
    db_upserts: writeMode ? upsertCount : 0,
    db_upsert_errors: writeMode ? upsertErrors : 0,
    confident: toStore.map((m) => ({
      agent_handle: m.agent_handle,
      agent_name: m.agent_name,
      match_confidence_label: m.match_confidence_label,
      match_confidence: m.match_confidence,
      match_reasons: m.match_reasons,
      erc8004_chain: m.erc8004_chain,
      erc8004_registry: m.erc8004_registry,
      erc8004_agent_id: m.erc8004_agent_id,
      erc8004_agent_uri: null,
      erc8004_name: m.erc8004_name,
      erc8004_owner_or_controller: m.erc8004_owner,
      erc8004_endpoints: m.erc8004_endpoints,
      erc8004_supported_trust: m.erc8004_supported_trust,
      raw_reference: m._db_row.raw_reference,
    })),
    low_confidence: toSkip.map((m) => ({
      agent_handle: m.agent_handle,
      agent_name: m.agent_name,
      match_confidence_label: m.match_confidence_label,
      match_confidence: m.match_confidence,
      match_reasons: m.match_reasons,
      erc8004_name: m.erc8004_name,
      erc8004_chain: m.erc8004_chain,
    })),
    _errors: errors,
  }

  writeFileSync(outputPath, JSON.stringify(report, null, 2))
  console.log(`\nReport written to: ${outputPath}\n`)

  if (!writeMode && toStore.length > 0) {
    console.log('Dry-run complete. To write to DB, run with --write and ensure')
    console.log('SUPABASE_SERVICE_ROLE_KEY is set in .env.local.\n')
    console.log('Migration must be applied first:')
    console.log('  supabase/migrations/20260426_1800_create_agent_erc8004_registrations.sql\n')
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
