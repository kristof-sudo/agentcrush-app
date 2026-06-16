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
  const SEL = 'handle, display_name'

  const first = async (q) => {
    const { data } = await q.limit(1)
    return data && data[0] ? data[0].handle : null
  }

  if (p.type === 'github') {
    const h = await first(db.from('agents').select(SEL).ilike('github_url', `%${esc(p.value)}%`))
    if (h) return { handle: h, matched_on: 'github' }
    // fall back to the repo name alone
    const repo = p.value.split('/')[1]
    if (repo) {
      const h2 = await first(db.from('agents').select(SEL).or(`handle.ilike.%${esc(repo)}%,display_name.ilike.%${esc(repo)}%`))
      if (h2) return { handle: h2, matched_on: 'github-name' }
    }
    return null
  }

  if (p.type === 'domain') {
    const h = await first(db.from('agents').select(SEL).ilike('website_url', `%${esc(p.value)}%`))
    if (h) return { handle: h, matched_on: 'website' }
    // fall back to the domain label as a handle/name
    const h2 = await first(db.from('agents').select(SEL).or(`handle.ilike.%${esc(p.label)}%,display_name.ilike.%${esc(p.label)}%`))
    if (h2) return { handle: h2, matched_on: 'domain-label' }
    return null
  }

  if (p.type === 'x') {
    const v = esc(p.value)
    const h = await first(db.from('agents').select(SEL).or(`handle.eq.${v},x_handle.ilike.%${v}%`))
    if (h) return { handle: h, matched_on: 'x' }
    const h2 = await first(db.from('agents').select(SEL).or(`handle.ilike.%${v}%,display_name.ilike.%${v}%`))
    return h2 ? { handle: h2, matched_on: 'x-name' } : null
  }

  // bare: exact handle first, then fuzzy handle/name
  const v = esc(p.value)
  const exact = await first(db.from('agents').select(SEL).eq('handle', v))
  if (exact) return { handle: exact, matched_on: 'handle' }
  const fuzzy = await first(db.from('agents').select(SEL).or(`handle.ilike.%${v}%,display_name.ilike.%${v}%`))
  return fuzzy ? { handle: fuzzy, matched_on: 'fuzzy' } : null
}
