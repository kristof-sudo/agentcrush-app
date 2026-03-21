import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const DAILY_CAPS = {
  reply: 2,
  quote: 3,
  repost: 2,
  roundup_candidate: 6,
};

const REPLY_DOMAIN_INCLUDE = [
  "agent",
  "agents",
  "ai agent",
  "agentic",
  "automation",
  "automate",
  "workflow",
  "workflows",
  "orchestration",
  "framework",
  "frameworks",
  "tooling",
  "tool",
  "tools",
  "infra",
  "infrastructure",
  "runtime",
  "sdk",
  "api",
  "apis",
  "protocol",
  "llm",
  "model",
  "models",
  "memory",
  "eval",
  "evals",
  "deployment",
  "deploy",
  "observability",
  "langchain",
  "langgraph",
  "crewai",
  "autogpt",
  "openai",
  "anthropic",
  "cursor",
  "claude code",
  "mcp",
  "multi-agent",
  "rag",
];

const REPLY_DOMAIN_EXCLUDE = [
  "job",
  "jobs",
  "hiring",
  "visa",
  "embassy",
  "consulate",
  "passport",
  "interview",
  "resume",
  "cv",
  "salary",
  "tax",
  "mortgage",
  "loan",
  "stocks",
  "stock",
  "etf",
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "bank",
  "flight",
  "hotel",
  "shipping address",
  "invoice",
  "refund",
  "customer support",
  "admin",
  "office",
  "embassy appointment",
];

const WATCHLIST_PRIORITY = new Set([
  "bankrbot",
  "fetch_ai",
  "moltbook",
  "virtuals_io",
  "blockrunai",
  "clawnch_bot",
  "clawiai",
  "openclaw",
  "kellyclaudeai",
  "mattprd",
  "0xsammy",
  "hesamation",
  "jacalulu",
  "langchainai",
  "crewaiinc",
  "openinterpreter",
  "autogpt",
]);

function safeString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function lower(v) {
  return safeString(v).toLowerCase();
}

function startOfDayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function isoHoursAgo(hours) {
  return new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString();
}

function isTooShort(text) {
  return safeString(text).length < 35;
}

function looksSpammy(text) {
  const t = lower(text);
  const bad = [
    "gm",
    "good morning",
    "airdrop",
    "giveaway",
    "follow me",
    "join discord",
    "mint now",
    "whitelist",
  ];
  return bad.some((x) => t.includes(x));
}

function detectSignals(post) {
  const text = lower(post.text_content);
  const signals = {
    launch: false,
    milestone: false,
    funding: false,
    acquisition: false,
    infrastructure: false,
    agent_specific: false,
    strong_watchlist: false,
    roundup_worthy: false,
    reply_worthy: false,
    quote_worthy: false,
    repost_worthy: false,
  };

  const launchWords = [
    "launched",
    "launching",
    "shipping",
    "shipped",
    "announced",
    "new agent",
    "release",
    "released",
    "rolled out",
    "live now",
  ];

  const milestoneWords = [
    "users",
    "revenue",
    "transactions",
    "agents deployed",
    "1m",
    "100k",
    "10k",
    "growth",
    "milestone",
  ];

  const fundingWords = [
    "raised",
    "funding",
    "seed round",
    "series a",
    "backed by",
  ];

  const acquisitionWords = [
    "acquired",
    "acquisition",
    "bought by",
    "merged with",
  ];

  const infraWords = [
    "framework",
    "sdk",
    "agent protocol",
    "tool use",
    "orchestration",
    "workflow",
    "runtime",
    "multi-agent",
  ];

  const agentWords = [
    "agent",
    "autonomous",
    "openclaw",
    "crewai",
    "langgraph",
    "autogpt",
    "claude code",
    "cursor",
  ];

  signals.launch = launchWords.some((w) => text.includes(w));
  signals.milestone = milestoneWords.some((w) => text.includes(w));
  signals.funding = fundingWords.some((w) => text.includes(w));
  signals.acquisition = acquisitionWords.some((w) => text.includes(w));
  signals.infrastructure = infraWords.some((w) => text.includes(w));
  signals.agent_specific = agentWords.some((w) => text.includes(w));
  signals.strong_watchlist = WATCHLIST_PRIORITY.has(lower(post.author_handle));

  signals.roundup_worthy =
    signals.launch ||
    signals.milestone ||
    signals.funding ||
    signals.acquisition ||
    signals.infrastructure ||
    (signals.agent_specific && (post.like_count || 0) >= 3) ||
    signals.strong_watchlist;

  signals.repost_worthy =
    signals.strong_watchlist &&
    !signals.funding &&
    !signals.acquisition &&
    (Number(post.like_count || 0) >= 8 || Number(post.repost_count || 0) >= 3);

  signals.quote_worthy =
    signals.roundup_worthy ||
    (signals.strong_watchlist && (post.like_count || 0) >= 5);

  signals.reply_worthy =
    !signals.roundup_worthy &&
    signals.agent_specific &&
    !looksSpammy(text);

  return signals;
}

