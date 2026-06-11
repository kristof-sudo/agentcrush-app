/**
 * /api/a2a/v1 — minimal A2A (Agent2Agent protocol) endpoint.
 *
 * JSON-RPC 2.0 over HTTP. Supports message/send with immediate (synchronous)
 * task completion — AgentCrush is a data oracle, so every request resolves in
 * one shot: no streaming, no push notifications, no long-running tasks.
 * Declared accordingly in /.well-known/agent-card.json.
 *
 * Free tier mirrors the public endpoints. Paid depth stays on the x402 REST
 * rails (the card's skill descriptions carry the pricing pointers).
 *
 * GET returns the agent card (convenience mirror of /.well-known/agent-card.json).
 */

import { findAgents } from '@/lib/agent-find'
import { trackHit } from '@/lib/telemetry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function rpcError(id, code, message) {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { headers: CORS })
}

function uuid() {
  return crypto.randomUUID()
}

const HELP_TEXT = [
  'AgentCrush A2A endpoint. Send a plain-text message:',
  '  "find <capability>"            — top 3 payable counterparty agents (liveness, trust tier, rails)',
  '  "trust <handle>"               — trust summary for one indexed agent',
  '  "ghost index"                  — current agent-economy liveness score',
  'Paid depth (x402 on Base, no account): full discovery list $0.05 at /api/agents/find/full,',
  'signed attestations $0.25 at /api/oracle/attest. Docs: https://agentcrush.xyz/developers',
].join('\n')

async function freeJson(path) {
  const res = await fetch(`https://agentcrush.xyz${path}`, { headers: { 'user-agent': 'agentcrush-a2a-internal' } })
  return res.json()
}

async function answer(text) {
  const t = (text || '').trim()
  const lower = t.toLowerCase()

  if (lower.startsWith('find ')) {
    const result = await findAgents({ q: t.slice(5), limit: 3 })
    return { name: 'counterparty-shortlist', json: result }
  }
  if (lower.startsWith('trust ')) {
    const handle = t.slice(6).trim().split(/\s+/)[0]
    const json = await freeJson(`/api/trust/evaluate?handle=${encodeURIComponent(handle)}`)
    return { name: 'trust-evaluation', json }
  }
  if (lower.includes('ghost')) {
    const json = await freeJson('/api/ghost-index/v1')
    return { name: 'ghost-index', json }
  }
  return { name: 'help', json: { help: HELP_TEXT } }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET() {
  const card = await import('../../../../../public/.well-known/agent-card.json')
  return Response.json(card.default, { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600' } })
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error: invalid JSON')
  }
  const { jsonrpc, id, method, params } = body || {}
  if (jsonrpc !== '2.0') return rpcError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"')

  switch (method) {
    case 'message/send': {
      const parts = params?.message?.parts || []
      const text = parts.filter((p) => p?.kind === 'text' || p?.type === 'text').map((p) => p.text).join('\n')
      trackHit('/api/a2a/v1#message/send', req, 'free_200')

      let artifact
      try {
        artifact = await answer(text)
      } catch (e) {
        return rpcError(id, -32603, `Internal error: ${e.message}`)
      }

      const now = new Date().toISOString()
      const task = {
        id: uuid(),
        contextId: params?.message?.contextId || uuid(),
        kind: 'task',
        status: { state: 'completed', timestamp: now },
        artifacts: [
          {
            artifactId: uuid(),
            name: artifact.name,
            parts: [{ kind: 'text', text: JSON.stringify(artifact.json, null, 2) }],
          },
        ],
        history: [params?.message].filter(Boolean),
        metadata: {
          issuer: 'https://agentcrush.xyz',
          methodology_url: 'https://agentcrush.xyz/methodology',
          paid_depth: 'x402 on Base — see /.well-known/x402',
        },
      }
      return Response.json({ jsonrpc: '2.0', id, result: task }, { headers: CORS })
    }

    case 'tasks/get':
      // All tasks complete synchronously inside message/send; nothing is stored.
      return rpcError(id, -32001, 'Task not found: tasks complete synchronously in message/send and are not persisted')

    case 'message/stream':
    case 'tasks/resubscribe':
      return rpcError(id, -32004, 'Streaming is not supported (capabilities.streaming = false)')

    case 'tasks/cancel':
      return rpcError(id, -32002, 'Tasks complete synchronously and cannot be canceled')

    default:
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}
