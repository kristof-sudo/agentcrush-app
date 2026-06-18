#!/usr/bin/env node
/**
 * github-liveness-refresh.mjs — populate agents.github_pushed_at + github_stars_live.
 *
 * For every agent with a github_url, fetch the repo's real pushed_at + stargazers
 * from GitHub and store them, so the Ghost Check / Ghost Index read fresh, true
 * liveness without a per-request GitHub call. Uses GITHUB_TOKEN (5000 req/hr).
 *
 * Scheduling (VPS systemd timer, daily ~03:00 UTC):
 *   ops/systemd/agentcrush-github-liveness-refresh.{service,timer}
 *
 *   node runtime/github-liveness-refresh.mjs --dry-run [--max N]
 *   node runtime/github-liveness-refresh.mjs --write   [--max N]
 *
 * Requires migration 20260617_0300_agent_github_liveness.sql. Idempotent.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const WRITE = process.argv.includes('--write')
const maxI = process.argv.indexOf('--max')
const MAX = maxI !== -1 ? parseInt(process.argv[maxI + 1], 10) : Infinity

for (const p of ['/opt/agentcrush/fetchers/.env', '/opt/agentcrush/scanner/.env', '.env.local', '.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}
if (!WRITE && !process.argv.includes('--dry-run')) { console.error('Pass --dry-run or --write'); process.exit(1) }

const db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
if (!token) console.warn('[gh-liveness] WARNING: no GITHUB_TOKEN — limited to 60 req/hr')

const repoOf = (u) => { const m = String(u || '').match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i); return m ? `${m[1]}/${m[2].replace(/\.git$/, '')}` : null }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchRepo(repo) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'AgentCrush', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      if (r.status === 403 && r.headers.get('x-ratelimit-remaining') === '0') {
        const reset = Number(r.headers.get('x-ratelimit-reset')) * 1000
        const wait = Math.min(Math.max(reset - Date.now(), 1000), 90000)
        console.log(`[gh-liveness] rate-limited, sleeping ${Math.round(wait / 1000)}s`); await sleep(wait); continue
      }
      if (!r.ok) return { ok: false, status: r.status }
      const j = await r.json()
      return { ok: true, pushed_at: j.pushed_at, stars: j.stargazers_count }
    } catch (e) { if (t === 2) return { ok: false, err: String(e?.message || e) }; await sleep(1000) }
  }
  return { ok: false }
}

// paginate agents with a github_url
let from = 0; const agents = []
for (;;) {
  const { data, error } = await db.from('agents').select('id, handle, github_url').not('github_url', 'is', null).range(from, from + 999)
  if (error) { console.error('[gh-liveness] load error:', error.message); process.exit(1) }
  agents.push(...data); if (data.length < 1000) break; from += 1000
}
console.log(`[gh-liveness] ${agents.length} agents with github_url (max ${MAX}, mode ${WRITE ? 'WRITE' : 'DRY'})`)

let ok = 0, gone = 0, wrote = 0
const now = new Date().toISOString()
for (const a of agents.slice(0, MAX === Infinity ? agents.length : MAX)) {
  const repo = repoOf(a.github_url)
  if (!repo) continue
  const v = await fetchRepo(repo)
  if (!v.ok) { gone++; continue }
  ok++
  if (WRITE) {
    const { error } = await db.from('agents').update({ github_pushed_at: v.pushed_at, github_stars_live: v.stars, github_checked_at: now }).eq('id', a.id)
    if (!error) wrote++
  }
}
console.log(`[gh-liveness] done — resolved ${ok}, unreachable ${gone}, wrote ${wrote}`)
