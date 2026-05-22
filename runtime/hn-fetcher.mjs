/**
 * hn-fetcher — Layer 1 deterministic fetcher (Phase 3 #7, HN half of HN/PH v2)
 *
 * Pulls Hacker News top stories matching configured keywords, writes a
 * structured JSON to brain for downstream Layer 2 consumption (morning
 * brief, competitor-watcher, future signal aggregators).
 *
 * No LLM — pure HN Firebase API → JSON.
 *
 * Why HN-only (deferred PH): Product Hunt's public API requires OAuth
 * setup that Kris hasn't done. v1 ships HN now; PH can be added when
 * Kris provisions the OAuth token. Restores the agent/AI signal the
 * legacy ajsa-daily-brief had before it was disabled 2026-05-21.
 *
 * Config (BRAIN_PATH/Fetchers/hn/config.json):
 *   {
 *     "keywords": ["ai agent", "mcp", "a2a", "x402", "agentic", ...],
 *     "top_n": 100,
 *     "min_score": 5
 *   }
 *
 * Output: BRAIN_PATH/Fetchers/hn/output/hn-YYYY-MM-DD.json
 *
 * Env:
 *   BRAIN_PATH   — default /opt/agentcrush-brain
 *
 * Schedule: daily 07:50 Budapest (after Neynar at 07:45, before morning brief at 08:00).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain';
const RUN_DATE = process.env.RUN_DATE || new Date().toISOString().slice(0, 10);
const CONFIG_PATH = path.join(BRAIN_PATH, 'Fetchers', 'hn', 'config.json');
const OUTPUT_DIR = path.join(BRAIN_PATH, 'Fetchers', 'hn', 'output');

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const UA = 'agentcrush-hn-fetcher/0.1';

async function hn(pathTail) {
  const res = await fetch(`${HN_API}${pathTail}`, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`HN ${res.status} ${pathTail}`);
  return res.json();
}

function matchKeywords(text, keywords) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

async function main() {
  // Bootstrap config if missing.
  let config;
  try {
    config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
  } catch (err) {
    console.warn(`[hn-fetcher] config missing (${CONFIG_PATH}). Writing seed and exiting.`);
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify({
      _note: 'HN topstories scanned for these keywords. Matches are saved with full story metadata. Keep keywords specific — single-word generics like "ai" produce too much noise.',
      keywords: ['ai agent', 'agentic', 'mcp server', 'model context protocol', 'a2a', 'x402', 'erc-8004', 'erc8004', 'agent economy', 'autonomous agent', 'agent commerce', 'agent payment', 'crewai', 'langgraph', 'agentverse', 'fetch.ai'],
      top_n: 100,
      min_score: 5,
    }, null, 2));
    return;
  }

  const keywords = config.keywords || [];
  const topN = config.top_n || 100;
  const minScore = config.min_score || 0;

  console.log(`[hn-fetcher] Date: ${RUN_DATE}  Top: ${topN}  Keywords: ${keywords.length}  Min score: ${minScore}`);

  if (keywords.length === 0) {
    console.warn('[hn-fetcher] No keywords configured — nothing to filter on.');
    return;
  }

  const topIds = (await hn('/topstories.json')).slice(0, topN);
  console.log(`[hn-fetcher] Fetched ${topIds.length} topstory IDs`);

  const matches = [];
  let scanned = 0;
  for (const id of topIds) {
    try {
      const story = await hn(`/item/${id}.json`);
      if (!story || story.deleted || story.dead) continue;
      scanned += 1;
      if ((story.score || 0) < minScore) continue;
      const text = `${story.title || ''} ${story.url || ''}`;
      const matched = matchKeywords(text, keywords);
      if (matched.length === 0) continue;
      matches.push({
        id: story.id,
        title: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        hn_url: `https://news.ycombinator.com/item?id=${story.id}`,
        score: story.score,
        descendants: story.descendants || 0,
        by: story.by,
        time: story.time,
        time_iso: new Date(story.time * 1000).toISOString(),
        keywords_matched: matched,
      });
    } catch (err) {
      console.warn(`[hn-fetcher] item ${id}: ${err.message}`);
    }
  }

  matches.sort((a, b) => b.score - a.score);

  const payload = {
    run_date: RUN_DATE,
    fetched_at: new Date().toISOString(),
    topstories_scanned: scanned,
    keywords,
    min_score: minScore,
    match_count: matches.length,
    matches,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `hn-${RUN_DATE}.json`);
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2));
  console.log(`[hn-fetcher] Wrote ${outPath} — ${matches.length} matches from ${scanned} stories.`);
}

main().catch((err) => {
  console.error(`[hn-fetcher] FATAL (suppressed for pipeline): ${err.message}`);
  process.exit(0);
});
