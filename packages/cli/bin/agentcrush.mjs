#!/usr/bin/env node
/**
 * agentcrush CLI — AgentCrush agent economy index
 *
 * Usage:
 *   npx agentcrush top                      # top 20 ranked agents
 *   npx agentcrush rank @aixbt_agent         # rank + evidence for one agent
 *   npx agentcrush trust @aixbt_agent        # composite trust score
 *   npx agentcrush changes @aixbt_agent      # recent material changes
 *   npx agentcrush badge @aixbt_agent        # badge URL for embedding
 *   npx agentcrush search "payment agent"    # search the index
 *   npx agentcrush trends                    # ecosystem trend summary
 *   npx agentcrush ecosystem                 # full ecosystem LLM summary
 *
 * Global flags:
 *   --json                                   # output raw JSON
 *   --limit N                                # cap result count (default varies)
 *   --category <name>                        # filter by category
 */

import {
  getAgent, getTrust, getChanges, getBadgeUrl,
  getTrends, getTopMovers, getEcosystemSummary, searchAgents, getTopAgents,
} from '../lib/api.mjs';
import {
  bold, dim, green, yellow, red, cyan, grey,
  printJson, printKv, printTable, trustColor, deltaArrow, fmt,
} from '../lib/format.mjs';

// ── Arg parsing ───────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const limitIdx = argv.indexOf('--limit');
const limitArg = limitIdx !== -1 ? Number(argv[limitIdx + 1]) : null;
const catIdx = argv.indexOf('--category');
const category = catIdx !== -1 ? argv[catIdx + 1] : null;

// Strip flags to get positional args
const positional = argv.filter((a, i) => {
  if (a.startsWith('--')) return false;
  if (i > 0 && argv[i - 1].startsWith('--') && !argv[i - 1].match(/^--(json|help|version)$/)) return false;
  return true;
});

const [command, ...rest] = positional;

// ── Help ──────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${bold('agentcrush')} — AI agent economy index CLI  ${dim('agentcrush.xyz')}

${bold('COMMANDS')}
  ${cyan('top')}                      Top 20 ranked agents
  ${cyan('rank')} ${dim('<handle>')}          Rankings + evidence tier for an agent
  ${cyan('trust')} ${dim('<handle>')}         Composite trust score (0-100)
  ${cyan('changes')} ${dim('<handle>')}       Recent material changes detected
  ${cyan('badge')} ${dim('<handle>')}         Get badge URLs for embedding
  ${cyan('search')} ${dim('"<query>"')}       Search the agent index
  ${cyan('trends')}                   Weekly ecosystem trend summary
  ${cyan('ecosystem')}                Full LLM-optimized ecosystem summary

${bold('FLAGS')}
  --json                    Output raw JSON
  --limit N                 Cap results (default varies by command)
  --category <name>         Filter by category (top/search only)

${bold('EXAMPLES')}
  npx agentcrush top --limit 10
  npx agentcrush rank @aixbt_agent
  npx agentcrush trust @virtuals_io --json
  npx agentcrush search "payment infrastructure"
  npx agentcrush badge @agentcrush --style mover

${bold('LIBRARY')}
  import { getAgent, getTrust, getTrends } from 'agentcrush'

  ${dim('Full API docs: agentcrush.xyz/methodology')}
  ${dim('Data license: CC-BY-4.0 — agentcrush.xyz/terms-for-agents')}
