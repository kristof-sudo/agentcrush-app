import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { getActivityLevel } from "../state/activity-level.mjs";
import { checkScannerCap, recordXApiCalls } from "../state/x-api-cost.mjs";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  X_BEARER_TOKEN
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration");
}

if (!X_BEARER_TOKEN) {
  throw new Error("Missing X_BEARER_TOKEN");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Phase 3 shadow logging — fail-silent, no pipeline impact
async function createWorkflow(workflow_id) {
  try {
    const { error } = await supabase.from("workflows").insert([{ workflow_id, status: "in_progress" }]);
    if (error) console.warn("[shadow] createWorkflow failed:", error.message);
    else console.log("[shadow] workflow created:", workflow_id);
  } catch (e) {
    console.warn("[shadow] createWorkflow exception:", e.message);
  }
}

async function logWorkflowEvent(event) {
  try {
    const { error } = await supabase.from("workflow_events").insert([event]);
    if (error) console.warn("[shadow] logWorkflowEvent failed:", error.message);
    else console.log("[shadow] event logged:", event.workflow_id, event.role, event.status);
  } catch (e) {
    console.warn("[shadow] logWorkflowEvent exception:", e.message);
  }
}

async function closeWorkflow(workflow_id, finalStatus = "completed") {
  if (!workflow_id) return;
  try {
    const { error } = await supabase.from("workflows").update({ status: finalStatus, updated_at: new Date().toISOString() }).eq("workflow_id", workflow_id);
    if (error) console.warn("[shadow] closeWorkflow failed:", error.message);
    else console.log("[shadow] workflow closed:", workflow_id, finalStatus);
  } catch (e) {
    console.warn("[shadow] closeWorkflow exception:", e.message);
  }
}

let _activeWorkflowId = null;

const X_API = "https://api.twitter.com/2";
const USER_CACHE_PATH = "/opt/agentcrush/scanner/watchlist-user-cache.json";
const ROTATION_STATE_PATH = "/opt/agentcrush/state/scanner_rotation.json";
const MIKE_HANDLE = "MikeMatshAI";

// Per-run limits — keeps each run to ~23 API calls (~$0.18 at $0.0077/call).
// Breakdown: 10 watchlist fetches + 2 search queries + scanIncomingReplies (1 + up to 10 per Mike tweet).
// Full watchlist rotation every ~6 runs; full search rotation every ~6 runs.
const WATCHLIST_SCAN_LIMIT = 10;  // out of ~60 total; full rotation every 6 runs
const SEARCH_QUERY_LIMIT = 2;     // out of 11 total; full rotation every 6 runs

// Tier 1: framework founders, key builders, must-watch AI agent accounts
const TIER1_WATCHLIST = [
  // Platform / product
  "bankrbot",
  "moltbook",
  "openclaw",
  "KellyClaudeAI",
  "fetch_ai",
  "virtuals_io",
  "blockrunai",
  "mattprd",
  // Frameworks & tooling
  "LangChainAI",
  "crewAIInc",
  "OpenInterpreter",
  "AutoGPT",
  "llama_index",
  // Founders & researchers
  "yoheinakajima",
  "hwchase17",
  "joaomdmoura",
  "jerryjliu0",
  "simonw",
  "swyx",
  "karpathy",
  "sama",
  "gdb",
  "alexalbert__",
  "goodside",
  "_jasonwei",
  "ShayneRedford",
  "OfirPress",
  "lateinteraction",
  "DrJimFan",
  "reach_vb",
  // Orgs
  "AnthropicAI",
  "openai",
  "GoogleDeepMind",
  // Ecosystem
  "e2b_dev",
  "composio_dev",
  "lgramatidev",
  // AI agents & tools
  "hermes_agent_ai",
  "NousResearch",
  "cursor_ai",
  "DevinAI",
  "Kimi_Moonshot",
];

// Tier 2: AI infra, tooling, crypto-agent crossover
const TIER2_WATCHLIST = [
  "huggingface",
  "LlamaIndex",
  "replicate",
  "weights_biases",
  "heliconeai",
  "dstack_ai",
  "griptape_ai",
  "fixie_ai",
  "modal_labs",
  "mlflow",
  "pinecone",
  "MistralAI",
  "a16z",
  "AIatMeta",
  // Infra & platforms
  "digitalocean",
  "NVIDIAGTC",
  "NVIDIAAIDev",
  "github",
  "Cloudflare",
];

// Keep combined for backward-compat
const WATCHLIST = [...new Set([...TIER1_WATCHLIST, ...TIER2_WATCHLIST])];

const TIER1_SET = new Set(TIER1_WATCHLIST.map(h => h.toLowerCase()));
const TIER2_SET = new Set(TIER2_WATCHLIST.map(h => h.toLowerCase()));

function sourceTierFor(username) {
  const key = String(username || "").toLowerCase();
  if (TIER1_SET.has(key)) return "watchlist_tier1";
  if (TIER2_SET.has(key)) return "watchlist_tier2";
  return "watchlist";
}

// 5 highest-signal search queries. @MikeMatshAI is free via the mentions/reply scan.
const SEARCH_QUERIES = [
  '"AI agent"',
  '"autonomous agent"',
  '"agent framework"',
  '"multi-agent"',
  '"agentic"',
  '"Hermes agent"',
  '"Obsidian Claude"',
  '"Claude Code"',
  '"Cursor AI"',
  '"Nous Research"',
  '"DevinAI"',
];

const stats = {
  watchlist_ok: 0,
  watchlist_transient: 0,
  watchlist_hard: 0,
  query_ok: 0,
  query_transient: 0,
  query_hard: 0,
  reply_scan_ok: 0,
  reply_scan_transient: 0,
  reply_scan_hard: 0,
  tweets_stored: 0,
  replies_stored: 0,
  insert_errors: 0,
  x_api_calls: 0,
};

class XApiError extends Error {
  constructor(status, bodyText) {
    super(`X API ${status}: ${bodyText}`);
    this.name = "XApiError";
    this.status = Number(status);
    this.bodyText = bodyText;
  }
}

function isTransientXError(err) {
  const status = Number(err?.status || 0);
  return [429, 502, 503, 504].includes(status);
}

function shortBody(text) {
  return String(text || "").replace(/\s+/g, " ").slice(0, 180);
}

function isQuestionText(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (raw.includes("?")) return true;
  return /^(how|what|why|when|can|is|should)\b/i.test(raw);
}

async function fetchJSON(url) {
  const cap = checkScannerCap();
  if (!cap.allowed) {
    // Cap check passed before making any HTTP request — do not record a call
    const err = new Error(`x_api_cap_reached estimated_usd=${cap.estimatedUsd.toFixed(3)}`);
    err.isCapReached = true;
    throw err;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${X_BEARER_TOKEN}`
    }
  });

  // Record the call regardless of response status — the HTTP request was made
  // and X counts it against usage whether it succeeded or failed.
  recordXApiCalls(1);
  stats.x_api_calls += 1;

  if (!res.ok) {
    const text = await res.text();
    throw new XApiError(res.status, text);
  }

  return res.json();
}

const TWEET_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function storeTweet(tweet, sourceType, source) {
  // Skip tweets older than 7 days
  if (tweet.created_at) {
    const ageMs = Date.now() - new Date(tweet.created_at).getTime();
    if (ageMs > TWEET_MAX_AGE_MS) {
      console.log(`scanner: skipping stale tweet ${tweet.id} (created ${tweet.created_at})`);
      return;
    }
  }

  const payload = {
    tweet_id: tweet.id,
    text_content: tweet.text,
    author_handle: sourceType.startsWith("watchlist") ? source : null,
    author_name: null,
    like_count: tweet.public_metrics?.like_count ?? 0,
    reply_count: tweet.public_metrics?.reply_count ?? 0,
    repost_count: tweet.public_metrics?.retweet_count ?? 0,
    observed_at: new Date().toISOString(),
    source_query: sourceType,
    is_processed: false,
    ignored: false
  };

  const { error } = await supabase
    .from("x_observed_posts")
    .upsert(payload, { onConflict: "tweet_id" });

  if (error) {
    stats.insert_errors += 1;
    console.error("scanner insert error", error.message || error);
    return;
  }

  stats.tweets_stored += 1;
}

async function storeIncomingReply(tweet, authorMap = new Map()) {
  const author = authorMap.get(tweet.author_id) || {};
  const text = tweet.text || "";
  const metadata = {
    tweet_id: tweet.id,
    parent_tweet_id: tweet.referenced_tweets?.find(ref => ref.type === "replied_to")?.id || null,
    text,
    author_handle: author.username || null,
    is_question: isQuestionText(text),
  };

  const { data: existing, error: existingError } = await supabase
    .from("events")
    .select("id")
    .eq("event_type", "reply_incoming")
    .contains("metadata", { tweet_id: tweet.id })
    .limit(1);

  if (existingError) {
    stats.insert_errors += 1;
    console.error("scanner reply lookup error", existingError.message || existingError);
    return;
  }

  if (existing?.length) return;

  const { error } = await supabase
    .from("events")
    .insert([{
      event_type: "reply_incoming",
      metadata,
      created_at: tweet.created_at || new Date().toISOString(),
    }]);

  if (error) {
    stats.insert_errors += 1;
    console.error("scanner reply insert error", error.message || error);
    return;
  }

  stats.replies_stored += 1;
}

function loadRotation() {
  try {
    return JSON.parse(fs.readFileSync(ROTATION_STATE_PATH, "utf8"));
  } catch {
    return { watchlist_offset: 0, search_offset: 0 };
  }
}

function saveRotation(state) {
  try {
    fs.writeFileSync(ROTATION_STATE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("scanner: failed to write rotation state", err.message);
  }
}

function loadUserCache() {
  try {
    return JSON.parse(fs.readFileSync(USER_CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveUserCache(cache) {
  try {
    fs.writeFileSync(USER_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error("scanner cache write error", err.message || err);
  }
}

async function resolveUserId(username, cache) {
  const key = String(username || "").toLowerCase();
  if (cache[key]) return cache[key];

  const user = await fetchJSON(`${X_API}/users/by/username/${username}`);
  const id = user?.data?.id || null;

  if (id) {
    cache[key] = id;
    saveUserCache(cache);
  }

  return id;
}

async function scanWatchlist(accountSlice) {
  const cache = loadUserCache();

  for (const username of accountSlice) {
    try {
      const id = await resolveUserId(username, cache);
      if (!id) {
        console.warn(`scanner watchlist skipped (${username}) no user id`);
        continue;
      }

      const tweets = await fetchJSON(
        `${X_API}/users/${id}/tweets?max_results=5&tweet.fields=created_at,public_metrics,author_id`
      );

      if (!tweets.data) {
        console.log(`scanner: watchlist ${username} ok (0 tweets)`);
        stats.watchlist_ok += 1;
        continue;
      }

      const tier = sourceTierFor(username);
      for (const tweet of tweets.data) {
        await storeTweet(tweet, tier, username);
      }

      stats.watchlist_ok += 1;
      console.log(`scanner: watchlist ${username} ok (${tier})`);
    } catch (err) {
      if (err.isCapReached) {
        console.warn(`scanner watchlist: x_api_cap reached mid-run at ${username} — stopping watchlist scan`);
        return;
      }

      if (isTransientXError(err)) {
        stats.watchlist_transient += 1;
        console.warn(
          `scanner watchlist transient (${username}) status=${err.status} body="${shortBody(err.bodyText)}"`
        );
        continue;
      }

      stats.watchlist_hard += 1;
      console.error(`scanner watchlist hard error (${username})`, err.message || err);
    }
  }
}

async function scanSearch(querySlice) {
  for (const q of querySlice) {
    try {
      const url =
        `${X_API}/tweets/search/recent?` +
        `query=${encodeURIComponent(q)}&max_results=10&tweet.fields=created_at,public_metrics,author_id`;

      const res = await fetchJSON(url);

      if (!res.data) {
        console.log(`scanner: query "${q}" ok (0 tweets)`);
        stats.query_ok += 1;
        continue;
      }

      for (const tweet of res.data) {
        await storeTweet(tweet, "search", q);
      }

      stats.query_ok += 1;
      console.log(`scanner: query "${q}" ok`);
    } catch (err) {
      if (err.isCapReached) {
        console.warn(`scanner search: x_api_cap reached mid-run at query "${q}" — stopping search scan`);
        return;
      }

      if (isTransientXError(err)) {
        stats.query_transient += 1;
        console.warn(
          `scanner query transient (${q}) status=${err.status} body="${shortBody(err.bodyText)}"`
        );
        continue;
      }

      stats.query_hard += 1;
      console.error(`scanner query hard error (${q})`, err.message || err);
    }
  }
}

async function scanIncomingReplies() {
  const cache = loadUserCache();

  try {
    const mikeUserId = await resolveUserId(MIKE_HANDLE, cache);
    if (!mikeUserId) {
      console.warn(`scanner incoming replies skipped (${MIKE_HANDLE}) no user id`);
      return;
    }

    const mikeTweets = await fetchJSON(
      `${X_API}/users/${mikeUserId}/tweets?max_results=10&exclude=replies,retweets&tweet.fields=created_at`
    );

    const mikeTweetIds = (mikeTweets.data || []).map(tweet => tweet.id).filter(Boolean);

    if (mikeTweetIds.length === 0) {
      console.log(`scanner: incoming replies ${MIKE_HANDLE} ok (0 source tweets)`);
      stats.reply_scan_ok += 1;
      return;
    }

    for (const tweetId of mikeTweetIds) {
      const query = `conversation_id:${tweetId} is:reply -from:${MIKE_HANDLE}`;
      const url =
        `${X_API}/tweets/search/recent?query=${encodeURIComponent(query)}` +
        `&max_results=25` +
        `&tweet.fields=created_at,author_id,conversation_id,referenced_tweets` +
        `&expansions=author_id` +
        `&user.fields=username,name`;
      const res = await fetchJSON(url);
      const authorMap = new Map((res.includes?.users || []).map(user => [user.id, user]));

      for (const tweet of res.data || []) {
        await storeIncomingReply(tweet, authorMap);
      }
    }

    stats.reply_scan_ok += 1;
    console.log(`scanner: incoming replies ${MIKE_HANDLE} ok`);
  } catch (err) {
    if (err.isCapReached) {
      console.warn(`scanner incoming replies: x_api_cap reached — skipping replies`);
      return;
    }

    if (isTransientXError(err)) {
      stats.reply_scan_transient += 1;
      console.warn(
        `scanner incoming replies transient (${MIKE_HANDLE}) status=${err.status} body="${shortBody(err.bodyText)}"`
      );
      return;
    }

    stats.reply_scan_hard += 1;
    console.error(`scanner incoming replies hard error (${MIKE_HANDLE})`, err.message || err);
  }
}

const SCANNER_LAST_RUN_PATH = "/opt/agentcrush/state/scanner_last_run.json";

function getLastScanTime() {
  try {
    const raw = fs.readFileSync(SCANNER_LAST_RUN_PATH, "utf8");
    return new Date(JSON.parse(raw).last_run).getTime();
  } catch {
    return 0;
  }
}

function recordScanTime() {
  try {
    fs.writeFileSync(
      SCANNER_LAST_RUN_PATH,
      JSON.stringify({ last_run: new Date().toISOString() }, null, 2)
    );
  } catch (err) {
    console.error("scanner: failed to write last_run state", err.message);
  }
}

async function main() {
  const capCheck = checkScannerCap();
  if (!capCheck.allowed) {
    console.warn(
      `scanner skip: scanner_cap_reached estimated_usd=${capCheck.estimatedUsd.toFixed(3)} calls=${capCheck.callsToday} reason=${capCheck.reason}`
    );
    try {
      await supabase.from("runs").insert([{
        runner: "x_scanner",
        job: "scan",
        status: "skipped",
        meta: { reason: "x_api_cap", x_api_cost_usd: capCheck.estimatedUsd, x_api_calls: capCheck.callsToday },
        error: null,
      }]);
    } catch {}
    return;
  }

  const activity = getActivityLevel();
  const intervalMs = activity.scanner_interval_min * 60 * 1000;
  const lastRun = getLastScanTime();
  const msSinceLastRun = Date.now() - lastRun;

  if (msSinceLastRun < intervalMs) {
    const waitMin = Math.round((intervalMs - msSinceLastRun) / 60000);
    console.log(
      `scanner skip: activity=${activity.label} interval=${activity.scanner_interval_min}min ` +
      `last_run=${Math.round(msSinceLastRun / 60000)}min ago, wait ${waitMin}min more`
    );
    return;
  }

  // Compute per-run slices via rotating offset so all accounts/queries cycle over time
  const rotation = loadRotation();
  const watchlistOffset = rotation.watchlist_offset ?? 0;
  const searchOffset = rotation.search_offset ?? 0;

  const watchlistSlice = WATCHLIST.slice(watchlistOffset, watchlistOffset + WATCHLIST_SCAN_LIMIT);
  const searchSlice = SEARCH_QUERIES.slice(searchOffset, searchOffset + SEARCH_QUERY_LIMIT);

  rotation.watchlist_offset = (watchlistOffset + WATCHLIST_SCAN_LIMIT) % WATCHLIST.length;
  rotation.search_offset = (searchOffset + SEARCH_QUERY_LIMIT) % SEARCH_QUERIES.length;
  saveRotation(rotation);

  const workflow_id = "wf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  _activeWorkflowId = workflow_id;
  console.log(`scanner workflow_id=${workflow_id}`);
  await createWorkflow(workflow_id);

  console.log(
    `scanner start activity=${activity.label} interval=${activity.scanner_interval_min}min ` +
    `watchlist_slice=[${watchlistOffset}..${watchlistOffset + watchlistSlice.length - 1}]/${WATCHLIST.length} ` +
    `search_slice=[${searchOffset}..${searchOffset + searchSlice.length - 1}]/${SEARCH_QUERIES.length}`
  );

  await scanWatchlist(watchlistSlice);

  if (!checkScannerCap().allowed) {
    console.warn("scanner: scanner_cap reached after watchlist — skipping search+replies");
  } else {
    await scanSearch(searchSlice);

    if (!checkScannerCap().allowed) {
      console.warn("scanner: scanner_cap reached after search — skipping replies");
    } else {
      await scanIncomingReplies();
    }
  }

  console.log(
    "scanner summary",
    JSON.stringify({
      watchlist_ok: stats.watchlist_ok,
      watchlist_transient: stats.watchlist_transient,
      watchlist_hard: stats.watchlist_hard,
      query_ok: stats.query_ok,
      query_transient: stats.query_transient,
      query_hard: stats.query_hard,
      reply_scan_ok: stats.reply_scan_ok,
      reply_scan_transient: stats.reply_scan_transient,
      reply_scan_hard: stats.reply_scan_hard,
      tweets_stored: stats.tweets_stored,
      replies_stored: stats.replies_stored,
      insert_errors: stats.insert_errors
    })
  );

  recordScanTime();
  console.log("scanner complete");

  await logWorkflowEvent({
    workflow_id,
    trace_id: "tr_" + Math.random().toString(36).slice(2, 9),
    role: "scanner",
    task_type: "analysis",
    input: { accounts_scanned: watchlistSlice.length, queries_scanned: searchSlice.length, activity: activity.label },
    decision: null,
    output: { tweets_stored: stats.tweets_stored, replies_stored: stats.replies_stored, insert_errors: stats.insert_errors },
    status: "done",
  });
  await closeWorkflow(workflow_id, "completed");

  const finalCap = checkScannerCap();
  try {
    await supabase.from("runs").insert([{
      runner: "x_scanner",
      job: "scan",
      status: "ok",
      meta: {
        activity: activity.label,
        tweets_stored: stats.tweets_stored,
        replies_stored: stats.replies_stored,
        watchlist_ok: stats.watchlist_ok,
        query_ok: stats.query_ok,
        insert_errors: stats.insert_errors,
        x_api_calls: stats.x_api_calls,
        x_api_cost_usd: +(stats.x_api_calls * 0.0033).toFixed(4),
        x_api_calls_today: finalCap.callsToday,
        x_api_cost_today_usd: +finalCap.estimatedUsd.toFixed(4),
      },
      error: null,
    }]);
  } catch {}
}

main().catch(async (err) => {
  console.error("scanner fatal", err);
  await closeWorkflow(_activeWorkflowId, "failed");
  try {
    await supabase.from("runs").insert([{
      runner: "x_scanner",
      job: "scan",
      status: "error",
      meta: { fatal: true },
      error: String(err?.message || err),
    }]);
  } catch {}
  process.exit(1);
});
