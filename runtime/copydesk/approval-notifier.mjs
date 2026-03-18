import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  APPROVAL_TOKEN_SECRET = "change_me",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function tgSend(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
  return String(data.result.message_id);
}

function makeToken(postId) {
  const raw = `${postId}:${Date.now()}:${APPROVAL_TOKEN_SECRET}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 10).toUpperCase();
}

async function logRun(status, meta = {}, error = null) {
  await supabase.from("runs").insert([{
    runner: "approval_notifier",
    job: "notify_for_approval",
    status,
    meta,
    error,
  }]);
}

function buildPreview(payload) {
  const type = String(payload?.type || "x_post");

  if (type === "x_repost") {
    const handle = String(payload?.target_author_handle || "").trim();
    const text = String(payload?.target_text || "").trim();
    const tweetId = String(payload?.target_tweet_id || "").trim();

    return [
      handle ? `Repost target: @${handle.replace(/^@/, "")}` : "Repost target: unknown",
      tweetId ? `Target Tweet ID: ${tweetId}` : "Target Tweet ID: unknown",
      "",
      "Target text:",
      `"${text || "—"}"`,
    ].join("\n");
  }

  const text = String(payload?.text || "").trim();
  return `Post:\n"${text}"`;
}

async function main() {
  const { data: posts, error } = await supabase
    .from("scheduled_posts")
    .select("id, run_at, payload, approved, approval_requested_at")
    .eq("channel", "x")
    .eq("status", "queued")
    .eq("approved", false)
    .is("approval_requested_at", null)
    .order("run_at", { ascending: true })
    .limit(1);

  if (error) throw error;

  const p = posts?.[0];
  if (!p) {
    await logRun("ok", { msg: "no_posts_to_notify" });
    return;
  }

  const token = makeToken(p.id);
  const type = String(p.payload?.type || "x_post");

  const label =
    type === "x_quote" ? "AgentCrush X quote awaiting approval" :
    type === "x_reply" ? "AgentCrush X reply awaiting approval" :
    type === "x_repost" ? "AgentCrush X repost awaiting approval" :
    "AgentCrush X post awaiting approval";

  const preview = buildPreview(p.payload || {});

  const msg =
`${label}

Token: ${token}
Scheduled (UTC): ${p.run_at}

${preview}

Reply with:
APPROVE ${token}
or
REJECT ${token}`;

  const messageId = await tgSend(msg);

  const { error: uErr } = await supabase
    .from("scheduled_posts")
    .update({
      approval_token: token,
      approval_requested_at: new Date().toISOString(),
      approval_message_id: messageId,
    })
    .eq("id", p.id);

  if (uErr) throw uErr;

  await logRun("ok", { scheduled_post_id: p.id, token, message_id: messageId, type });
}

main().catch(async (e) => {
  try { await logRun("error", { fatal: true }, String(e?.message || e)); } catch {}
  process.exit(1);
});
