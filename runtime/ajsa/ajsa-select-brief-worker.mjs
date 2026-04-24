/**
 * Ajsa Brief Selector Worker
 *
 * Reads candidate brief items for a date, computes a multi-factor selector
 * score, picks max N for a founder action brief respecting source diversity.
 *
 * Usage:
 *   node ajsa-select-brief-worker.mjs --dry-run [--date YYYY-MM-DD] [--limit N]
 *   node ajsa-select-brief-worker.mjs --write   [--date YYYY-MM-DD] [--limit N]
 *
 * --write resets that date's selected/dismissed back to candidate, then selects fresh.
 * Never sends Telegram. Never deletes rows. Never prints secrets.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWrite  = args.includes('--write');
const dateIdx  = args.indexOf('--date');
const limitIdx = args.indexOf('--limit');
const TARGET_DATE = dateIdx !== -1 ? args[dateIdx + 1] : new Date().toISOString().slice(0, 10);
const LIMIT = limitIdx !== -1 ? (parseInt(args[limitIdx + 1], 10) || 5) : 5;

if (!isDryRun && !isWrite) {
  console.error('[ajsa-select] ERROR: Must specify --dry-run or --write.');
  process.exit(1);
}
if (isDryRun && isWrite) {
  console.error('[ajsa-select] ERROR: Cannot combine --dry-run and --write.');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(TARGET_DATE)) {
  console.error(`[ajsa-select] ERROR: Invalid --date "${TARGET_DATE}". Use YYYY-MM-DD.`);
  process.exit(1);
}

const MODE = isDryRun ? 'DRY-RUN' : 'WRITE';
console.log(`[ajsa-select] Mode: ${MODE}  Date: ${TARGET_DATE}  Limit: ${LIMIT}`);

// ── Env loading ───────────────────────────────────────────────────────────────

const ENV_CANDIDATES = [
  '/opt/agentcrush/selector/.env',
  '/opt/agentcrush/briefing/.env',
  '/opt/agentcrush/copydesk/.env',
];

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
    ) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

async function loadSupabaseEnv() {
  for (const envPath of ENV_CANDIDATES) {
    let text;
    try { text = await fs.readFile(envPath, 'utf8'); } catch { continue; }
    const parsed = parseEnv(text);
    if (parsed.SUPABASE_URL && parsed.SUPABASE_SERVICE_ROLE_KEY) {
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v;
      }
      console.log(`[ajsa-select] Loaded env from ${path.basename(path.dirname(envPath))}/.env`);
      return;
    }
  }
  throw new Error(`[ajsa-select] Could not find Supabase credentials in env candidates.`);
}

await loadSupabaseEnv();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL)              { console.error('[ajsa-select] ERROR: SUPABASE_URL missing.'); process.exit(1); }
if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('[ajsa-select] ERROR: SUPABASE_SERVICE_ROLE_KEY missing.'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Load reference data ───────────────────────────────────────────────────────

const { data: sourcesData, error: srcErr } = await supabase
  .from('ajsa_sources')
  .select('source_key, metadata');
if (srcErr) { console.error('[ajsa-select] ERROR loading sources:', srcErr.message); process.exit(1); }

const sourcePriority = {};
for (const s of sourcesData ?? []) {
  sourcePriority[s.source_key] = s.metadata?.priority ?? 'medium';
}

const { data: catalystData, error: catErr } = await supabase
  .from('ajsa_catalyst_state')
  .select('catalyst_key, status, title');
if (catErr) { console.error('[ajsa-select] ERROR loading catalysts:', catErr.message); process.exit(1); }

const activeCatalysts = (catalystData ?? []).filter(c => c.status !== 'triggered');

// ── Load candidates ───────────────────────────────────────────────────────────

// In write mode: reset selected/dismissed → candidate before loading, so re-runs work.
// In dry-run: fetch all statuses so the ranker can re-evaluate without modifying anything.
if (isWrite) {
  const { error: preResetErr } = await supabase
    .from('ajsa_brief_items')
    .update({ status: 'candidate' })
    .eq('brief_date', TARGET_DATE)
    .in('status', ['selected', 'dismissed']);
  if (preResetErr) {
    console.error('[ajsa-select] ERROR pre-resetting statuses:', preResetErr.message);
    process.exit(1);
  }
}

const { data: candidates, error: candErr } = await supabase
  .from('ajsa_brief_items')
  .select('id, source_key, source_type, title, url, score, status, recommendation, priority, evidence, payload')
  .eq('brief_date', TARGET_DATE)
  .in('status', ['candidate', 'selected', 'dismissed'])
  .order('score', { ascending: false });

if (candErr) { console.error('[ajsa-select] ERROR loading candidates:', candErr.message); process.exit(1); }

console.log(`\n[ajsa-select] ${candidates.length} candidate(s) for ${TARGET_DATE}\n`);

if (candidates.length === 0) {
  console.log('[ajsa-select] No candidates found. Run the ingest worker first.');
  process.exit(0);
}

// ── Scoring constants ─────────────────────────────────────────────────────────

// Keywords that directly signal a watched catalyst
const CATALYST_KW = new Set([
  'x402', 'erc-8004', 'erc8004', 'agent payment', 'agent payments',
  'a2a', 'agent-to-agent', 'identity registry', 'validation registry',
  'agent reputation', 'agent commerce protocol', 'acp', 'onchain commerce',
  'autonomous economic activity',
]);

// Stable reference pages — definitionally static content; heavy penalty vs live signals
const STATIC_REF_STABLE = new Set([
  'coinbase_x402_docs_welcome',  // intro/overview, changes rarely
  'x402_bazaar_docs',            // feature description landing page
  'erc8004_official_eip',        // EIP spec, stable once published
]);
// Living docs — do update, but are still reference, not event (lighter penalty)
const STATIC_REF_LIVING = new Set([
  'coinbase_cdp_changelog',      // updated with each SDK release
]);

// Vague/low-actionability title patterns
const VAGUE_PATTERNS = [
  /virtual agent econom/i,
  /city citizen/i,
  /is there genuine interest/i,
  /giving an ai agent a wallet/i,
  /^\s*ask hn:/i,
  /deepmind paper on virtual/i,
  /next 10 years will be about/i,
];

// Source-type caps for final selection
const TYPE_CAPS = { search: 2, docs: 2 };

// ── Catalyst match detection ──────────────────────────────────────────────────

function detectCatalystMatches(item) {
  const titleL = (item.title ?? '').toLowerCase();
  const kws    = item.evidence?.matched_keywords ?? [];
  const matched = [];

  for (const cat of activeCatalysts) {
    switch (cat.catalyst_key) {
      case 'competing_agent_payment_standard':
        if (kws.some(k => k === 'agent payment' || k === 'agent payments') &&
            (titleL.includes('ap2') || titleL.includes('google') ||
             titleL.includes('standard') || titleL.includes('state of agent') ||
             titleL.includes('xbpp') || titleL.includes('open standard'))) {
          matched.push({ key: cat.catalyst_key, label: 'competing payment standard' });
        }
        break;
      case 'enterprise_x402_deployment':
        // Exclude own reference docs (Coinbase's x402 docs pages are not deployment signals)
        if (kws.includes('x402') &&
            item.source_type !== 'docs' &&
            (titleL.includes('cloudflare') || titleL.includes('stripe') ||
             titleL.includes('foundation') || titleL.includes('enterprise') ||
             (titleL.includes('coinbase') &&
              !titleL.includes('documentation') && !titleL.includes('developer')))) {
          matched.push({ key: cat.catalyst_key, label: 'enterprise x402 deployment' });
        }
        break;
      case 'erc8004_major_adoption':
        if ((kws.includes('erc-8004') || kws.includes('erc8004')) &&
            (titleL.includes('launch') || titleL.includes('implement') ||
             titleL.includes('shipped') || titleL.includes('adopti') ||
             titleL.includes('live'))) {
          matched.push({ key: cat.catalyst_key, label: 'ERC-8004 adoption signal' });
        }
        break;
      case 'cloudflare_pay_per_crawl_ga':
        if (titleL.includes('cloudflare')) {
          matched.push({ key: cat.catalyst_key, label: 'Cloudflare x402/pay-per-crawl' });
        }
        break;
      case 'stripe_x402_revenue_disclosure':
        if (titleL.includes('stripe')) {
          matched.push({ key: cat.catalyst_key, label: 'Stripe x402 signal' });
        }
        break;
      case 'frontier_model_usdc_wallet':
        if ((titleL.includes('openai') || titleL.includes('anthropic') ||
             titleL.includes('gemini') || titleL.includes('gpt')) &&
            kws.some(k => k === 'usdc' || k === 'agent wallet')) {
          matched.push({ key: cat.catalyst_key, label: 'frontier model + wallet' });
        }
        break;
    }
  }
  return matched;
}

// ── Selector score ────────────────────────────────────────────────────────────

function computeSelectorScore(item) {
  let sel = item.score;
  const reasons = [];
  const kws    = item.evidence?.matched_keywords ?? [];
  const pts    = item.evidence?.hn_points  ?? null;
  const cmt    = item.evidence?.hn_comments ?? null;
  const isHN   = item.source_key === 'hacker_news_agent_economy_search';
  const titleL = (item.title ?? '').toLowerCase();

  // Source priority
  const pri = sourcePriority[item.source_key] ?? 'medium';
  if (pri === 'high') { sel += 20; reasons.push('+20 source=high'); }

  // HN engagement (logarithmic scaling, hard caps)
  if (isHN && pts !== null) {
    const ptsBoost = Math.min(Math.floor(pts / 10) * 8, 40);
    const cmtBoost = Math.min(Math.floor((cmt ?? 0) / 10) * 5, 25);
    if (ptsBoost > 0) { sel += ptsBoost; reasons.push(`+${ptsBoost} hn_pts(${pts})`); }
    if (cmtBoost > 0) { sel += cmtBoost; reasons.push(`+${cmtBoost} hn_cmt(${cmt})`); }
  }

  // Catalyst keyword hits
  const catKwHits = kws.filter(k => CATALYST_KW.has(k));
  if (catKwHits.length > 0) {
    const boost = Math.min(catKwHits.length * 8, 32);
    sel += boost; reasons.push(`+${boost} catalyst_kw(${catKwHits.length})`);
  }

  // Keyword breadth bonus
  if (kws.length >= 3) { sel += 10; reasons.push('+10 multi-kw'); }
  if (kws.length >= 5) { sel += 5;  reasons.push('+5 breadth'); }

  // Direct catalyst state match (strongest boost — this is what Ajsa watches for)
  const catMatches = detectCatalystMatches(item);
  if (catMatches.length > 0) {
    const boost = catMatches.length * 25;
    sel += boost;
    reasons.push(`+${boost} catalyst_match(${catMatches.map(m => m.label).join('; ')})`);
  }

  // ── Penalties ──

  // Very low HN engagement
  if (isHN && pts !== null && pts < 3 && (cmt ?? 0) < 2) {
    sel -= 20; reasons.push('-20 low_engagement');
  }

  // HN item with no catalyst keywords at all (generic agent discussion)
  if (isHN && catKwHits.length === 0) {
    sel -= 25; reasons.push('-25 no_catalyst_kw');
  }

  // Static reference docs — tiered penalty; stable pages ranked much lower than live signals
  if (STATIC_REF_STABLE.has(item.source_key)) {
    sel -= 30; reasons.push('-30 static_stable_ref');
  } else if (STATIC_REF_LIVING.has(item.source_key)) {
    sel -= 10; reasons.push('-10 static_living_ref');
  }

  // Vague, academic, or speculative title
  if (VAGUE_PATTERNS.some(p => p.test(titleL))) {
    sel -= 30; reasons.push('-30 vague/academic');
  }

  // Near-duplicate AP2/competing-standards cluster — keep only the best
  // Catches: AP2, XBPP, "state of agent payment protocols", and similar survey/launch posts
  const isAP2 = titleL.includes('ap2') || titleL.includes('xbpp') ||
    (titleL.includes('agent payment') &&
     (titleL.includes('protocol') || titleL.includes('standard') || titleL.includes('state of')));
  const isX402Main = (item.url ?? '').includes('x402.org') && isHN;

  return {
    selectorScore: Math.max(0, Math.round(sel)),
    reasons,
    catMatches,
    isAP2,
    isX402Main,
  };
}

// ── Score all candidates ──────────────────────────────────────────────────────

const TYPE_ORDER = { ecosystem: 0, search: 1, docs: 2 };

const scored = candidates.map(item => ({
  ...item,
  ...computeSelectorScore(item),
})).sort((a, b) => {
  if (b.selectorScore !== a.selectorScore) return b.selectorScore - a.selectorScore;
  // Tiebreak 1: prefer ecosystem > search > docs to favour live signals
  const typeOrderDiff = (TYPE_ORDER[a.source_type] ?? 3) - (TYPE_ORDER[b.source_type] ?? 3);
  if (typeOrderDiff !== 0) return typeOrderDiff;
  // Tiebreak 2: prefer higher HN engagement at equal score
  return (b.evidence?.hn_points ?? 0) - (a.evidence?.hn_points ?? 0);
});

// ── Greedy diversity-aware selection ─────────────────────────────────────────

const typeCounts  = {};
const selected    = [];
const dismissed   = [];

// Track AP2 and x402-main clusters to prevent duplicates
let ap2Selected   = false;
let x402MainSelected = false;

for (const item of scored) {
  if (selected.length >= LIMIT) break;

  const typeCount = typeCounts[item.source_type] ?? 0;
  const cap = TYPE_CAPS[item.source_type] ?? Infinity;

  // Catalyst matches can bypass docs/ecosystem type cap, but NOT search cap
  // (search results cluster around events; enforce the search cap strictly)
  const catalystBypass = item.catMatches.length > 0 &&
    typeCount >= cap &&
    item.source_type !== 'search';

  // Near-duplicate suppression
  if (item.isAP2 && ap2Selected) {
    dismissed.push({ item, reason: 'near-dup: AP2 already selected' });
    continue;
  }
  if (item.isX402Main && x402MainSelected) {
    dismissed.push({ item, reason: 'near-dup: x402.org thread already selected' });
    continue;
  }

  if (typeCount >= cap && !catalystBypass) {
    dismissed.push({ item, reason: `source-type cap (${item.source_type} limit=${cap})` });
    continue;
  }

  selected.push(item);
  typeCounts[item.source_type] = typeCount + 1;
  if (item.isAP2)      ap2Selected = true;
  if (item.isX402Main) x402MainSelected = true;
}

// Any scored items not selected are dismissed
for (const item of scored) {
  if (!selected.includes(item) && !dismissed.find(d => d.item === item)) {
    dismissed.push({ item, reason: 'below selection threshold' });
  }
}

// ── Derive narrative output ───────────────────────────────────────────────────

function whyItMatters(item) {
  const kws  = item.evidence?.matched_keywords ?? [];
  const pts  = item.evidence?.hn_points  ?? null;
  const cmt  = item.evidence?.hn_comments ?? null;
  const isHN = item.source_key === 'hacker_news_agent_economy_search';
  const parts = [];

  if (item.catMatches.length > 0) {
    parts.push(`Catalyst: ${item.catMatches.map(m => m.label).join(', ')}.`);
  }
  if (isHN && pts !== null) {
    if (pts >= 100) parts.push(`${pts} pts/${cmt} comments — major HN traction.`);
    else if (pts >= 20) parts.push(`${pts} pts/${cmt} comments — notable community signal.`);
    else              parts.push(`${pts} pts/${cmt} comments.`);
  }
  if (kws.includes('erc-8004') || kws.includes('erc8004')) {
    parts.push('ERC-8004 agent identity/trust signal.');
  }
  if (kws.some(k => ['a2a','agent-to-agent'].includes(k))) {
    parts.push('A2A protocol infrastructure signal.');
  }
  if (sourcePriority[item.source_key] === 'high' && item.source_type !== 'search') {
    parts.push('High-priority source.');
  }
  return parts.join(' ') || item.recommendation;
}

function suggestedAction(item) {
  for (const m of item.catMatches) {
    switch (m.key) {
      case 'competing_agent_payment_standard':
        return 'Profile AP2 vs x402 for AgentCrush. Draft positioning comparison.';
      case 'enterprise_x402_deployment':
        return 'Track enterprise x402 adoption. Update AgentCrush x402 coverage.';
      case 'erc8004_major_adoption':
        return 'Document ERC-8004 implementation. Candidate for AgentCrush registry entry.';
      case 'cloudflare_pay_per_crawl_ga':
        return 'Track Cloudflare x402/pay-per-crawl milestone for AgentCrush content timing.';
      case 'stripe_x402_revenue_disclosure':
        return 'Monitor Stripe x402 data for AgentCrush market intelligence.';
    }
  }
  if (item.source_type === 'docs' && sourcePriority[item.source_key] === 'high') {
    return 'Review for AgentCrush docs coverage gap or update opportunity.';
  }
  if (item.source_type === 'ecosystem' && sourcePriority[item.source_key] === 'high') {
    return 'Evaluate for AgentCrush ecosystem index. Check if listed/described.';
  }
  const isHN = item.source_key === 'hacker_news_agent_economy_search';
  if (isHN) return item.recommendation;
  return item.recommendation;
}

// ── Print output ──────────────────────────────────────────────────────────────

const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Ajsa Brief Selection — ${MODE}`);
console.log(`  Date: ${TARGET_DATE}   Run: ${ts}`);
console.log(`  Candidates: ${candidates.length}   Selected: ${selected.length}   Limit: ${LIMIT}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Top 10 ranked (dry-run visibility)
if (isDryRun) {
  console.log('  ── Top 10 ranked candidates ──\n');
  for (const [i, item] of scored.slice(0, 10).entries()) {
    const pts = item.evidence?.hn_points ?? null;
    const hnTag = pts !== null ? `  HN:${pts}pts/${item.evidence.hn_comments}c` : '';
    const selMark = selected.includes(item) ? ' ✓' : '';
    const staticTag = STATIC_REF_STABLE.has(item.source_key) ? '/static' : '';
    console.log(`  ${String(i + 1).padStart(2)}. [sel=${String(item.selectorScore).padStart(3)}] [score=${item.score}]${hnTag}  [${item.source_type}${staticTag}]${selMark}`);
    console.log(`      "${item.title?.slice(0, 72)}"`);
    console.log(`      ${item.reasons.join('  ')}`);
    console.log('');
  }
}

// Selected items
console.log('  ── Selected brief items ──\n');
for (const [i, item] of selected.entries()) {
  const pts = item.evidence?.hn_points ?? null;
  const hnTag = pts !== null ? `  ${pts}pts/${item.evidence.hn_comments}c` : '';
  const staticNote = STATIC_REF_STABLE.has(item.source_key) ? '  [static ref]' : '';
  console.log(`  ${i + 1}. ${item.title}${staticNote}`);
  console.log(`     source: ${item.source_key} / ${item.source_type} / score=${item.score} / sel=${item.selectorScore}${hnTag}`);
  console.log(`     why:    ${whyItMatters(item)}`);
  console.log(`     action: ${suggestedAction(item)}`);
  if (item.catMatches.length > 0) {
    console.log(`     catalyst: ${item.catMatches.map(m => `[${m.label}]`).join(' ')}`);
  }
  console.log('');
}

// Rejection summary
const rejectionBuckets = {};
for (const { item, reason } of dismissed) {
  const bucket = reason.split(':')[0].trim().split('(')[0].trim();
  rejectionBuckets[bucket] = (rejectionBuckets[bucket] ?? 0) + 1;
}

console.log('  ── Rejected themes ──\n');
for (const [bucket, count] of Object.entries(rejectionBuckets)) {
  console.log(`  • ${bucket}: ${count} item(s)`);
}

// Notable specific rejects
const notable = dismissed.filter(d =>
  (d.item.evidence?.hn_points ?? 0) >= 10 ||
  d.item.score >= 30 ||
  d.item.catMatches?.length > 0
).slice(0, 5);
if (notable.length > 0) {
  console.log('\n  Notable dismissed:');
  for (const { item, reason } of notable) {
    const pts = item.evidence?.hn_points ?? null;
    const hnTag = pts !== null ? `  ${pts}pts` : '';
    console.log(`  ✗ "${item.title?.slice(0, 60)}"${hnTag}  → ${reason}`);
  }
}

console.log('');

// ── Dry-run exit ──────────────────────────────────────────────────────────────

if (isDryRun) {
  console.log(`[ajsa-select] DRY RUN complete. ${selected.length} item(s) would be selected, ${dismissed.length} dismissed. No changes made.`);
  process.exit(0);
}

// ── Write ─────────────────────────────────────────────────────────────────────
// Reset already happened before load (pre-reset above). All items are now 'candidate'.

// Mark selected
let markedSelected = 0;
for (const item of selected) {
  const { error } = await supabase
    .from('ajsa_brief_items')
    .update({ status: 'selected' })
    .eq('id', item.id);
  if (error) {
    console.error(`  [ERROR] select ${item.source_key}: ${error.message}`);
  } else {
    console.log(`  [SELECTED] ${item.source_key} — "${item.title?.slice(0, 55)}"`);
    markedSelected++;
  }
}

// 3. Mark dismissed (all candidates not selected)
const selectedIds = new Set(selected.map(i => i.id));
const toDismiss = candidates.filter(c => !selectedIds.has(c.id));
let markedDismissed = 0;

if (toDismiss.length > 0) {
  const ids = toDismiss.map(c => c.id);
  // Batch update in chunks of 50
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { error } = await supabase
      .from('ajsa_brief_items')
      .update({ status: 'dismissed' })
      .in('id', chunk);
    if (error) {
      console.error(`  [ERROR] dismissing batch: ${error.message}`);
    } else {
      markedDismissed += chunk.length;
    }
  }
}

console.log(`\n[ajsa-select] Done. Selected: ${markedSelected}  Dismissed: ${markedDismissed}  Errors: ${selected.length - markedSelected + toDismiss.length - markedDismissed}`);