function computeScore(post, signals) {
  let score = 0;

  if (signals.strong_watchlist) score += 4;
  if (signals.launch) score += 4;
  if (signals.milestone) score += 3;
  if (signals.acquisition) score += 5;
  if (signals.funding) score += 3;
  if (signals.infrastructure) score += 2;
  if (signals.agent_specific) score += 2;

  score += Math.min(Number(post.like_count || 0), 20) * 0.15;
  score += Math.min(Number(post.repost_count || 0), 20) * 0.2;
  score += Math.min(Number(post.reply_count || 0), 20) * 0.1;

  if (isTooShort(post.text_content)) score -= 2;
  if (looksSpammy(post.text_content)) score -= 5;

  return score;
}

async function getTodayCounts() {
  const startOfDay = startOfDayUTC();
  const replyWindowStart = isoHoursAgo(24);

  const [dayRes, replyRes] = await Promise.all([
    supabase
      .from("interaction_jobs")
      .select("action_type")
      .gte("created_at", startOfDay)
      .in("action_type", ["x_quote", "x_repost", "roundup_candidate"]),
    supabase
      .from("interaction_jobs")
      .select("action_type")
      .eq("action_type", "x_reply")
      .gte("created_at", replyWindowStart),
  ]);

  if (dayRes.error) throw dayRes.error;
  if (replyRes.error) throw replyRes.error;

  return {
    reply: (replyRes.data || []).length,
    quote: (dayRes.data || []).filter((row) => safeString(row.action_type) === "x_quote").length,
    repost: (dayRes.data || []).filter((row) => safeString(row.action_type) === "x_repost").length,
    roundup_candidate: (dayRes.data || []).filter((row) => safeString(row.action_type) === "roundup_candidate").length,
  };
}

function normalizeObservedPost(post) {
  return {
    ...post,
    candidate_source: "x_observed_post",
  };
}

function isInDomainReplyTopic(text) {
  const body = lower(text);
  if (!body) return false;

  const hasInclude = REPLY_DOMAIN_INCLUDE.some((term) => body.includes(term));
  if (!hasInclude) return false;

  const hasExclude = REPLY_DOMAIN_EXCLUDE.some((term) => body.includes(term));
  return !hasExclude;
}

function normalizeReplyEvent(event) {
  const metadata = event.metadata || {};
  const text = safeString(metadata.text);

  return {
    id: event.id,
    tweet_id: safeString(metadata.tweet_id),
    text_content: text,
    author_handle: safeString(metadata.author_handle),
    author_name: safeString(metadata.author_handle),
    like_count: 0,
    reply_count: 0,
    repost_count: 0,
    observed_at: event.created_at,
    source_query: "reply_incoming",
    candidate_source: "reply_incoming",
    event_type: safeString(event.event_type),
    metadata,
    domain_in_scope: isInDomainReplyTopic(text),
  };
}

async function fetchCandidates() {
  const [observedRes, replyRes, existingReplyJobsRes] = await Promise.all([
    supabase
      .from("x_observed_posts")
      .select("*")
      .eq("is_processed", false)
      .eq("ignored", false)
      .order("observed_at", { ascending: false })
      .limit(50),
    supabase
      .from("events")
      .select("id, event_type, metadata, created_at")
      .eq("event_type", "reply_incoming")
      .gte("created_at", isoHoursAgo(72))
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("interaction_jobs")
      .select("target_tweet_id")
      .eq("action_type", "x_reply")
      .gte("created_at", isoHoursAgo(72)),
  ]);

  if (observedRes.error) throw observedRes.error;
  if (replyRes.error) throw replyRes.error;
  if (existingReplyJobsRes.error) throw existingReplyJobsRes.error;

  const existingReplyTweetIds = new Set((existingReplyJobsRes.data || []).map((row) => safeString(row.target_tweet_id)).filter(Boolean));
  const observed = (observedRes.data || []).map(normalizeObservedPost);
  const replies = (replyRes.data || [])
    .map(normalizeReplyEvent)
    .filter((event) => !existingReplyTweetIds.has(event.tweet_id))
    .filter((event) => event.metadata?.is_question === true)
    .filter((event) => event.domain_in_scope === true);
  return [...replies, ...observed].sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());
}

