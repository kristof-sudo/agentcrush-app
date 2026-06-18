/**
 * resolveAgent.js — map free-form user input to an indexed AgentCrush handle.
 *
 * Powers the Ghost Check box: a visitor pastes a handle / GitHub link / X handle /
 * website, and we resolve it to one of our indexed agents. Naive substring matching
 * mis-fires (e.g. "github.com/..." matches the common host substring), so we parse
 * PER INPUT TYPE before querying. Feasibility-validated 2026-06-16.
 *
 * Returns { handle, matched_on } or null.
 */

const esc = (s) => String(s).replace(/[%,_]/g, ' ').trim()

function parseInput(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  const lower = s.toLowerCase()

  // GitHub URL or owner/repo → match on the repo path.
  const gh = lower.match(/github\.com\/([^/\s]+\/[^/\s?#]+)/) || lower.match(/^([a-z0-9._-]+\/[a-z0-9._-]+)$/i)
  if (gh) return { type: 'github', value: gh[1].replace(/\.git$/, '') }

  // Any other URL / bare domain → registrable host label.
  const urlMatch = lower.match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})(?:[/?#]|$)/)
  if (urlMatch && urlMatch[1].includes('.')) {
    const host = urlMatch[1]
    const parts = host.split('.')
    const label = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    return { type: 'domain', value: host, label }
  }

  // @handle
  if (s.startsWith('@')) return { type: 'x', value: s.slice(1) }

  // bare word/handle
  return { type: 'bare', value: s }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} raw  free-form input
 */
export async function resolveAgent(db, raw) {
  const p = parseInput(raw)
  if (!p) return null
  const SEL = 'handle, github_pushed_at, github_stars_live'

  // Base query: never resolve to an archived stub. Archived rows are de-duped
  // leftovers (e.g. the Nous Hermes dup cleanup) kept only for reversibility;
  // they have no live data and should never surface in Ghost Check. Until now
  // this was safe only by accident (star-ranking buried their zero stars).
  const sel = () => db.from('agents').select(SEL).neq('tier', 'archived')

  // Pick the MOST PROMINENT match — most GitHub stars (the real, popular project).
  // This is what makes "hermes" resolve to the 196k-star Nous repo instead of an
  // empty stub entry that merely matched first.
  // q must already have .select(SEL) applied; we add ranking + limit.
  const best = async (q) => {
    const { data } = await q.order('github_stars_live', { ascending: false, nullsFirst: false }).limit(1)
    return data && data[0] ? data[0].handle : null
  }

  if (p.type === 'github') {
    const h = await best(sel().ilike('github_url', `%${esc(p.value)}%`))
    if (h) return { handle: h, matched_on: 'github' }
    const repo = p.value.split('/')[1]
    if (repo) {
      const h2 = await best(sel().or(`handle.ilike.%${esc(repo)}%,display_name.ilike.%${esc(repo)}%`))
      if (h2) return { handle: h2, matched_on: 'github-name' }
    }
    return null
  }

  if (p.type === 'domain') {
    const h = await best(sel().ilike('website_url', `%${esc(p.value)}%`))
    if (h) return { handle: h, matched_on: 'website' }
    const h2 = await best(sel().or(`handle.ilike.%${esc(p.label)}%,display_name.ilike.%${esc(p.label)}%`))
    if (h2) return { handle: h2, matched_on: 'domain-label' }
    return null
  }

  if (p.type === 'x') {
    const v = esc(p.value)
    const h = await best(sel().or(`handle.eq.${v},x_handle.ilike.%${v}%`))
    if (h) return { handle: h, matched_on: 'x' }
    const h2 = await best(sel().or(`handle.ilike.%${v}%,display_name.ilike.%${v}%`))
    return h2 ? { handle: h2, matched_on: 'x-name' } : null
  }

  // bare: an exact handle that HAS live data wins (precise); otherwise fall back to
  // the most-prominent fuzzy match by stars (so empty brand stubs don't win).
  // Also match a de-punctuated form so "gpt-engineer" finds handle "gptengineer".
  const v = esc(p.value)
  const compact = p.value.toLowerCase().replace(/[^a-z0-9]/g, '')
  let ex0 = null
  for (const cand of [v, compact].filter((c, i, a) => c && a.indexOf(c) === i)) {
    const { data: ex } = await sel().eq('handle', cand).limit(1)
    if (ex && ex[0]) { ex0 = ex0 || ex[0]; if (ex[0].github_pushed_at) return { handle: ex[0].handle, matched_on: 'handle' } }
  }
  let fuzzy = await best(sel().or(`handle.ilike.%${v}%,display_name.ilike.%${v}%`))
  if (!fuzzy && compact && compact !== v) fuzzy = await best(sel().ilike('handle', `%${compact}%`))
  if (fuzzy) return { handle: fuzzy, matched_on: 'fuzzy' }
  return ex0 ? { handle: ex0.handle, matched_on: 'handle' } : null
}
