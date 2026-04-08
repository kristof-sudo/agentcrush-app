import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { checkXApiCap, recordXApiCalls } from "../state/x-api-cost.mjs";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  X_CONSUMER_KEY,
  X_CONSUMER_SECRET,
  X_ACCESS_TOKEN,
  X_ACCESS_TOKEN_SECRET,
} = process.env;

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

requireEnv("SUPABASE_URL", SUPABASE_URL);
requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
requireEnv("X_CONSUMER_KEY", X_CONSUMER_KEY);
requireEnv("X_CONSUMER_SECRET", X_CONSUMER_SECRET);
requireEnv("X_ACCESS_TOKEN", X_ACCESS_TOKEN);
requireEnv("X_ACCESS_TOKEN_SECRET", X_ACCESS_TOKEN_SECRET);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function enc(str) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthHeader({ method, url, consumerKey, consumerSecret, token, tokenSecret }) {
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauth)
    .sort()
    .map(k => `${enc(k)}=${enc(oauth[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    enc(url),
    enc(paramString),
  ].join("&");

  const signingKey = `${enc(consumerSecret)}&${enc(tokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauth.oauth_signature = signature;

  const header = "OAuth " + Object.keys(oauth)
    .sort()
    .map(k => `${enc(k)}="${enc(oauth[k])}"`)
    .join(", ");

  return header;
}

async function logRun(status, meta = {}, error = null) {
  try {
    await supabase.from("runs").insert([{
      runner: "x_publisher",
      job: "publish",
      status,
      meta,
      error,
    }]);
  } catch {}
}

async function publishTweet(text, { quoteTweetId = null, inReplyToTweetId = null } = {}) {
  const url = "https://api.x.com/2/tweets";
  const bodyObj = { text };
  if (quoteTweetId) bodyObj.quote_tweet_id = String(quoteTweetId);
  if (inReplyToTweetId) bodyObj.reply = { in_reply_to_tweet_id: String(inReplyToTweetId) };
  const body = JSON.stringify(bodyObj);

  const auth = oauthHeader({
    method: "POST",
    url,
    consumerKey: X_CONSUMER_KEY,
    consumerSecret: X_CONSUMER_SECRET,
    token: X_ACCESS_TOKEN,
    tokenSecret: X_ACCESS_TOKEN_SECRET,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body,
  });

  const raw = await res.text();
  // Record the call before throwing — the HTTP request was made regardless of outcome
  recordXApiCalls(1);
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${raw}`);
  }

  const data = JSON.parse(raw);
  return data?.data?.id || null;
}

function extractUserId(accessToken) {
  // OAuth 1.0a access tokens are formatted as "{userId}-{randomHex}"
  const part = String(accessToken || "").split("-")[0];
  if (!part || !/^\d+$/.test(part)) throw new Error(`Cannot extract user ID from access token`);
  return part;
}

async function repostTweet(targetTweetId) {
  // v2 retweet endpoint — OAuth 1.0a, same credentials, no v1.1 plan restriction
  const userId = extractUserId(X_ACCESS_TOKEN);
  const url = `https://api.twitter.com/2/users/${userId}/retweets`;

  const auth = oauthHeader({
    method: "POST",
    url,
    consumerKey: X_CONSUMER_KEY,
    consumerSecret: X_CONSUMER_SECRET,
    token: X_ACCESS_TOKEN,
    tokenSecret: X_ACCESS_TOKEN_SECRET,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tweet_id: String(targetTweetId) }),
  });

  const raw = await res.text();
  recordXApiCalls(1); // record before throw — HTTP request was made
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${raw}`);
  }

  return true;
}

function startOfDayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

async function likeTweet(tweetId) {
  const userId = extractUserId(X_ACCESS_TOKEN);
  const url = `https://api.twitter.com/2/users/${userId}/likes`;

  const auth = oauthHeader({
    method: "POST",
    url,
    consumerKey: X_CONSUMER_KEY,
    consumerSecret: X_CONSUMER_SECRET,
    token: X_ACCESS_TOKEN,
    tokenSecret: X_ACCESS_TOKEN_SECRET,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tweet_id: String(tweetId) }),
  });

  const raw = await res.text();
  recordXApiCalls(1); // record before throw — HTTP request was made
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${raw}`);
  }

  return true;
}

async function processLikes() {
  const todayStart = startOfDayUTC();
  const nowIso = new Date().toISOString();

  // Count likes already sent today
  const { data: sentToday } = await supabase
    .from("scheduled_posts")
    .select("id")
    .eq("channel", "x")
    .eq("status", "sent")
    .contains("payload", { type: "x_like" })
    .gte("sent_at", todayStart);

  const alreadySentToday = (sentToday || []).length;
  const DAILY_LIKE_CAP = 30;
  const remaining = DAILY_LIKE_CAP - alreadySentToday;

  if (remaining <= 0) {
    console.log(`x-publisher: like cap reached (${alreadySentToday}/${DAILY_LIKE_CAP})`);
    return;
  }

  const { data: pending } = await supabase
    .from("scheduled_posts")
    .select("id, payload")
    .eq("channel", "x")
    .eq("status", "queued")
    .eq("approved", true)
    .eq("publish_ready", true)
    .contains("payload", { type: "x_like" })
    .lte("run_at", nowIso)
    .order("run_at", { ascending: true })
    .limit(remaining);

  for (const post of pending || []) {
    const tweetId = String(post.payload?.target_tweet_id || "").trim();
    if (!tweetId) {
      await supabase
        .from("scheduled_posts")
        .update({ status: "failed", error: "missing_target_tweet_id" })
        .eq("id", post.id);
      continue;
    }

    try {
      await likeTweet(tweetId);
      await supabase
        .from("scheduled_posts")
        .update({ status: "sent", sent_at: nowIso, error: null })
        .eq("id", post.id);
      console.log(`x-publisher: liked tweet ${tweetId}`);
    } catch (err) {
      const msg = String(err?.message || err);
      const isPermanent = /X API (400|401|403|404|422)/.test(msg);
      await supabase
        .from("scheduled_posts")
        .update({ status: isPermanent ? "failed" : "queued", error: msg.slice(0, 500) })
        .eq("id", post.id);
      console.error(`x-publisher: like error for ${tweetId}`, msg);
    }
  }
}

async function cancelStaleQueuedPosts() {
  const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("scheduled_posts")
    .update({
      status: "cancelled",
      publish_ready: false,
      error: "stale_queue_auto_cancelled",
    })
    .eq("channel", "x")
    .eq("status", "queued")
    .lt("run_at", staleCutoff);

  if (error) {
    console.error("STALE QUEUE CLEANUP ERROR:", error);
  }
}

/**
 * Process x_repost posts inserted directly by the selector.
 * These never go through the approval-notifier flow, so they have no approval_token
 * or approved_at. They are pre-approved (approved=true, publish_ready=true) and
 * must be handled via a separate query path — the main query's token filters exclude them.
 */
async function processReposts() {
  const nowIso = new Date().toISOString();

  const { data: pending } = await supabase
    .from("scheduled_posts")
    .select("id, payload")
    .eq("channel", "x")
    .eq("status", "queued")
    .eq("approved", true)
    .eq("publish_ready", true)
    .is("approval_token", null)
    .contains("payload", { type: "x_repost" })
    .lte("run_at", nowIso)
    .order("run_at", { ascending: true })
    .limit(5);

  for (const post of pending || []) {
    const capNow = checkXApiCap();
    if (!capNow.allowed) {
      console.log(`x-publisher: x_api_cap_reached during repost processing (usd=${capNow.estimatedUsd.toFixed(3)})`);
      return;
    }

    const targetTweetId = String(post.payload?.target_tweet_id || "").trim();
    if (!targetTweetId) {
      await supabase.from("scheduled_posts")
        .update({ status: "failed", error: "missing_target_tweet_id" })
        .eq("id", post.id);
      continue;
    }

    try {
      await repostTweet(targetTweetId);
      await supabase.from("scheduled_posts")
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("id", post.id);
      const author = post.payload?.target_author_handle || "?";
      console.log(`x-publisher: reposted tweet ${targetTweetId} by @${author}`);
      await logRun("ok", {
        scheduled_post_id: post.id,
        action: "x_repost",
        target_tweet_id: targetTweetId,
        target_author: author,
      });
    } catch (err) {
      const msg = String(err?.message || err);
      const isPermanent = /X API (400|401|403|404|422)/.test(msg);
      await supabase.from("scheduled_posts")
        .update({ status: isPermanent ? "failed" : "queued", error: msg.slice(0, 500) })
        .eq("id", post.id);
      console.error(`x-publisher: repost error for ${targetTweetId}`, msg);
    }
  }
}

async function alertCapReachedOnce() {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  try {
    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("code", "x_api_cap_reached")
      .gte("created_at", todayStart.toISOString())
      .limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from("alerts").insert([{
        severity: "warning",
        code: "x_api_cap_reached",
        message: "X API daily cost cap reached — publishing paused until midnight UTC",
        meta: {},
      }]);
    }
  } catch {}
}

async function main() {
  const capCheck = checkXApiCap();
  if (!capCheck.allowed) {
    console.warn(
      `x-publisher skip: x_api_cap_reached estimated_usd=${capCheck.estimatedUsd.toFixed(3)} calls=${capCheck.callsToday}`
    );
    await alertCapReachedOnce();
    await logRun("skipped", { reason: "x_api_cap", x_api_cost_usd: capCheck.estimatedUsd, x_api_calls: capCheck.callsToday });
    return;
  }

  const nowIso = new Date().toISOString();

  await cancelStaleQueuedPosts();
  await processLikes();
  await processReposts();

  const { data: posts, error } = await supabase
    .from("scheduled_posts")
    .select("id, payload, run_at, approved, publish_ready, status, approval_token, approval_requested_at, approved_at, approved_by")
    .eq("channel", "x")
    .eq("status", "queued")
    .eq("approved", true)
    .eq("publish_ready", true)
    .not("approval_token", "is", null)
    .not("approved_at", "is", null)
    .lte("run_at", nowIso)
    .order("run_at", { ascending: true })
    .limit(1);

  if (error) throw error;

  const post = posts?.[0];
  if (!post) {
    await logRun("ok", { msg: "no_publishable_posts" });
    return;
  }

  if (!post.approved_at || (post.approved_by !== "telegram" && post.approved_by !== "mission_control")) {
    await logRun("ok", {
      msg: "post_not_publishable_after_safety_check",
      scheduled_post_id: post.id,
    });
    return;
  }

  const type = String(post.payload?.type || "x_post");

  if (type === "x_repost_comment") {
    const commentText = String(post.payload?.text || "").trim();
    const targetTweetId = String(post.payload?.target_tweet_id || "").trim();

    if (!commentText) {
      await supabase.from("scheduled_posts")
        .update({ status: "failed", error: "missing_comment_text" })
        .eq("id", post.id);
      await logRun("error", { scheduled_post_id: post.id }, "missing_comment_text");
      return;
    }

    // Step 1: post commentary as standalone tweet
    let commentTweetId;
    try {
      commentTweetId = await publishTweet(commentText);
    } catch (err) {
      const msg = String(err?.message || err);
      const isPermanent = /X API (400|401|403|404|422)/.test(msg);
      if (isPermanent) {
        await supabase.from("scheduled_posts").update({ status: "failed", error: msg.slice(0, 500) }).eq("id", post.id);
        await logRun("error", { scheduled_post_id: post.id, permanent: true }, msg.slice(0, 500));
        return;
      }
      throw err;
    }

    // Step 2: repost target (non-fatal — commentary already posted)
    if (targetTweetId) {
      try {
        await repostTweet(targetTweetId);
      } catch (err) {
        console.warn(`x-publisher: repost step failed for x_repost_comment ${post.id} — commentary posted, repost skipped:`, String(err?.message || err).slice(0, 200));
      }
    }

    await supabase.from("scheduled_posts")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .eq("id", post.id);

    const pubCap2 = checkXApiCap();
    await logRun("ok", {
      scheduled_post_id: post.id,
      action: "x_repost_comment",
      comment_tweet_id: commentTweetId,
      target_tweet_id: targetTweetId || null,
      x_api_calls_today: pubCap2.callsToday,
      x_api_cost_today_usd: +pubCap2.estimatedUsd.toFixed(4),
    });
    console.log(`x-publisher: x_repost_comment posted comment=${commentTweetId} target=${targetTweetId || "none"}`);
    return;
  }

  if (type === "x_repost") {
    // Stale post from a previous pipeline version — selector now generates x_repost_comment instead.
    console.warn(`x-publisher: publishing x_repost (post ${post.id}) — stale post type, selector now uses x_repost_comment`);
    const targetTweetId = String(post.payload?.target_tweet_id || "").trim();

    if (!targetTweetId) {
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          error: "missing_target_tweet_id",
        })
        .eq("id", post.id);

      await logRun("error", { scheduled_post_id: post.id }, "missing_target_tweet_id");
      return;
    }

    try {
      await repostTweet(targetTweetId);
    } catch (repostErr) {
      const msg = String(repostErr?.message || repostErr);
      const isPermanent = /X API (400|401|403|404|422)/.test(msg);
      if (isPermanent) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error: msg.slice(0, 500) })
          .eq("id", post.id);
        await logRun("error", { scheduled_post_id: post.id, permanent: true }, msg.slice(0, 500));
        return;
      }
      throw repostErr;
    }

    const { error: uErr } = await supabase
      .from("scheduled_posts")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", post.id);

    if (uErr) throw uErr;

    await logRun("ok", {
      scheduled_post_id: post.id,
      action: "x_repost",
      target_tweet_id: targetTweetId,
    });
    return;
  }

  const text = String(post.payload?.text || "").trim();
  if (!text) {
    await supabase
      .from("scheduled_posts")
      .update({
        status: "failed",
        error: "missing_payload_text",
      })
      .eq("id", post.id);

    await logRun("error", { scheduled_post_id: post.id }, "missing_payload_text");
    return;
  }

  const quoteTweetId = type === "x_quote"
    ? String(post.payload?.quote_tweet_id || "").trim() || null
    : null;
  const inReplyToTweetId = type === "x_reply"
    ? String(post.payload?.in_reply_to_tweet_id || "").trim() || null
    : null;

  if (type === "x_quote" && !quoteTweetId) {
    await supabase
      .from("scheduled_posts")
      .update({ status: "failed", error: "missing_quote_tweet_id" })
      .eq("id", post.id);
    await logRun("error", { scheduled_post_id: post.id }, "missing_quote_tweet_id");
    return;
  }

  // FAIL-SAFE: x_reply MUST have in_reply_to_tweet_id.
  // If missing, skip — never fall back to a standalone post.
  if (type === "x_reply" && !inReplyToTweetId) {
    await supabase
      .from("scheduled_posts")
      .update({ status: "failed", error: "missing_in_reply_to_tweet_id" })
      .eq("id", post.id);
    await logRun("error", { scheduled_post_id: post.id }, "missing_in_reply_to_tweet_id");
    console.error(`x-publisher: x_reply post ${post.id} has no in_reply_to_tweet_id — marking failed, NOT posting standalone`);
    return;
  }

  let tweetId;
  try {
    tweetId = await publishTweet(text, { quoteTweetId, inReplyToTweetId });
  } catch (publishErr) {
    const msg = String(publishErr?.message || publishErr);
    const isPermanent = /X API (400|401|403|404|422)/.test(msg);
    if (isPermanent) {
      // reply/quote 403 = conversation restricted by X, not a publisher bug — mark skipped
      if (/X API 403/.test(msg) && (type === "x_reply" || type === "x_quote")) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "skipped", error: "conversation_restricted_403" })
          .eq("id", post.id);
        await logRun("ok", { scheduled_post_id: post.id, action: type, skipped: true, reason: "conversation_restricted_403" });
        console.log(`x-publisher: ${type} post ${post.id} skipped — conversation restricted by X`);
        return;
      }
      await supabase
        .from("scheduled_posts")
        .update({ status: "failed", error: msg.slice(0, 500) })
        .eq("id", post.id);
      await logRun("error", { scheduled_post_id: post.id, permanent: true }, msg.slice(0, 500));
      return;
    }
    throw publishErr;
  }

  const { error: uErr } = await supabase
    .from("scheduled_posts")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", post.id);

  if (uErr) throw uErr;

  const pubCap = checkXApiCap();
  const logMeta = {
    scheduled_post_id: post.id,
    action: type,
    external_post_id: tweetId,
    quote_tweet_id: quoteTweetId,
    in_reply_to_tweet_id: inReplyToTweetId,
    x_api_calls: 1,
    x_api_calls_today: pubCap.callsToday,
    x_api_cost_today_usd: +pubCap.estimatedUsd.toFixed(4),
  };

  if (type === "x_reply") {
    // Explicit thread attachment verification log
    const threadAttached = !!inReplyToTweetId && !!tweetId;
    logMeta.reply_thread_attached = threadAttached;
    logMeta.reply_target_tweet_id = inReplyToTweetId;
    logMeta.reply_tweet_id = tweetId;
    if (threadAttached) {
      console.log(`x-publisher: reply posted — target=${inReplyToTweetId} reply=${tweetId} thread_attached=true`);
    } else {
      console.error(`x-publisher: reply WARNING — thread_attached=false target=${inReplyToTweetId} reply=${tweetId}`);
    }
  }

  await logRun("ok", logMeta);
}

main().catch(async (e) => {
  console.error("X PUBLISHER ERROR:", e);
  await logRun("error", { fatal: true }, String(e?.message || e));
  process.exit(1);
});
