import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

async function publishTweet(text, opts = {}) {
  const url = "https://api.x.com/2/tweets";
  const bodyObj = { text };
  if (opts.quoteTweetId) bodyObj.quote_tweet_id = opts.quoteTweetId;
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
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${raw}`);
  }

  const data = JSON.parse(raw);
  return data?.data?.id || null;
}

async function repostTweet(targetTweetId) {
  const url = "https://api.x.com/2/users/me/retweets";
  const body = JSON.stringify({ tweet_id: targetTweetId });

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
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${raw}`);
  }

  return true;
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

async function main() {
  const nowIso = new Date().toISOString();

  await cancelStaleQueuedPosts();

  const freshnessCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error } = await supabase
    .from("scheduled_posts")
    .select("id, payload, run_at, approved, publish_ready, status, approval_token, approval_requested_at, approved_at, approved_by")
    .eq("channel", "x")
    .eq("status", "queued")
    .eq("approved", true)
    .eq("publish_ready", true)
    .not("approval_token", "is", null)
    .not("approval_requested_at", "is", null)
    .gte("approval_requested_at", freshnessCutoff)
    .lte("run_at", nowIso)
    .order("run_at", { ascending: true })
    .limit(1);

  if (error) throw error;

  const post = posts?.[0];
  if (!post) {
    await logRun("ok", { msg: "no_publishable_posts" });
    return;
  }

  if (!post.approved_at || post.approved_by !== "telegram") {
    await logRun("ok", {
      msg: "post_not_publishable_after_safety_check",
      scheduled_post_id: post.id,
    });
    return;
  }

  const type = String(post.payload?.type || "x_post");

  if (type === "x_repost") {
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

    await repostTweet(targetTweetId);

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
    ? String(post.payload?.target_tweet_id || "").trim() || null
    : null;

  const tweetId = await publishTweet(text, quoteTweetId ? { quoteTweetId } : {});

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
    action: type,
    external_post_id: tweetId,
  });
}

main().catch(async (e) => {
  console.error("X PUBLISHER ERROR:", e);
  await logRun("error", { fatal: true }, String(e?.message || e));
  process.exit(1);
});