`);
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function cmdTop() {
  const limit = limitArg || 20;
  console.error(grey(`Fetching top ${limit} agents…`));
  const data = await getTopAgents({ limit, category });
  if (jsonMode) return printJson(data);

  const agents = Array.isArray(data) ? data : (data.agents || data.results || []);
  if (!agents.length) {
    console.log(grey('No agents returned.'));
    return;
  }
  console.log(`\n${bold('Top agents')} ${grey(`· agentcrush.xyz/rankings`)}\n`);
  printTable(agents, [
    { key: 'rank', label: '#', width: 5 },
    { key: 'handle', label: 'Handle', width: 25 },
    { key: 'name', label: 'Name', width: 28 },
    { key: 'tier', label: 'Tier', width: 16 },
    { key: 'score', label: 'Score', width: 8 },
  ]);
  console.log('');
}

async function cmdRank(handle) {
  if (!handle) { console.error('Usage: agentcrush rank <handle>'); process.exit(1); }
  console.error(grey(`Fetching agent data for ${handle}…`));
  const data = await getAgent(handle).catch(() => null);
  const trust = await getTrust(handle).catch(() => null);
  if (jsonMode) return printJson({ agent: data, trust });

  if (!data) {
    console.log(red(`Agent @${handle} not found in AgentCrush index.`));
    console.log(dim(`  Check: agentcrush.xyz/agents/${handle}`));
    return;
  }

  const a = data.agent || data;
  console.log(`\n${bold(a.name || handle)}  ${grey(`@${handle}`)}`);
  console.log(dim(`agentcrush.xyz/rankings/${a.category || 'agent-payments-stack'}/${handle}`) + '\n');
  printKv({
    Rank: a.rank ? `#${a.rank}` : '—',
    Tier: a.tier || a.confidence_tier || '—',
    Score: a.score != null ? fmt(a.score) : '—',
    Category: a.category || '—',
    'Weekly Δ': a.weekly_delta != null ? deltaArrow(a.weekly_delta) : '—',
    'GitHub stars': a.github_stars != null ? fmt(a.github_stars) : '—',
    'Followers': a.follower_count != null ? fmt(a.follower_count) : '—',
    'Trust score': trust ? trustColor(trust.score) : '—',
    'ERC-8004': a.erc8004_verified ? green('✓ verified') : grey('not verified'),
    'x402': a.x402_enabled ? green('✓ enabled') : grey('not enabled'),
  });
  if (a.description) console.log(`\n${dim(a.description.slice(0, 200))}`);
  console.log('');
}

async function cmdTrust(handle) {
  if (!handle) { console.error('Usage: agentcrush trust <handle>'); process.exit(1); }
  console.error(grey(`Fetching trust score for ${handle}…`));
  const data = await getTrust(handle);
  if (jsonMode) return printJson(data);

  console.log(`\n${bold('Trust score')} — ${cyan('@' + handle)}\n`);
  const score = data.score ?? data.trust_score;
  console.log(`  Score: ${bold(trustColor(score))} / 100  ${grey('(' + (data.classification || data.trust_classification || '?') + ')')}`);
  console.log('');
  if (data.components) {
    printKv(data.components, { indent: 2 });
  }
  if (data.delegation_hint) {
    console.log(`\n  ${dim(data.delegation_hint)}`);
  }
  if (data.risk_flags && data.risk_flags.length > 0) {
    console.log(`\n  ${yellow('Risk flags:')} ${data.risk_flags.join(', ')}`);
  }
  console.log('');
}

async function cmdChanges(handle) {
  if (!handle) { console.error('Usage: agentcrush changes <handle>'); process.exit(1); }
  const limit = limitArg || 10;
  console.error(grey(`Fetching change feed for ${handle}…`));
  const data = await getChanges(handle, { limit });
  if (jsonMode) return printJson(data);

  const changes = Array.isArray(data) ? data : (data.changes || []);
  console.log(`\n${bold('Recent changes')} — ${cyan('@' + handle)}\n`);
  if (!changes.length) {
    console.log(grey('  No material changes detected in recent snapshots.'));
  } else {
    for (const ch of changes.slice(0, limit)) {
      const date = ch.detected_at ? ch.detected_at.slice(0, 10) : '—';
      const field = (ch.field || ch.metric || '').padEnd(18);
      const from = ch.from_value != null ? String(ch.from_value) : '—';
      const to = ch.to_value != null ? String(ch.to_value) : '—';
      const arrow = ch.direction === 'up' ? green('▲') : ch.direction === 'down' ? red('▼') : grey('→');
      console.log(`  ${grey(date)}  ${field} ${arrow} ${from} → ${to}`);
    }
  }
  console.log('');
}

async function cmdBadge(handle) {
  if (!handle) { console.error('Usage: agentcrush badge <handle>'); process.exit(1); }
  const styles = ['rank', 'mover', 'evidence', 'trust'];
  if (jsonMode) {
    return printJson(Object.fromEntries(styles.map(s => [s, getBadgeUrl(handle, { style: s })])));
  }
  console.log(`\n${bold('Badge URLs')} — ${cyan('@' + handle)}\n`);
  for (const style of styles) {
    const url = getBadgeUrl(handle, { style });
    console.log(`  ${style.padEnd(10)} ${grey(url)}`);
  }
  console.log(`\n  ${dim('Embed: <img src="URL" alt="AgentCrush rank" />')}`);
  console.log('');
}

