/**
 * Hacker News mention signal worker.
 *
 * Modes:
 *   --dry-run  Read-only: queries agents and HN, prints signal candidates.
 *   --write    Upserts relevant HN mention evidence into agent_hn_signals.
 *
 * Never modifies: agents, rankings, ecosystem_signals, agent_daily_snapshots,
 * github_repo_snapshots, or any scoring RPC.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const ENV_PATHS = [
  '/opt/agentcrush/copydesk/.env',
  '/opt/agentcrush/scanner/.env',
];

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const HN_BASE = 'https://hn.algolia.com/api/v1/search';
const HITS_PER_QUERY = 10;
const USER_AGENT = 'AgentCrush-HN-Mention-Worker/1.0';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    write: false,
    limit: DEFAULT_LIMIT,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (arg === '--write') {
      args.write = true;
      continue;
    }

    if (arg === '--limit') {
      const raw = argv[i + 1];
      if (!raw) throw new Error('Missing value for --limit');
      args.limit = parseLimit(raw);
      i++;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      args.limit = parseLimit(arg.slice('--limit='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.dryRun && args.write) {
    throw new Error('Cannot use --dry-run and --write together. Pick one.');
  }

  if (!args.dryRun && !args.write) {
    throw new Error('Specify --dry-run or --write.');
  }

  return args;
}

function parseLimit(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) throw new Error('--limit must be a positive integer');
  return Math.min(n, MAX_LIMIT);
}

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadEnvFiles(paths) {
  for (const path of paths) {
    try {
      const text = await fs.readFile(path, 'utf8');
      for (const [key, value] of Object.entries(parseEnv(text))) {
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // Optional env files vary by deployment.
    }
  }
}

async function fetchAgents(supabase, limit) {
  const fields = 'id, handle, name, display_name, github_full_name, github_repo_url, score_total, rank';
  let { data, error } = await supabase
    .from('agents')
    .select(fields)
    .not('github_full_name', 'is', null)
    .limit(limit);

  if (error && isMissingColumnError(error)) {
    const fallbackFields = 'id, handle, display_name, github_full_name, github_repo_url';
    const fallback = await supabase
      .from('agents')
      .select(fallbackFields)
      .not('github_full_name', 'is', null)
      .limit(limit);

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return data || [];
}

function isMissingColumnError(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`;
  return /column|schema cache|could not find/i.test(msg);
}

function cleanText(value) {
  return String(value || '').trim();
}

function repoNameFromFullName(fullName) {
  const parts = cleanText(fullName).split('/');
  return parts.length === 2 ? parts[1] : '';
}

function normalizeToken(value) {
  return cleanText(value).toLowerCase();
}

function addQuery(queries, seen, value) {
  const q = cleanText(value);
  if (!q) return;
  if (q.length < 3) return;
  const key = q.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  queries.push(q);
}

function buildQueries(agent) {
  const seen = new Set();
  const queries = [];
  const repoName = repoNameFromFullName(agent.github_full_name);

  addQuery(queries, seen, agent.handle);
  addQuery(queries, seen, agent.display_name || agent.name);
  addQuery(queries, seen, repoName);
  addQuery(queries, seen, agent.github_full_name);

  return queries.slice(0, 4);
}

function hnItemUrl(objectID) {
  return `https://news.ycombinator.com/item?id=${encodeURIComponent(objectID)}`;
}

async function fetchHnHits(query) {
  const url = new URL(HN_BASE);
  url.searchParams.set('query', query);
  url.searchParams.set('tags', 'story');
  url.searchParams.set('hitsPerPage', String(HITS_PER_QUERY));

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HN Algolia ${res.status} for "${query}": ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.hits || [];
}

function normalizeHit(hit, matchedQuery) {
  return {
    title: cleanText(hit.title || hit.story_title),
    url: cleanText(hit.url) || hnItemUrl(hit.objectID),
    objectID: cleanText(hit.objectID),
    points: Number(hit.points || 0),
    num_comments: Number(hit.num_comments || 0),
    author: cleanText(hit.author),
    created_at: cleanText(hit.created_at),
    matched_query: matchedQuery,
    _text: [
      hit.title,
      hit.story_title,
      hit.url,
      hit.story_text,
      hit.comment_text,
    ].map(cleanText).join(' ').toLowerCase(),
  };
}

function matchSignals(agent) {
  const handle = normalizeToken(agent.handle);
  const display = normalizeToken(agent.display_name || agent.name);
  const repoName = normalizeToken(repoNameFromFullName(agent.github_full_name));
  const fullName = normalizeToken(agent.github_full_name);
  const repoUrl = normalizeToken(agent.github_repo_url);

  return {
    handle,
    display,
    repoName,
    fullName,
    repoUrl,
    strong: [fullName, repoUrl].filter(Boolean),
  };
}

function textContains(text, needle) {
  if (!needle) return false;
  return text.includes(needle.toLowerCase());
}

function isRelevantHit(agent, hit) {
  const signals = matchSignals(agent);
  const text = hit._text;

  const strongMatch = signals.strong.some(signal => textContains(text, signal));
  if (strongMatch) return { relevant: true, reason: 'full-name/url match' };

  const repoNameMatch = textContains(text, signals.repoName);
  const handleMatch = textContains(text, signals.handle);
  const displayMatch = textContains(text, signals.display);
  const shortHandle = signals.handle && signals.handle.length < 4;

  if (repoNameMatch && isDistinctiveRepoToken(signals.repoName)) {
    return { relevant: true, reason: 'distinctive repo-name match' };
  }

  if (repoNameMatch) {
    return { relevant: false, reason: 'generic repo-name matched without full-name/url confirmation' };
  }

  if (shortHandle && handleMatch) {
    return { relevant: false, reason: 'short handle matched without repo confirmation' };
  }

  if (handleMatch || displayMatch) {
    return { relevant: true, reason: handleMatch ? 'handle match' : 'display/name match' };
  }

  return { relevant: false, reason: 'no conservative token match' };
}

function isDistinctiveRepoToken(repoName) {
  if (!repoName) return false;
  if (repoName.length >= 7) return true;
  return /gpt|llm|ai|agent|chain|graph|dspy|autogen/i.test(repoName);
}

function summarizeAgent(agent, hits) {
  const seen = new Map();
  for (const hit of hits) {
    if (!seen.has(hit.objectID)) seen.set(hit.objectID, hit);
  }

  const uniqueHits = [...seen.values()];
  const relevant = [];
  const falsePositiveConcerns = [];

  for (const hit of uniqueHits) {
    const verdict = isRelevantHit(agent, hit);
    if (verdict.relevant) {
      relevant.push({ ...hit, relevance_reason: verdict.reason });
    } else if (hit.title || hit.url) {
      falsePositiveConcerns.push({
        agent: agent.display_name || agent.handle,
        query: hit.matched_query,
        title: hit.title,
        reason: verdict.reason,
      });
    }
  }

  relevant.sort((a, b) =>
    (b.points + b.num_comments) - (a.points + a.num_comments)
  );

  const newest = relevant
    .map(hit => hit.created_at)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    agent,
    total_hits: uniqueHits.length,
    relevant_hits: relevant.length,
    total_points: relevant.reduce((sum, hit) => sum + hit.points, 0),
    total_comments: relevant.reduce((sum, hit) => sum + hit.num_comments, 0),
    newest_hit_at: newest,
    top_hit_title: relevant[0]?.title || null,
    top_hit_url: relevant[0]?.url || null,
    relevant,
    falsePositiveConcerns,
  };
}

async function upsertHnSignals(supabase, agentId, relevantHits) {
  if (relevantHits.length === 0) return 0;

  const now = new Date().toISOString();
  const rows = relevantHits.map(hit => ({
    agent_id: agentId,
    source: 'hn',
    source_item_id: hit.objectID,
    source_url: hit.url,
    title: hit.title,
    author: hit.author,
    hn_created_at: hit.created_at || null,
    matched_query: hit.matched_query,
    relevance_reason: hit.relevance_reason,
    points: hit.points,
    num_comments: hit.num_comments,
    strength: hit.points + hit.num_comments,
    is_relevant: true,
    false_positive_reason: null,
    raw: {
      objectID: hit.objectID,
      title: hit.title,
      url: hit.url,
      points: hit.points,
      num_comments: hit.num_comments,
      author: hit.author,
      created_at: hit.created_at,
    },
    observed_at: now,
    updated_at: now,
  }));

  const { error, count } = await supabase
    .from('agent_hn_signals')
    .upsert(rows, {
      onConflict: 'agent_id,source_item_id',
      count: 'exact',
    });

  if (error) throw error;
  return count ?? rows.length;
}

function compact(value, max = 70) {
  const text = cleanText(value).replace(/\s+/g, ' ');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function printSummary(summaries, noHitCount, skippedCount) {
  const withSignals = summaries.filter(s => s.relevant_hits > 0);

  console.log('\n=== HN mention dry-run summary ===');
  console.log(`agents_checked=${summaries.length}`);
  console.log(`agents_with_relevant_hits=${withSignals.length}`);
  console.log(`agents_without_relevant_hits=${noHitCount}`);
  console.log(`agents_skipped_no_queries=${skippedCount}`);

  console.log('\n=== Agents with relevant HN hits ===');
  if (withSignals.length === 0) {
    console.log('(none)');
  } else {
    console.log('agent | hits | points | comments | newest | top hit');
    for (const s of withSignals) {
      const label = s.agent.display_name || s.agent.handle;
      console.log([
        compact(label, 28),
        s.relevant_hits,
        s.total_points,
        s.total_comments,
        s.newest_hit_at || '-',
        compact(s.top_hit_title || '-', 80),
      ].join(' | '));
    }
  }

  const strongest = withSignals
    .flatMap(s => s.relevant.map(hit => ({
      agent: s.agent.display_name || s.agent.handle,
      handle: s.agent.handle,
      title: hit.title,
      url: hit.url,
      points: hit.points,
      comments: hit.num_comments,
      created_at: hit.created_at,
      matched_query: hit.matched_query,
      relevance_reason: hit.relevance_reason,
      strength: hit.points + hit.num_comments,
    })))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10);

  console.log('\n=== Top 10 strongest HN signals ===');
  if (strongest.length === 0) {
    console.log('(none)');
  } else {
    strongest.forEach((hit, index) => {
      console.log(`${index + 1}. ${compact(hit.agent, 28)} | strength=${hit.strength} points=${hit.points} comments=${hit.comments}`);
      console.log(`   query="${hit.matched_query}" reason="${hit.relevance_reason}" date=${hit.created_at || '-'}`);
      console.log(`   ${compact(hit.title || '-', 100)}`);
      console.log(`   ${hit.url}`);
    });
  }

  const concerns = summaries
    .flatMap(s => s.falsePositiveConcerns)
    .slice(0, 15);

  console.log('\n=== False-positive concerns ===');
  if (concerns.length === 0) {
    console.log('(none observed in returned hits)');
  } else {
    for (const concern of concerns) {
      console.log(`- ${compact(concern.agent, 28)} query="${concern.query}" reason="${concern.reason}" title="${compact(concern.title, 90)}"`);
    }
  }
}

function printWriteSummary(summaries, noHitCount, skippedCount, totalRelevantHits, rowsWritten, writtenSignals) {
  const agentsWithHits = summaries.filter(s => s.relevant_hits > 0).length;

  console.log('\n=== HN mention write summary ===');
  console.log(`agents_checked=${summaries.length}`);
  console.log(`relevant_hits_found=${totalRelevantHits}`);
  console.log(`rows_inserted_or_updated=${rowsWritten}`);
  console.log(`agents_with_relevant_hits=${agentsWithHits}`);
  console.log(`agents_with_no_relevant_hits=${noHitCount}`);
  console.log(`agents_skipped_no_queries=${skippedCount}`);

  const top10 = writtenSignals
    .slice()
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10);

  console.log('\n=== Top 10 written HN signals ===');
  if (top10.length === 0) {
    console.log('(none)');
  } else {
    top10.forEach((hit, index) => {
      console.log(`${index + 1}. ${compact(hit.agent, 28)} | strength=${hit.strength} points=${hit.points} comments=${hit.num_comments}`);
      console.log(`   query="${hit.matched_query}" reason="${hit.relevance_reason}" date=${hit.created_at || '-'}`);
      console.log(`   ${compact(hit.title || '-', 100)}`);
      console.log(`   ${hit.url}`);
    });
  }

  const concerns = summaries
    .flatMap(s => s.falsePositiveConcerns)
    .slice(0, 15);

  console.log('\n=== False-positive warnings ===');
  if (concerns.length === 0) {
    console.log('(none observed in returned hits)');
  } else {
    for (const concern of concerns) {
      console.log(`- ${compact(concern.agent, 28)} query="${concern.query}" reason="${concern.reason}" title="${compact(concern.title, 90)}"`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  await loadEnvFiles(ENV_PATHS);

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment. Values are intentionally not printed.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const agents = await fetchAgents(supabase, args.limit);
  const summaries = [];
  let skippedNoQueries = 0;
  let totalRowsWritten = 0;
  const writtenSignals = [];

  for (const agent of agents) {
    const queries = buildQueries(agent);
    if (queries.length === 0) {
      skippedNoQueries++;
      continue;
    }

    const hits = [];
    for (const query of queries) {
      try {
        const queryHits = await fetchHnHits(query);
        hits.push(...queryHits.map(hit => normalizeHit(hit, query)));
      } catch (err) {
        console.error(`HN query failed for agent=${agent.handle || agent.id} query="${query}": ${err.message}`);
      }
    }

    const summary = summarizeAgent(agent, hits);
    summaries.push(summary);

    if (args.write && summary.relevant.length > 0) {
      try {
        const written = await upsertHnSignals(supabase, agent.id, summary.relevant);
        totalRowsWritten += written;
        const agentLabel = agent.display_name || agent.handle;
        for (const hit of summary.relevant) {
          writtenSignals.push({
            agent: agentLabel,
            handle: agent.handle,
            title: hit.title,
            url: hit.url,
            points: hit.points,
            num_comments: hit.num_comments,
            created_at: hit.created_at,
            matched_query: hit.matched_query,
            relevance_reason: hit.relevance_reason,
            strength: hit.points + hit.num_comments,
          });
        }
      } catch (err) {
        console.error(`Upsert failed for agent=${agent.handle || agent.id}: ${err.message}`);
      }
    }
  }

  const noHitCount = summaries.filter(s => s.relevant_hits === 0).length;
  const totalRelevantHits = summaries.reduce((sum, s) => sum + s.relevant_hits, 0);

  if (args.dryRun) {
    printSummary(summaries, noHitCount, skippedNoQueries);
  } else {
    printWriteSummary(summaries, noHitCount, skippedNoQueries, totalRelevantHits, totalRowsWritten, writtenSignals);
  }
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
