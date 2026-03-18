import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

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

const X_API = "https://api.twitter.com/2";
const USER_CACHE_PATH = "/opt/agentcrush/scanner/watchlist-user-cache.json";

const WATCHLIST = [
  "bankrbot",
  "moltbook",
  "openclaw",
  "KellyClaudeAI",
  "LangChainAI",
  "crewAIInc",
  "OpenInterpreter",
  "AutoGPT"
];

const SEARCH_QUERIES = [
  '"AI agent launch"',
  '"agent framework"',
  '"agent protocol"',
  '"multi agent system"'
];

const stats = {
  watchlist_ok: 0,
  watchlist_transient: 0,
  watchlist_hard: 0,
  query_ok: 0,
  query_transient: 0,
  query_hard: 0,
  tweets_stored: 0,
  insert_errors: 0
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

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${X_BEARER_TOKEN}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new XApiError(res.status, text);
  }

  return res.json();
}

async function storeTweet(tweet, sourceType, source) {
  const payload = {
    tweet_id: tweet.id,
    text_content: tweet.text,
    author_handle: null,
    author_name: null,
    like_count: tweet.public_metrics?.like_count ?? 0,
    reply_count: tweet.public_metrics?.reply_count ?? 0,
    repost_count: tweet.public_metrics?.retweet_count ?? 0,
    observed_at: new Date().toISOString(),
    source_query: source,
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

async function scanWatchlist() {
  const cache = loadUserCache();

  for (const username of WATCHLIST) {
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

      for (const tweet of tweets.data) {
        await storeTweet(tweet, "watchlist", username);
      }

      stats.watchlist_ok += 1;
      console.log(`scanner: watchlist ${username} ok`);
    } catch (err) {
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

async function scanSearch() {
  for (const q of SEARCH_QUERIES) {
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

async function main() {
  console.log("scanner start");

  await scanWatchlist();
  await scanSearch();

  console.log(
    "scanner summary",
    JSON.stringify({
      watchlist_ok: stats.watchlist_ok,
      watchlist_transient: stats.watchlist_transient,
      watchlist_hard: stats.watchlist_hard,
      query_ok: stats.query_ok,
      query_transient: stats.query_transient,
      query_hard: stats.query_hard,
      tweets_stored: stats.tweets_stored,
      insert_errors: stats.insert_errors
    })
  );

  console.log("scanner complete");
}

main().catch(err => {
  console.error("scanner fatal", err);
  process.exit(1);
});
