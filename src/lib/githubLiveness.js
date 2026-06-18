/**
 * githubLiveness.js — real, fresh liveness from GitHub.
 *
 * Our stored last_event_at is null for ~88% of agents, so "last signal" read as
 * months-old even for obviously-active projects (CrewAI, Claude Code…). The honest
 * fix is to read the agent's actual GitHub activity (repo `pushed_at`) at the source.
 *
 * Returns { pushed_at: ISO|null, stars: number|null, ok: bool, repo } — never throws.
 * Uses GITHUB_TOKEN if present (5000 req/hr); works unauthenticated otherwise (60/hr).
 */

export function parseGithubRepo(url) {
  if (!url) return null
  const m = String(url).match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i)
  if (!m) return null
  return `${m[1]}/${m[2].replace(/\.git$/, '')}`
}

export async function githubLiveness(githubUrl, { timeoutMs = 6000 } = {}) {
  const repo = parseGithubRepo(githubUrl)
  if (!repo) return { ok: false, pushed_at: null, stars: null, repo: null }
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'AgentCrush-GhostCheck',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: ctrl.signal,
    })
    if (!res.ok) return { ok: false, pushed_at: null, stars: null, repo, status: res.status }
    const j = await res.json()
    return { ok: true, pushed_at: j.pushed_at || null, stars: typeof j.stargazers_count === 'number' ? j.stargazers_count : null, repo }
  } catch {
    return { ok: false, pushed_at: null, stars: null, repo }
  } finally {
    clearTimeout(t)
  }
}

const DAY = 86400000
/** Liveness state from a real last-active date. */
export function livenessFrom(lastActiveMs) {
  if (!lastActiveMs) return { state: 'unknown', days: null }
  const days = Math.floor((Date.now() - lastActiveMs) / DAY)
  const state = days <= 30 ? 'alive' : days <= 90 ? 'dormant' : 'ghost'
  return { state, days }
}
