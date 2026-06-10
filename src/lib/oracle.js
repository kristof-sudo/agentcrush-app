/**
 * AgentCrush Oracle — signed attestations over index data.
 *
 * An attestation is a canonical-JSON statement about one metric, signed with
 * the AgentCrush oracle key (Ed25519). Consumers verify with the public key
 * published at /.well-known/agentcrush-oracle.json.
 *
 * Strictly a read-out of data the index already produces — no new judgments.
 *
 * Keys: ORACLE_SIGNING_KEY (base64 PKCS8 Ed25519 private key) in env.
 * Generate a pair:
 *   node -e "const {generateKeyPairSync}=require('crypto');const{publicKey,privateKey}=generateKeyPairSync('ed25519');console.log('PRIVATE (env ORACLE_SIGNING_KEY):',privateKey.export({type:'pkcs8',format:'der'}).toString('base64'));console.log('PUBLIC:',publicKey.export({type:'spki',format:'der'}).toString('base64'))"
 * Without the env var the endpoint still works but returns signed:false.
 */

import { createClient } from '@supabase/supabase-js'
import { createPrivateKey, createPublicKey, sign } from 'crypto'

export const ORACLE_VERSION = 'agentcrush.attestation.v1'
export const SUPPORTED_METRICS = ['liveness', 'tier', 'ghost_index']

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Canonical JSON: keys sorted recursively, no whitespace. Sign/verify over this.
export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function signingKey() {
  const b64 = process.env.ORACLE_SIGNING_KEY
  if (!b64) return null
  try {
    return createPrivateKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'pkcs8' })
  } catch {
    return null
  }
}

export function oraclePublicKeyB64() {
  const key = signingKey()
  if (!key) return null
  return createPublicKey(key).export({ type: 'spki', format: 'der' }).toString('base64')
}

export function signStatement(statement) {
  const key = signingKey()
  if (!key) return { signed: false, signature: null, public_key: null }
  const signature = sign(null, Buffer.from(canonicalize(statement), 'utf8'), key).toString('base64')
  return { signed: true, signature, public_key: oraclePublicKeyB64() }
}

async function latestProofOfIndex(supabase) {
  try {
    const { data } = await supabase
      .from('proof_of_index')
      .select('snapshot_date, digest_sha256, tx_hash, chain')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  } catch {
    return null // table not yet migrated — attestations still valid, just unanchored
  }
}

/**
 * Build (but don't sign) the statement for a metric.
 * Returns { status, statement } — status 404/400 carries an error body instead.
 */
export async function buildStatement({ metric, handle }) {
  const supabase = db()
  const observedAt = new Date().toISOString()

  const base = {
    type: ORACLE_VERSION,
    issuer: 'https://agentcrush.xyz',
    metric,
    observed_at: observedAt,
    valid_for_hours: 24,
    methodology_url: 'https://agentcrush.xyz/methodology',
  }

  if (metric === 'ghost_index') {
    const { data: gi } = await supabase
      .from('ghost_index_daily')
      .select('snapshot_date, liveness_score, total_agents, alive_agents')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!gi) return { status: 404, error: 'Ghost Index data unavailable' }
    return {
      status: 200,
      statement: {
        ...base,
        subject: 'agentcrush-index',
        value: {
          liveness_score: Number(gi.liveness_score),
          alive_agents: gi.alive_agents,
          total_agents: gi.total_agents,
          as_of: gi.snapshot_date,
        },
        source: 'https://agentcrush.xyz/api/ghost-index/v1',
      },
    }
  }

  // Per-agent metrics
  if (!handle) return { status: 400, error: `metric '${metric}' requires ?handle=` }
  const { data: agent } = await supabase
    .from('agents')
    .select('handle, display_name, tier, verified, claim_status, activity_status, last_event_at')
    .eq('handle', handle)
    .maybeSingle()
  if (!agent) return { status: 404, error: `Agent '${handle}' not found in AgentCrush index` }

  if (metric === 'liveness') {
    const isAlive = agent.activity_status === 'active' ||
      (agent.last_event_at && new Date(agent.last_event_at) > new Date(Date.now() - 30 * 86400000))
    return {
      status: 200,
      statement: {
        ...base,
        subject: agent.handle,
        value: {
          liveness: isAlive ? 'alive' : 'ghost',
          last_activity: agent.last_event_at ?? null,
          window_days: 30,
        },
        source: `https://agentcrush.xyz/agent/${agent.handle}`,
      },
    }
  }

  if (metric === 'tier') {
    return {
      status: 200,
      statement: {
        ...base,
        subject: agent.handle,
        value: {
          tier: agent.tier,
          verified: agent.verified ?? false,
          claim_status: agent.claim_status,
        },
        source: `https://agentcrush.xyz/agent/${agent.handle}`,
      },
    }
  }

  return { status: 400, error: `Unsupported metric '${metric}'. Supported: ${SUPPORTED_METRICS.join(', ')}` }
}

/** Full attestation: statement + proof-of-index anchor + signature. */
export async function attest({ metric, handle }) {
  const built = await buildStatement({ metric, handle })
  if (built.status !== 200) return built

  const proof = await latestProofOfIndex(db())
  if (proof) {
    built.statement.proof_of_index = {
      snapshot_date: proof.snapshot_date,
      digest_sha256: proof.digest_sha256,
      tx_hash: proof.tx_hash,
      chain: proof.chain,
    }
  }

  const sig = signStatement(built.statement)
  return {
    status: 200,
    body: {
      statement: built.statement,
      signed: sig.signed,
      signature_ed25519_b64: sig.signature,
      public_key_spki_b64: sig.public_key,
      verify: 'Ed25519 over the canonical JSON (recursively key-sorted, no whitespace) of `statement`. Public key also at /.well-known/agentcrush-oracle.json',
      ...(sig.signed ? {} : { note: 'Signing key not yet configured — statement is unsigned but source-verifiable.' }),
    },
  }
}
