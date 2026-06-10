/**
 * GET /.well-known/agentcrush-oracle.json
 *
 * Oracle discovery document: spec, supported metrics, and the Ed25519 public
 * key used to verify attestations from /api/oracle/attest.
 */

import { oraclePublicKeyB64, ORACLE_VERSION, SUPPORTED_METRICS } from '@/lib/oracle'

export const runtime = 'nodejs'

export async function GET() {
  const pub = oraclePublicKeyB64()
  return Response.json(
    {
      type: ORACLE_VERSION,
      issuer: 'https://agentcrush.xyz',
      endpoint: 'https://agentcrush.xyz/api/oracle/attest',
      price: '$0.25 per attestation via x402 (eip155:8453), or included with a Pro API key',
      metrics: SUPPORTED_METRICS,
      public_key_spki_b64: pub,
      key_status: pub ? 'active' : 'pending',
      signature_scheme: 'Ed25519 over canonical JSON (recursively key-sorted, no whitespace) of the statement object',
      proof_of_index: 'Attestations reference the latest on-chain snapshot digest when available',
      methodology: 'https://agentcrush.xyz/methodology',
    },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } }
  )
}
