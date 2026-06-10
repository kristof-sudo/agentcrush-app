/**
 * auto-like-worker.mjs — Ajsa engagement automation
 *
 * Reads the section-7 "Engagement queue — likes" from today's Ajsa social
 * brief and fires likes on X and Farcaster.
 *
 * X:         OAuth 1.0a  →  POST /2/users/:id/likes
 * Farcaster: Neynar API  →  POST /v2/farcaster/reaction  (requires approved signer)
 *
 * Runs via systemd timer ~5 min after morning brief (03:35 UTC daily).
 *
 * Usage:
 *   node runtime/ajsa/auto-like-worker.mjs             # live
 *   node runtime/ajsa/auto-like-worker.mjs --dry-run   # print targets, do nothing
 *   node runtime/ajsa/auto-like-worker.mjs --date 2026-06-10  # explicit date
 *
 * Env (all in /opt/agentcrush/fetchers/.env):
 *   X_CONSUMER_KEY, X_CONSUMER_SECRET    — app credentials
 *   X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET — user credentials (write access)
 *   X_USER_ID                            — @agentcrush_xyz user ID
 *   NEYNAR_API_KEY                       — for Farcaster likes
 *   NEYNAR_SIGNER_UUID                   — must be approved in Warpcast
 *   BRAIN_PATH                           — path to agentcrush-brain clone
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — for completion report
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const dateArg = (() => { const i = args.indexOf('--date'); return i !== -1 ? args[i + 1] : null })()
const RUN_DATE = dateArg ?? new Date().toISOString().slice(0, 10)

// ── Env ───────────────────────────────────────────────────────────────────────

const BRAIN_PATH            = process.env.BRAIN_PATH ?? '/opt/agentcrush-brain'
const TELEGRAM_BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID      = process.env.TELEGRAM_CHAT_ID
const NEYNAR_API_KEY        = process.env.NEYNAR_API_KEY
const NEYNAR_SIGNER_UUID    = process.env.NEYNAR_SIGNER_UUID ?? 'ddfd226e-7da4-4006-a8f1-acfde8d6df50'
const X_CONSUMER_KEY        = process.env.X_CONSUMER_KEY
const X_CONSUMER_SECRET     = process.env.X_CONSUMER_SECRET
const X_ACCESS_TOKEN        = process.env.X_ACCESS_TOKEN
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET
const X_USER_ID             = process.env.X_USER_ID ?? '2030934917274587136'

// ── Brief parser ──────────────────────────────────────────────────────────────

async function readBriefLikes(date) {
  const briefPath = path.join(BRAIN_PATH, 'Agents/ajsa/output', `social-brief-${date}.md`)
  let content
  try {
    content = await fs.readFile(briefPath, 'utf8')
  } catch {
    throw new Error(`Brief not found: ${briefPath}`)
  }

  // Extract everything between "## 7." and the next "## N." heading
  const section7 = content.match(/^## 7\..*?(?=^## \d+\.|^---|\Z)/ms)?.[0] ?? ''
  if (!section7) {
    console.log('[auto-like] Section 7 not found in brief — nothing to like')
    return { x: [], farcaster: [] }
  }

  const urls = [...section7.matchAll(/https?:\/\/[^\s)>\]]+/g)].map(m => m[0].replace(/[,.]$/, ''))
  const x = [], farcaster = []

  for (const url of urls) {
    const xMatch = url.match(/x\.com\/[^/]+\/status\/(\d+)/)
    if (xMatch) { x.push({ url, tweetId: xMatch[1] }); continue }

    const fcMatch = url.match(/warpcast\.com\/~\/conversations\/(0x[a-f0-9]+)/i)
    if (fcMatch) { farcaster.push({ url, hash: fcMatch[1] }) }
  }

  return { x, farcaster }
}

// ── OAuth 1.0a helper ─────────────────────────────────────────────────────────

function pct(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g, '%21').replace(/'/g, '%27')
    .replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A')
}

function buildOAuthHeader(method, url) {
  const params = {
    oauth_consumer_key:     X_CONSUMER_KEY,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        String(Math.floor(Date.now() / 1000)),
    oauth_token:            X_ACCESS_TOKEN,
    oauth_version:          '1.0',
  }

  const sortedStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${pct(k)}=${pct(v)}`)
    .join('&')

  const base = [method.toUpperCase(), pct(url), pct(sortedStr)].join('&')
  const key  = `${pct(X_CONSUMER_SECRET)}&${pct(X_ACCESS_TOKEN_SECRET)}`
  params.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64')

  return 'OAuth ' + Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
    .join(', ')
}

// ── X likes ───────────────────────────────────────────────────────────────────

async function likeXTweet(tweetId) {
  const url = `https://api.twitter.com/2/users/${X_USER_ID}/likes`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:  buildOAuthHeader('POST', url),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tweet_id: tweetId }),
  })
  if (res.status === 403) return { alreadyLiked: true }  // duplicate like — treat as OK
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return { alreadyLiked: false }
}

// ── Farcaster likes ───────────────────────────────────────────────────────────

async function likeFarcasterCast(hash) {
  const res = await fetch('https://api.neynar.com/v2/farcaster/reaction', {
    method: 'POST',
    headers: { 'x-api-key': NEYNAR_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ signer_uuid: NEYNAR_SIGNER_UUID, reaction_type: 'like', target: hash }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
}

// ── Telegram ──────────────────────────────────────────────────────────────────

async function tg(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || isDryRun) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[auto-like] ${RUN_DATE}  mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}`)

  const { x: xTargets, farcaster: fcTargets } = await readBriefLikes(RUN_DATE)
  console.log(`[auto-like] queue: ${xTargets.length} X  ${fcTargets.length} Farcaster`)

  const xReady = !!(X_CONSUMER_KEY && X_CONSUMER_SECRET && X_ACCESS_TOKEN && X_ACCESS_TOKEN_SECRET)
  const fcReady = !!(NEYNAR_API_KEY && NEYNAR_SIGNER_UUID)

  if (!xReady)  console.log('[auto-like] X skipped — X_ACCESS_TOKEN or X_ACCESS_TOKEN_SECRET not set')
  if (!fcReady) console.log('[auto-like] Farcaster skipped — NEYNAR credentials missing')

  const done = { x: 0, fc: 0 }
  const failed = { x: [], fc: [] }

  // ── X likes ──
  if (xReady) {
    for (const { url, tweetId } of xTargets) {
      if (isDryRun) { console.log(`[auto-like] DRY-RUN X like: ${url}`); done.x++; continue }
      try {
        const r = await likeXTweet(tweetId)
        console.log(`[auto-like] X liked ${tweetId}${r.alreadyLiked ? ' (already liked)' : ''}`)
        done.x++
      } catch (err) {
        console.error(`[auto-like] X like FAILED ${tweetId}: ${err.message}`)
        failed.x.push(tweetId)
      }
      await new Promise(r => setTimeout(r, 1000))  // 1 req/sec, well within rate limits
    }
  }

  // ── Farcaster likes ──
  if (fcReady) {
    for (const { url, hash } of fcTargets) {
      if (isDryRun) { console.log(`[auto-like] DRY-RUN FC like: ${url}`); done.fc++; continue }
      try {
        await likeFarcasterCast(hash)
        console.log(`[auto-like] FC liked ${hash}`)
        done.fc++
      } catch (err) {
        console.error(`[auto-like] FC like FAILED ${hash}: ${err.message}`)
        failed.fc.push(hash)
      }
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // ── Summary ──
  const totalFailed = failed.x.length + failed.fc.length
  const parts = []
  if (done.x  > 0) parts.push(`${done.x} X`)
  if (done.fc > 0) parts.push(`${done.fc} FC`)

  const summary = parts.length > 0
    ? `👍 Auto-liked ${parts.join(' + ')}${totalFailed ? ` · ${totalFailed} failed` : ''}`
    : `👍 Auto-like: no targets today`

  console.log(`[auto-like] ${summary}`)
  await tg(summary)
}

main().catch(err => {
  console.error(`[auto-like] FATAL: ${err.message}`)
  process.exit(1)
})