async function cmdSearch(query) {
  if (!query) { console.error('Usage: agentcrush search "<query>"'); process.exit(1); }
  const limit = limitArg || 10;
  console.error(grey(`Searching for "${query}"…`));
  const data = await searchAgents(query, { limit });
  if (jsonMode) return printJson(data);

  const results = Array.isArray(data) ? data : (data.agents || data.results || []);
  console.log(`\n${bold('Search results')} ${grey(`for "${query}"`)}\n`);
  if (!results.length) {
    console.log(grey('  No results found.'));
  } else {
    printTable(results, [
      { key: 'handle', label: 'Handle', width: 25 },
      { key: 'name', label: 'Name', width: 30 },
      { key: 'tier', label: 'Tier', width: 16 },
      { key: 'score', label: 'Score', width: 8 },
    ]);
  }
  console.log('');
}

async function cmdTrends() {
  console.error(grey('Fetching ecosystem trend summary…'));
  const data = await getTrends();
  if (jsonMode) return printJson(data);

  console.log(`\n${bold('Ecosystem trends')} ${grey('· agentcrush.xyz/trends')}\n`);
  if (data.total_agents != null)   console.log(`  Total indexed agents:  ${bold(fmt(data.total_agents))}`);
  if (data.evidence_ranked != null) console.log(`  Evidence-ranked:       ${fmt(data.evidence_ranked)}`);
  console.log('');

  if (data.top_movers_up?.length) {
    console.log(`${bold('Top movers ↑ this week')}`);
    printTable(data.top_movers_up.slice(0, 5), [
      { key: 'handle', label: 'Handle', width: 25 },
      { key: 'weekly_delta', label: 'Δ rank', width: 8 },
      { key: 'score', label: 'Score', width: 8 },
    ]);
    console.log('');
  }
  if (data.top_movers_down?.length) {
    console.log(`${bold('Biggest drops ↓')}`);
    printTable(data.top_movers_down.slice(0, 5), [
      { key: 'handle', label: 'Handle', width: 25 },
      { key: 'weekly_delta', label: 'Δ rank', width: 8 },
      { key: 'score', label: 'Score', width: 8 },
    ]);
    console.log('');
  }
  if (data.category_mix) {
    console.log(`${bold('Category breakdown')}`);
    for (const [cat, count] of Object.entries(data.category_mix)) {
      console.log(`  ${cat.padEnd(28)} ${fmt(count)}`);
    }
    console.log('');
  }
}

async function cmdEcosystem() {
  console.error(grey('Fetching ecosystem summary…'));
  const data = await getEcosystemSummary();
  if (jsonMode) return printJson(data);

  console.log(`\n${bold('AgentCrush ecosystem summary')} ${grey('· agentcrush.xyz')}\n`);
  // The llm-summary endpoint returns a structured object — print key fields
  const keys = ['headline', 'total_agents', 'top_protocol', 'trend_direction', 'updated_at'];
  for (const k of keys) {
    if (data[k] != null) console.log(`  ${grey(k.padEnd(18))}  ${data[k]}`);
  }
  if (data.summary) console.log(`\n${dim(data.summary)}`);
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!command || command === '--help' || command === 'help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === '--version' || command === 'version' || command === '-v') {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json');
    console.log(pkg.version);
    return;
  }

  const handle = rest[0];

  const cmds = {
    top: cmdTop,
    rank: () => cmdRank(handle),
    trust: () => cmdTrust(handle),
    changes: () => cmdChanges(handle),
    badge: () => cmdBadge(handle),
    search: () => cmdSearch(rest.join(' ')),
    trends: cmdTrends,
    ecosystem: cmdEcosystem,
  };

  const fn = cmds[command];
  if (!fn) {
    console.error(red(`Unknown command: ${command}`));
    console.error(`Run ${cyan('agentcrush help')} for usage.`);
    process.exit(1);
  }

  try {
    await fn();
  } catch (err) {
    console.error(red(`Error: ${err.message}`));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
