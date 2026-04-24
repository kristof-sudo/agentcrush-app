/**
 * Hacker News mention signal worker.
 *
 * Modes:
 *   --dry-run              Read-only scan: queries agents and HN, prints signal candidates.
 *   --write                Upserts relevant HN mention evidence into agent_hn_signals.
 *   --audit-existing       Re-evaluate stored rows with current rules.
 *     --audit-existing --dry-run   Print likely false positives, no writes.
 *     --audit-existing --write     Mark likely false positives as is_relevant=false.
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

// Terms distinctive enough to match by title/url alone (no extra context needed).
const DISTINCTIVE_TERMS = new Set([
  'langchain', 'langgraph', 'dspy', 'openclaw', 'memgpt',
  'aider', 'agentgpt', 'openinterpreter',
]);

// Terms that are too generic or too short to trust without stronger title/url context.
// Each has a per-term validator in validateRiskyTerm().
const RISKY_TERMS = new Set([
  'autogen', 'swarms', 'marvin', 'fetch', 'camel',
  'superagent', 'openagents', 'devika',
]);

// ─── Argument parsing ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dryRun: false,
    write: false,
    auditExisting: false,
    limit: DEFAULT_LIMIT,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') { args.dryRun = true; continue; }
    if (arg === '--write') { args.write = true; continue; }
    if (arg === '--audit-existing') { args.auditExisting = true; continue; }

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

// ─── Env loading ─────────────────────────────────────────────────────────────

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

// ─── Agent fetching ──────────────────────────────────────────────────────────

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

async function buildAgentMapForIds(supabase, agentIds) {
  const uniqueIds = [...new Set(agentIds)];
  if (uniqueIds.length === 0) return new Map();

  const fields = 'id, handle, display_name, github_full_name, github_repo_url';
  const { data, error } = await supabase
    .from('agents')
    .select(fields)
    .in('id', uniqueIds);

  if (error) throw error;
  const map = new Map();
  for (const a of data || []) map.set(a.id, a);
  return map;
}

function isMissingColumnError(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`;
  return /column|schema cache|could not find/i.test(msg);
}

// ─── Text utilities ──────────────────────────────────────────────────────────

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeToken(value) {
  return cleanText(value).toLowerCase();
}

function textContains(text, needle) {
  if (!needle) return false;
  return text.includes(needle.toLowerCase());
}

// Word-boundary aware match. Prevents "autogen" matching "autogenerating", etc.
function textHasToken(text, token) {
  if (!token) return false;
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'i').test(text);
}

function hitTitleUrl(hit) {
  return [hit.title, hit.url].map(cleanText).join(' ').toLowerCase();
}

// ─── Query building ──────────────────────────────────────────────────────────

function repoNameFromFullName(fullName) {
  const parts = cleanText(fullName).split('/');
  return parts.length === 2 ? parts[1] : '';
}

function addQuery(queries, seen, value) {
  const q = cleanText(value);
  if (!q || q.length < 3) return;
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

// ─── HN API ──────────────────────────────────────────────────────────────────

function hnItemUrl(objectID) {
  return `https://news.ycombinator.com/item?id=${encodeURIComponent(objectID)}`;
}

async function fetchHnHits(query) {
  const url = new URL(HN_BASE);
  url.searchParams.set('query', query);
  url.searchParams.set('tags', 'story');
  url.searchParams.set('hitsPerPage', String(HITS_PER_QUERY));

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
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

// ─── Relevance model ──────────────────────────────────────────────────────────

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

// Validates a risky term against per-term project context rules.
// Only called when the token has already been confirmed present in titleUrl.
function validateRiskyTerm(term, titleUrl, fullText) {
  const combined = titleUrl + ' ' + fullText;

  switch (term) {
    case 'autogen':
      // microsoft.{0,5} matches "microsoft/autogen", "microsoft autogen", "microsoft's autogen"
      if (/microsoft.{0,5}autogen|autogen\s+studio|autogenstudio/i.test(combined)) {
        return { relevant: true, reason: 'autogen: Microsoft AutoGen / AutoGen Studio context confirmed' };
      }
      // Standalone "autogen" in title + GitHub URL referencing autogen → project context
      if (/github\.com[^"'\s]*autogen/i.test(combined)) {
        return { relevant: true, reason: 'autogen: project confirmed via GitHub autogen URL' };
      }
      return { relevant: false, reason: 'autogen: no clear Microsoft AutoGen or AutoGen Studio context' };

    case 'swarms':
      if (/docker\s+swarm|drone\s+swarm|robot\s+swarm|picospacecraft|submarine\s+swarm|insect\s+swarm/i.test(combined)) {
        return { relevant: false, reason: 'swarms: non-project context (docker/drone/robot/insect swarms)' };
      }
      if (/swarms?\s+ai|kyegomez\/swarms?|openai\s+swarms?/i.test(combined)) {
        return { relevant: true, reason: 'Swarms AI: project context confirmed (swarms ai / kyegomez/swarms)' };
      }
      return { relevant: false, reason: 'swarms: no Swarms AI / kyegomez/swarms project context confirmed' };

    case 'marvin':
      if (/marvin\s+ai|prefecthq\/marvin|prefecthq/i.test(combined)) {
        return { relevant: true, reason: 'Marvin AI: PrefectHQ/marvin project context confirmed' };
      }
      return { relevant: false, reason: 'marvin: no Marvin AI / PrefectHQ/marvin context found' };

    case 'fetch':
      if (/fetch\.ai|fetchai|uagents|agentverse/i.test(combined)) {
        return { relevant: true, reason: 'Fetch.ai: fetch.ai / fetchai / uagents / agentverse context confirmed' };
      }
      return { relevant: false, reason: 'fetch: no fetch.ai / fetchai / uagents / agentverse context found' };

    case 'camel':
      if (/camel-ai|camelai|camel\s+ai|camelagi\/camel/i.test(combined)) {
        return { relevant: true, reason: 'CAMEL AI: camelagi/camel project context confirmed' };
      }
      return { relevant: false, reason: 'camel: no CAMEL AI / camelagi/camel context found' };

    case 'superagent':
      // Compound AI project term in title/url is distinctive enough.
      return { relevant: true, reason: 'superagent: compound AI project term confirmed in title/url' };

    case 'openagents':
      return { relevant: true, reason: 'openagents: project term confirmed in title/url' };

    case 'devika':
      return { relevant: true, reason: 'devika: project name confirmed in title/url' };

    default:
      return { relevant: true, reason: `${term}: risky term confirmed in title/url` };
  }
}

// Length/pattern based distinctiveness for tokens not in RISKY_TERMS or DISTINCTIVE_TERMS.
function isDistinctiveGenericToken(token) {
  if (!token) return false;
  if (RISKY_TERMS.has(token) || DISTINCTIVE_TERMS.has(token)) return false;
  if (token.length >= 7) return true;
  return /gpt|llm|ai|agent|chain|graph|dspy/i.test(token);
}

function isRelevantHit(agent, hit) {
  const signals = matchSignals(agent);
  const fullText = hit._text;
  const titleUrl = hitTitleUrl(hit);

  // 1. Strong match: full GitHub path or repo URL anywhere in text.
  if (signals.strong.some(s => textContains(fullText, s))) {
    return { relevant: true, reason: 'full-name/url match' };
  }

  // 2. Token-level evaluation: repo name → handle → display name.
  const checks = [
    { token: signals.repoName, label: 'repo-name' },
    { token: signals.handle, label: 'handle' },
    { token: signals.display, label: 'display-name' },
  ];

  const seen = new Set();
  for (const { token, label } of checks) {
    if (!token || token.length < 3 || seen.has(token)) continue;
    seen.add(token);

    // Short handle (< 4 chars): too ambiguous to trust alone.
    if (label === 'handle' && token.length < 4) {
      if (textContains(fullText, token)) {
        return { relevant: false, reason: 'short handle matched without repo confirmation' };
      }
      continue;
    }

    // Risky terms: word-boundary match required in title/url + per-term validator.
    if (RISKY_TERMS.has(token)) {
      const inTitleUrl = textHasToken(titleUrl, token);
      const inFull = textHasToken(fullText, token);
      if (!inTitleUrl && !inFull) continue;
      if (!inTitleUrl) {
        return { relevant: false, reason: `risky term "${token}" only in body text, not title/url` };
      }
      return validateRiskyTerm(token, titleUrl, fullText);
    }

    // Distinctive safe terms: substring match, but only in title/url.
    if (DISTINCTIVE_TERMS.has(token)) {
      if (textContains(titleUrl, token)) {
        return { relevant: true, reason: `distinctive term (${label}) match in title/url` };
      }
      if (textContains(fullText, token)) {
        return { relevant: false, reason: `distinctive term "${token}" only in body, not in title/url` };
      }
      continue;
    }

    // Length/pattern distinctive tokens: require title/url match.
    if (isDistinctiveGenericToken(token)) {
      if (textContains(titleUrl, token)) {
        return { relevant: true, reason: `${label} distinctive match in title/url` };
      }
      if (textContains(fullText, token)) {
        return { relevant: false, reason: `${label} "${token}" distinctive but only in body, not title/url` };
      }
      continue;
    }

    // Generic token: match in title/url → relevant; repo-name match in body only → reject.
    if (textContains(titleUrl, token)) {
      return { relevant: true, reason: `${label} match in title/url` };
    }
    if (label === 'repo-name' && textContains(fullText, token)) {
      return { relevant: false, reason: 'generic repo-name matched in body without title/url confirmation' };
    }
  }

  return { relevant: false, reason: 'no conservative token match' };
}

// ─── Summarize ────────────────────────────────────────────────────────────────

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
    total_points: relevant.reduce((sum, h) => sum + h.points, 0),
    total_comments: relevant.reduce((sum, h) => sum + h.num_comments, 0),
    newest_hit_at: newest,
    top_hit_title: relevant[0]?.title || null,
    top_hit_url: relevant[0]?.url || null,
    relevant,
    falsePositiveConcerns,
  };
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

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

// ─── Audit mode ───────────────────────────────────────────────────────────────

async function fetchRelevantHnSignals(supabase) {
  const { data, error } = await supabase
    .from('agent_hn_signals')
    .select(
      'agent_id, source_item_id, source_url, title, author, hn_created_at, ' +
      'matched_query, relevance_reason, points, num_comments, strength, ' +
      'is_relevant, false_positive_reason'
    )
    .eq('is_relevant', true);
  if (error) throw error;
  return data || [];
}

function auditSignalRow(row, agent) {
  if (!agent) {
    return { isFalsePositive: true, reason: 'agent_id not found in agents table' };
  }

  // Reconstruct a minimal hit. We only have title + source_url (no body text),
  // which is intentional: the new rules require title/url presence anyway.
  const hit = {
    title: cleanText(row.title),
    url: cleanText(row.source_url),
    objectID: cleanText(row.source_item_id),
    points: Number(row.points || 0),
    num_comments: Number(row.num_comments || 0),
    author: cleanText(row.author),
    created_at: cleanText(row.hn_created_at),
    matched_query: cleanText(row.matched_query),
    _text: [row.title, row.source_url].map(cleanText).join(' ').toLowerCase(),
  };

  const verdict = isRelevantHit(agent, hit);
  return verdict.relevant
    ? { isFalsePositive: false }
    : { isFalsePositive: true, reason: verdict.reason };
}

async function runAudit(supabase, isDryRun) {
  const rows = await fetchRelevantHnSignals(supabase);
  const agentIds = rows.map(r => r.agent_id);
  const agentMap = await buildAgentMapForIds(supabase, agentIds);

  const falsePositives = [];
  let confirmedCount = 0;

  for (const row of rows) {
    const agent = agentMap.get(row.agent_id);
    const result = auditSignalRow(row, agent);
    if (result.isFalsePositive) {
      falsePositives.push({ row, reason: result.reason, agent });
    } else {
      confirmedCount++;
    }
  }

  console.log('\n=== HN signals audit ===');
  console.log(`rows_scanned=${rows.length}`);
  console.log(`confirmed_relevant=${confirmedCount}`);
  console.log(`likely_false_positives=${falsePositives.length}`);
  console.log(`mode=${isDryRun ? 'dry-run (no writes)' : 'write (marking false positives)'}`);

  console.log('\n=== Likely false positives ===');
  if (falsePositives.length === 0) {
    console.log('(none)');
  } else {
    for (const fp of falsePositives) {
      const agentLabel = fp.agent
        ? (fp.agent.display_name || fp.agent.handle || fp.row.agent_id)
        : fp.row.agent_id;
      console.log(`- ${compact(agentLabel, 28)} | ${compact(fp.row.title || '-', 80)}`);
      console.log(`  reason: ${fp.reason}`);
      console.log(`  url: ${fp.row.source_url}`);
    }
  }

  if (!isDryRun && falsePositives.length > 0) {
    const now = new Date().toISOString();
    let markedCount = 0;
    for (const fp of falsePositives) {
      const { error } = await supabase
        .from('agent_hn_signals')
        .update({
          is_relevant: false,
          false_positive_reason: fp.reason,
          updated_at: now,
        })
        .eq('agent_id', fp.row.agent_id)
        .eq('source_item_id', fp.row.source_item_id);

      if (error) {
        console.error(
          `Failed to mark false positive (agent=${fp.row.agent_id} ` +
          `item=${fp.row.source_item_id}): ${error.message}`
        );
      } else {
        markedCount++;
      }
    }
    console.log(`\nrows_marked_false_positive=${markedCount}`);
  }
}

// ─── Print helpers ────────────────────────────────────────────────────────────

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
    strongest.forEach((hit, i) => {
      console.log(`${i + 1}. ${compact(hit.agent, 28)} | strength=${hit.strength} points=${hit.points} comments=${hit.comments}`);
      console.log(`   query="${hit.matched_query}" reason="${hit.relevance_reason}" date=${hit.created_at || '-'}`);
      console.log(`   ${compact(hit.title || '-', 100)}`);
      console.log(`   ${hit.url}`);
    });
  }

  const concerns = summaries.flatMap(s => s.falsePositiveConcerns).slice(0, 15);
  console.log('\n=== False-positive concerns ===');
  if (concerns.length === 0) {
    console.log('(none observed in returned hits)');
  } else {
    for (const c of concerns) {
      console.log(`- ${compact(c.agent, 28)} query="${c.query}" reason="${c.reason}" title="${compact(c.title, 90)}"`);
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

  const top10 = writtenSignals.slice().sort((a, b) => b.strength - a.strength).slice(0, 10);
  console.log('\n=== Top 10 written HN signals ===');
  if (top10.length === 0) {
    console.log('(none)');
  } else {
    top10.forEach((hit, i) => {
      console.log(`${i + 1}. ${compact(hit.agent, 28)} | strength=${hit.strength} points=${hit.points} comments=${hit.num_comments}`);
      console.log(`   query="${hit.matched_query}" reason="${hit.relevance_reason}" date=${hit.created_at || '-'}`);
      console.log(`   ${compact(hit.title || '-', 100)}`);
      console.log(`   ${hit.url}`);
    });
  }

  const concerns = summaries.flatMap(s => s.falsePositiveConcerns).slice(0, 15);
  console.log('\n=== False-positive warnings ===');
  if (concerns.length === 0) {
    console.log('(none observed in returned hits)');
  } else {
    for (const c of concerns) {
      console.log(`- ${compact(c.agent, 28)} query="${c.query}" reason="${c.reason}" title="${compact(c.title, 90)}"`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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

  if (args.auditExisting) {
    await runAudit(supabase, args.dryRun);
    return;
  }

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
