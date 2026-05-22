/**
 * ph-fetcher — Layer 1 Product Hunt fetcher (Phase 3 #7 PH half)
 *
 * Companion to runtime/hn-fetcher.mjs. Pulls recent Product Hunt launches
 * via the GraphQL API, filters by category + keyword config, writes
 * structured JSON to brain for Layer 2 consumers.
 *
 * Uses PRODUCTHUNT_TOKEN (Developer Token from
 * producthunt.com/v2/oauth/applications) — server-side bearer, no OAuth
 * dance needed. Simpler than client_credentials flow for our case.
 *
 * Config (BRAIN_PATH/Fetchers/ph/config.json):
 *   {
 *     "keywords": ["ai agent", "mcp", "a2a", "x402", "agentic", ...],
 *     "topics": ["artificial-intelligence", "developer-tools", "saas"],
 *     "posts_per_run": 50
 *   }
 *
 * Output: BRAIN_PATH/Fetchers/ph/output/ph-YYYY-MM-DD.json
 *
 * Env:
 *   PRODUCTHUNT_TOKEN  — required (Developer Token from PH app settings)
 *   BRAIN_PATH         — default /opt/agentcrush-brain
 *
 * Schedule: daily 07:55 Budapest (between HN 07:50 and morning brief 08:00).
 *
 * Exit codes: 0 always (pipeline tolerance — never break the chain).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const TOKEN = process.env.PRODUCTHUNT_TOKEN || process.env.PH_TOKEN;
const RUN_DATE = process.env.RUN_DATE || new Date().toISOString().slice(0, 10);
const CONFIG_PATH = path.join(BRAIN_PATH, 'Fetchers', 'ph', 'config.json');
const OUTPUT_DIR = path.join(BRAIN_PATH, 'Fetchers', 'ph', 'output');

const PH_API = 'https://api.producthunt.com/v2/api/graphql';

if (!TOKEN) {
  console.warn('[ph-fetcher] PRODUCTHUNT_TOKEN not set — skipping run (no error).');
  process.exit(0);
}

async function gql(query, variables = {}) {
  const res = await fetch(PH_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      'authorization': `Bearer ${TOKEN}`,
      'user-agent': 'agentcrush-ph-fetcher/0.1',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`PH ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  if (json.errors) throw new Error(`PH GraphQL: ${JSON.stringify(json.errors).slice(0, 300)}`);
  return json.data;
}

function matchKeywords(text, keywords) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

const POSTS_QUERY = `
query RecentPosts($first: Int!, $postedAfter: DateTime) {
  posts(first: $first, postedAfter: $postedAfter, order: NEWEST) {
    edges {
      node {
        id
        slug
        name
        tagline
        description
        url
        website
        votesCount
        commentsCount
        createdAt
        featuredAt
        topics(first: 8) { edges { node { slug name } } }
        makers { username name }
      }
    }
  }
}
`;

async function main() {
  let config;
  try {
    config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
  } catch (err) {
    console.warn(`[ph-fetcher] config missing (${CONFIG_PATH}). Writing seed and exiting.`);
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify({
      _note: 'Product Hunt new launches scanned for these keywords AND/OR topics. Matches saved with full post metadata. Tune to taste — PH adds noise quickly.',
      keywords: ['ai agent', 'agentic', 'mcp server', 'model context protocol', 'a2a', 'x402', 'erc-8004', 'agent economy', 'autonomous agent', 'agent commerce', 'agent payment', 'crewai', 'langgraph', 'agentverse', 'fetch.ai'],
      topics: ['artificial-intelligence', 'developer-tools', 'saas'],
      posts_per_run: 50,
    }, null, 2));
    return;
  }

  const keywords = config.keywords || [];
  const topicAllow = new Set(config.topics || []);
  const first = config.posts_per_run || 50;
  const since = new Date(Date.now() - 72 * 3600 * 1000).toISOString(); // 72h window

  console.log(`[ph-fetcher] Date: ${RUN_DATE}  Window: 72h  Posts/run: ${first}  Keywords: ${keywords.length}  Topic-filter: ${topicAllow.size}`);

  const data = await gql(POSTS_QUERY, { first, postedAfter: since });
  const raw = (data?.posts?.edges || []).map((e) => e.node);
  console.log(`[ph-fetcher] Fetched ${raw.length} posts from PH GraphQL`);

  const matches = [];
  for (const p of raw) {
    const topics = (p.topics?.edges || []).map((t) => t.node.slug);
    const topicHit = topicAllow.size === 0 || topics.some((t) => topicAllow.has(t));
    const kwHit = matchKeywords(`${p.name} ${p.tagline} ${p.description}`, keywords);
    // Include if topic matches AND has any keyword, OR keyword hit is strong (2+)
    if ((topicHit && kwHit.length > 0) || kwHit.length >= 2) {
      matches.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        url: p.url,
        website: p.website,
        votes: p.votesCount,
        comments: p.commentsCount,
        created_at: p.createdAt,
        featured_at: p.featuredAt,
        topics,
        makers: (p.makers || []).map((m) => m.username),
        keywords_matched: kwHit,
      });
    }
  }

  matches.sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const payload = {
    run_date: RUN_DATE,
    fetched_at: new Date().toISOString(),
    window_hours: 72,
    posts_scanned: raw.length,
    topic_allow: [...topicAllow],
    keywords,
    match_count: matches.length,
    matches,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `ph-${RUN_DATE}.json`);
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2));
  console.log(`[ph-fetcher] Wrote ${outPath} — ${matches.length} matches from ${raw.length} posts.`);
}

main().catch((err) => {
  console.error(`[ph-fetcher] FATAL (suppressed): ${err.message}`);
  process.exit(0);
});
