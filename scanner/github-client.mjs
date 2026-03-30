/**
 * GitHub REST API client for agent discovery.
 * Searches repos by topic (agent, ai-agent) and keyword in description.
 * Handles pagination and basic rate-limit backoff.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const BASE = 'https://api.github.com'
const PER_PAGE = 100

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function ghFetch(path, params = {}) {
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'AgentCrush-Indexer/1.0',
  }
  if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`

  let attempts = 0
  while (attempts < 3) {
    const res = await fetch(url.toString(), { headers })

    if (res.status === 403 || res.status === 429) {
      const retryAfter = res.headers.get('Retry-After')
      const wait = retryAfter ? parseInt(retryAfter) * 1000 : 60_000
      console.warn(`  Rate limited — waiting ${wait / 1000}s...`)
      await sleep(wait)
      attempts++
      continue
    }

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
    }

    return res.json()
  }
  throw new Error('GitHub API: exceeded retry attempts')
}

/**
 * Search repos with a query string, paginate up to maxPages.
 * Returns array of raw GitHub repo objects.
 */
async function searchRepos(query, maxPages = 5) {
  const results = []
  for (let page = 1; page <= maxPages; page++) {
    const data = await ghFetch('/search/repositories', {
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: PER_PAGE,
      page,
    })

    const items = data.items || []
    results.push(...items)
    console.log(`  [${query}] page ${page}: +${items.length} repos (total so far: ${results.length})`)

    // GitHub search API caps at 1000 results total
    if (items.length < PER_PAGE || results.length >= (data.total_count || 0)) break

    // Be polite between pages
    await sleep(800)
  }
  return results
}

/**
 * Fetch multiple search queries and merge deduplicated results.
 * Returns array of normalized repo objects.
 */
export async function fetchAgentRepos() {
  const QUERIES = [
    'topic:ai-agent stars:>5',
    'topic:agent stars:>5 language:python',
    'topic:agent stars:>5 language:javascript',
    '"AI agent" in:description stars:>10',
    '"autonomous agent" in:description stars:>5',
    '"llm agent" in:description stars:>5',
  ]

  const seen = new Set()
  const all = []

  for (const q of QUERIES) {
    console.log(`\nSearching: ${q}`)
    try {
      const repos = await searchRepos(q, 3)
      for (const repo of repos) {
        if (seen.has(repo.id)) continue
        seen.add(repo.id)
        all.push(repo)
      }
    } catch (err) {
      console.error(`  Error for query "${q}": ${err.message}`)
    }
    // Respect secondary rate limits between queries
    await sleep(1200)
  }

  console.log(`\nTotal unique repos fetched: ${all.length}`)
  return all
}

/**
 * Normalize a raw GitHub repo into AgentCrush ingestion shape.
 */
export function normalizeRepo(repo) {
  return {
    repo_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: repo.owner?.login || null,
    description: (repo.description || '').trim(),
    stars: repo.stargazers_count || 0,
    language: repo.language || null,
    repo_url: repo.html_url,
    homepage_url: repo.homepage || null,
    topics: (repo.topics || []).join(','),
    created_at_gh: repo.created_at,
    pushed_at: repo.pushed_at,
  }
}
