/**
 * daily-summary-worker.mjs — 22:00 Budapest daily recap to Telegram.
 *
 * Sends a "DAILY MIKE SUMMARY" message with:
 *   - Action counts (replies, reposts, quotes, originals)
 *   - X spend today
 *   - Last 5 replies (text + link)
 *   - Last 3 quote tweets (text + link)
 *   - Last 3 repost targets (link)
 *
 * Capped at 1 run per UTC day via the runs table.
 * Trigger: cron at 21:00 UTC (= 22:00 Budapest / 23:00 Budapest summer time).
 */

import { createClient } from "@supabase/supabase-js";
import { getCapSummary } from "../state/x-api-cost.mjs";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env");
}
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TG_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

function startOfDayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function todayUTCDateStr() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getBudapestHour() {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Budapest",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date()).find(p => p.type === "hour")?.value ?? "0",
    10
  );
}

async function logRun(status, meta = {}, error = null) {
  try {
    await supabase.from("runs").insert([{
      runner: "daily_summary",
      job: "daily",
      status,
      meta,
      error,
    }]);
  } catch {}
}

async function checkDailyRunCap() {
  const since = startOfDayUTC();
  const { count } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true })
    .eq("runner", "daily_summary")
    .eq("status", "ok")
    .gte("created_at", since);
  return Number(count || 0);
}

async function sendTelegramMessage(text) {
  const body = { chat_id: TELEGRAM_CHAT_ID, text: String(text).slice(0, 4000) };
  const res = await fetch(`${TG_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Telegram API ${res.status}: ${raw}`);
  }
}

/**
 * Build a Map<scheduled_post_id, external_post_id> from today's publisher run logs.
 * Used to construct links to Mike's actual posted tweets.
 */
async function getPublishedTweetIds() {
  const since = startOfDayUTC();
  const { data: runs } = await supabase
    .from("runs")
    .select("meta")
    .eq("runner", "x_publisher")
    .eq("status", "ok")
    .gte("created_at", since);

  const map = new Map();
  for (const r of runs || []) {
    const { scheduled_post_id, external_post_id } = r.meta || {};
    if (scheduled_post_id && external_post_id) {
      map.set(String(scheduled_post_id), String(external_post_id));
    }
  }
  return map;
}

function tweetLink(tweetId) {
  return tweetId ? `https://x.com/i/web/status/${tweetId}` : null;
}

function clip(text, max = 120) {
  const s = String(text || "").trim();
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

async function buildSummary() {
  const since = startOfDayUTC();

  // Fetch all sent posts today
  const { data: sentPosts } = await supabase
    .from("scheduled_posts")
    .select("id, payload, sent_at")
    .eq("channel", "x")
    .eq("status", "sent")
    .gte("sent_at", since)
    .order("sent_at", { ascending: false });

  const posts = sentPosts || [];
  const publishedIds = await getPublishedTweetIds();

  const replies = posts.filter(p => p.payload?.type === "x_reply");
  const quotes  = posts.filter(p => p.payload?.type === "x_quote" || p.payload?.type === "x_quote_event");
  const reposts = posts.filter(p => p.payload?.type === "x_repost");
  const originals = posts.filter(p => p.payload?.type === "x_post");

  // X API budget split
  const cap = getCapSummary();
  const scannerSpend = cap.scanner_spend_usd.toFixed(3);
  const scannerCapStr = cap.scanner_cap_usd.toFixed(2);
  const scannerRemaining = cap.scanner_remaining_usd.toFixed(3);
  const outputReserved = cap.output_reserved_usd.toFixed(2);
  const scannerStatus = cap.scanner_paused ? " ⚠️ PAUSED" : ` (${scannerRemaining} remaining)`;

  const lines = [];
  lines.push("📊 DAILY MIKE SUMMARY");
  lines.push(`📅 ${todayUTCDateStr()}`);
  lines.push("");
  lines.push("── Action counts ──");
  lines.push(`Replies:   ${replies.length}`);
  lines.push(`Reposts:   ${reposts.length}`);
  lines.push(`Quotes:    ${quotes.length}`);
  lines.push(`Originals: ${originals.length}`);
  lines.push("");
  lines.push("── X API budget ──");
  lines.push(`Scanner:  $${scannerSpend} of $${scannerCapStr}${scannerStatus}`);
  lines.push(`Output:   $${outputReserved} reserved`);
  lines.push(`Total cap: $${cap.total_cap_usd.toFixed(2)}`);

  // Last 5 replies
  if (replies.length > 0) {
    lines.push("");
    lines.push("── Last replies ──");
    for (const p of replies.slice(0, 5)) {
      const replyTweetId = publishedIds.get(String(p.id));
      const targetId = p.payload?.in_reply_to_tweet_id;
      const text = clip(p.payload?.text, 100);
      const link = replyTweetId ? tweetLink(replyTweetId) : (targetId ? `→ thread: ${tweetLink(targetId)}` : null);
      lines.push(`• "${text}"`);
      if (link) lines.push(`  ${link}`);
    }
  }

  // Last 3 quotes
  if (quotes.length > 0) {
    lines.push("");
    lines.push("── Last quotes ──");
    for (const p of quotes.slice(0, 3)) {
      const quoteTweetId = publishedIds.get(String(p.id));
      const targetId = p.payload?.quote_tweet_id;
      const text = clip(p.payload?.text, 100);
      const link = quoteTweetId ? tweetLink(quoteTweetId) : (targetId ? `→ quoted: ${tweetLink(targetId)}` : null);
      lines.push(`• "${text}"`);
      if (link) lines.push(`  ${link}`);
    }
  }

  // Last 3 repost targets
  if (reposts.length > 0) {
    lines.push("");
    lines.push("── Last reposts ──");
    for (const p of reposts.slice(0, 3)) {
      const targetId = p.payload?.target_tweet_id;
      const author = p.payload?.target_author_handle ? `@${p.payload.target_author_handle}` : "";
      const link = targetId ? tweetLink(targetId) : null;
      lines.push(`• ${author}${link ? " " + link : ""}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  const hour = getBudapestHour();

  // Only run between 21:00 and 23:59 Budapest — cron fires at 21:00 UTC
  if (hour < 21 || hour > 23) {
    console.log(`daily-summary: Budapest hour=${hour}, outside 21–23 window, skipping`);
    return;
  }

  const runCount = await checkDailyRunCap();
  if (runCount >= 1) {
    console.log(`daily-summary: already ran today (${runCount} runs), skipping`);
    return;
  }

  const summary = await buildSummary();
  await sendTelegramMessage(summary);
  console.log("daily-summary: sent to Telegram");

  await logRun("ok", { date: todayUTCDateStr() });
}

main().catch(async (e) => {
  console.error("DAILY SUMMARY ERROR:", e);
  await logRun("error", { fatal: true }, String(e?.message || e));
  process.exit(1);
});