async function insertInteractionJob(post, actionType, contextSummary) {
  const payload = {
    action_type: actionType,
    status: "queued",
    source_observed_post_id: post.candidate_source === "x_observed_post" ? post.id : null,
    target_tweet_id: post.tweet_id,
    target_author_handle: post.author_handle,
    target_author_name: post.author_name,
    target_text: post.text_content,
    context_summary: contextSummary,
  };

  const { error } = await supabase.from("interaction_jobs").insert([payload]);
  if (error) throw error;
}

async function insertCopydeskJob(post, jobType, contextSummary) {
  const context = {
    target_author: post.author_handle,
    target_text: post.text_content,
    context_summary: contextSummary,
    source_tweet_id: post.tweet_id,
    source_type: post.source_query || "",
  };

  const payload = {
    job_type: jobType,
    status: "queued",
    priority: 50,
    subject_type: post.candidate_source === "reply_incoming" ? "event" : "x_observed_post",
    subject_id: post.id,
    context,
    max_chars: jobType === "x_quote" ? 260 : 220,
    schema_version: 1,
  };

  const { error } = await supabase.from("copydesk_jobs").insert([payload]);
  if (error) throw error;
}

async function insertScheduledRepost(post, contextSummary) {
  const runAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const payload = {
    type: "x_repost",
    target_tweet_id: post.tweet_id,
    source_observed_post_id: post.id,
    target_author_handle: post.author_handle,
    target_author_name: post.author_name,
    target_text: post.text_content,
    context_summary: contextSummary,
    text: "",
  };

  const { error } = await supabase.from("scheduled_posts").insert([{
    channel: "x",
    status: "queued",
    run_at: runAt,
    payload,
    approved: false,
    publish_ready: false,
  }]);

  if (error) throw error;
}

async function markPostProcessed(postId, patch = {}) {
  const { error } = await supabase
    .from("x_observed_posts")
    .update({
      is_processed: true,
      used_for_job: patch.used_for_job ?? false,
      ignored: patch.ignored ?? false,
      relevance_score: patch.relevance_score ?? null,
    })
    .eq("id", postId);

  if (error) throw error;
}

async function finalizeCandidate(post, patch = {}) {
  if (post.candidate_source !== "x_observed_post") return;
  await markPostProcessed(post.id, patch);
}

async function logRun(status, meta = {}, error = null) {
  try {
    await supabase.from("runs").insert([{
      runner: "x_selector",
      job: "tick",
      status,
      meta,
      error,
    }]);
  } catch {
    // ignore log failures
  }
}

function summarizeContext(post, signals, score) {
  const parts = [];

  if (signals.launch) parts.push("possible launch/update");
  if (signals.milestone) parts.push("milestone signal");
  if (signals.acquisition) parts.push("acquisition signal");
  if (signals.funding) parts.push("funding signal");
  if (signals.infrastructure) parts.push("infrastructure/framework angle");
  if (signals.strong_watchlist) parts.push("watchlist account");
  if (signals.repost_worthy) parts.push("repost candidate");
  if (post.candidate_source === "reply_incoming") parts.push("incoming reply question");
  if (post.candidate_source === "reply_incoming" && post.domain_in_scope) parts.push("in-domain reply topic");
  parts.push(`score=${score.toFixed(1)}`);

  return parts.join("; ");
}

async function main() {
  const todayCounts = await getTodayCounts();
  const candidates = await fetchCandidates();

  if (!candidates.length) {
    await logRun("ok", { msg: "no_candidates" });
    return;
  }

  let processed = 0;
  let queuedReply = 0;
  let queuedQuote = 0;
  let queuedRepost = 0;
  let markedRoundup = 0;
  let ignored = 0;

  const ignoredReasons = {
    too_short_or_spam: 0,
    below_action_threshold: 0,
    daily_cap_blocked: 0,
    reply_requirements_not_met: 0,
  };

  const selectedSamples = [];

  for (const post of candidates) {
    try {
      const text = safeString(post.text_content);

      if (!text || isTooShort(text) || looksSpammy(text)) {
        await finalizeCandidate(post, {
          ignored: true,
          used_for_job: false,
          relevance_score: 0,
        });
        ignored += 1;
        ignoredReasons.too_short_or_spam += 1;
        continue;
      }

      const signals = detectSignals(post);
      const replyEventType = safeString(post.event_type);
      const isReplyQuestion = post.candidate_source === "reply_incoming" && post.metadata?.is_question === true;
      const isInDomainReply = post.candidate_source === "reply_incoming" && post.domain_in_scope === true;

      if (post.candidate_source === "reply_incoming") {
        signals.roundup_worthy = false;
        signals.quote_worthy = false;
        signals.repost_worthy = false;
        signals.reply_worthy = replyEventType === "reply_incoming" && isReplyQuestion && isInDomainReply && !looksSpammy(text);
      }
      const score = computeScore(post, signals);
      const contextSummary = summarizeContext(post, signals, score);

      if (
        signals.roundup_worthy &&
        todayCounts.roundup_candidate < DAILY_CAPS.roundup_candidate
      ) {
        await insertInteractionJob(post, "roundup_candidate", contextSummary);
        await finalizeCandidate(post, {
          ignored: false,
          used_for_job: true,
          relevance_score: score,
        });
        todayCounts.roundup_candidate += 1;
        markedRoundup += 1;
        processed += 1;

        if (selectedSamples.length < 5) {
          selectedSamples.push({
            post_id: post.id,
            handle: post.author_handle,
            action: "roundup_candidate",
            score,
          });
        }
        continue;
      }

      if (
        signals.repost_worthy &&
        todayCounts.repost < DAILY_CAPS.repost
      ) {
        await insertInteractionJob(post, "x_repost", contextSummary);
        await insertScheduledRepost(post, contextSummary);
        await finalizeCandidate(post, {
          ignored: false,
          used_for_job: true,
          relevance_score: score,
        });
        todayCounts.repost += 1;
        queuedRepost += 1;
        processed += 1;

        if (selectedSamples.length < 5) {
          selectedSamples.push({
            post_id: post.id,
            handle: post.author_handle,
            action: "x_repost",
            score,
          });
        }
        continue;
      }

      if (
        signals.quote_worthy &&
        todayCounts.quote < DAILY_CAPS.quote
      ) {
        await insertInteractionJob(post, "x_quote", contextSummary);
        await insertCopydeskJob(post, "x_quote", contextSummary);
        await finalizeCandidate(post, {
          ignored: false,
          used_for_job: true,
          relevance_score: score,
        });
        todayCounts.quote += 1;
        queuedQuote += 1;
        processed += 1;

        if (selectedSamples.length < 5) {
          selectedSamples.push({
            post_id: post.id,
            handle: post.author_handle,
            action: "x_quote",
            score,
          });
        }
        continue;
      }

      if (
        signals.reply_worthy &&
        todayCounts.reply < DAILY_CAPS.reply
      ) {
        await insertInteractionJob(post, "x_reply", contextSummary);
        await insertCopydeskJob(post, "x_reply", contextSummary);
        await finalizeCandidate(post, {
          ignored: false,
          used_for_job: true,
          relevance_score: score,
        });
        todayCounts.reply += 1;
        queuedReply += 1;
        processed += 1;

        if (replyResult.queued) {
          queuedReply += 1;
          processed += 1;
          continue;
        }

        ignored += 1;
        ignoredReasons[replyResult.reason] += 1;
        continue;
      }

      const replyRequirementsMissed =
        post.candidate_source === "reply_incoming" && !signals.reply_worthy;

      const capBlocked =
        (signals.roundup_worthy && todayCounts.roundup_candidate >= DAILY_CAPS.roundup_candidate) ||
        (signals.repost_worthy && todayCounts.repost >= DAILY_CAPS.repost) ||
        (signals.quote_worthy && todayCounts.quote >= DAILY_CAPS.quote);

      await finalizeCandidate(post, {
        ignored: true,
        used_for_job: false,
        relevance_score: score,
      });
      ignored += 1;

      if (capBlocked) {
        ignoredReasons.daily_cap_blocked += 1;
      } else if (replyRequirementsMissed) {
        ignoredReasons.reply_requirements_not_met += 1;
      } else {
        ignoredReasons.below_action_threshold += 1;
      }
    } catch (e) {
      await logRun("error", { post_id: post.id }, String(e?.message || e));
      continue;
    }
  }

  await logRun("ok", {
    processed,
    queuedReply,
    queuedQuote,
    queuedRepost,
    markedRoundup,
    ignored,
    ignoredReasons,
    selectedSamples,
    candidatesFetched: candidates.length,
    todayCounts,
  });
}

main().catch(async (e) => {
  await logRun("error", { fatal: true }, String(e?.message || e));
  process.exit(1);
});
