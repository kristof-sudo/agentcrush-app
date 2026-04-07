import { createClient } from "@supabase/supabase-js";
import { getActivityLevel } from "../state/activity-level.mjs";
import { checkXApiCap } from "../state/x-api-cost.mjs";

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

// DAILY_CAPS is loaded dynamically from the activity level in main().
// Fallback used only if module fails to load.
// New model: 1 x_post (via canon-enqueuer), 1-2 x_repost_comment, 0 required replies/quotes.
// x_reply only from reply_incoming events (account has been engaged by author).
// x_quote blocked — X restricts quoting until account has conversation history.
const FALLBACK_CAPS = {
  reply: 2,
  repost_comment: 2,
  roundup_candidate: 3,
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
  "llama_index",
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
  "shayenredford",
  "ofirpress",
  "lateinteraction",
  "drjimfan",
  "reach_vb",
  "anthropicai",
  "openai",
  "googledeepmind",
  "e2b_dev",
  "composio_dev",
  "lgramatidev",
  "hermes_agent_ai",
  "nousresearch",
  "cursor_ai",
  "devinai",
  "kimi_moonshot",
]);

const TIER2_ACCOUNTS = new Set([
  "huggingface",
  "llamaindex",
  "replicate",
  "weights_biases",
  "heliconeai",
  "dstack_ai",
  "griptape_ai",
  "fixie_ai",
  "modal_labs",
  "mlflow",
  "pinecone",
  "googledeepmind",
  "mistralai",
  "a16z",
  "aiatmeta",
  "digitalocean",
  "nvidiagtc",
  "nvidiaadev",
  "github",
  "cloudflare",
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

function rollingHoursAgoISO(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
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

function countMatches(text, words) {
  return words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function metadataBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return false;
}

function isReplyQuestion(post) {
  const metadata = parseMetadata(post.metadata);
  return lower(post.event_type) === "reply_incoming" && metadataBool(metadata.is_question);
}

function isInDomainReply(post) {
  const text = lower(post.text_content);
  const topic = lower(post.topic);
  const haystack = `${text} ${topic}`.trim();

  if (!haystack) return false;

  const strongTerms = [
    "ai agent",
    "ai agents",
    "agent",
    "agents",
    "agentic",
    "automation",
    "automations",
    "workflow",
    "workflows",
    "orchestration",
    "framework",
    "frameworks",
    "tooling",
    "infra",
    "infrastructure",
    "runtime",
    "sdk",
    "protocol",
    "tool use",
    "tool calling",
    "memory",
    "multi-agent",
    "browser use",
    "claude code",
    "cursor",
    "langchain",
    "langgraph",
    "crewai",
    "autogpt",
    "openclaw",
    "manus",
    "operator",
    "operators",
  ];

  const offDomainTerms = [
    "job",
    "jobs",
    "hiring",
    "salary",
    "visa",
    "embassy",
    "passport",
    "invoice",
    "tax",
    "admin",
    "bookkeeping",
    "mortgage",
    "stocks",
    "crypto price",
    "flight",
    "restaurant",
  ];

  const hasStrongSignal = strongTerms.some((term) => haystack.includes(term));
  const hasOffDomainSignal = offDomainTerms.some((term) => haystack.includes(term));

  return hasStrongSignal && !hasOffDomainSignal;
}
function classifyTopic(text) {
  const t = lower(text);
  if (["launched", "shipping", "shipped", "release", "released", "new version", "live now", "announcing"].some(w => t.includes(w))) return "launch";
  if (["raised", "funding", "seed round", "series a", "series b", "backed by", "investment"].some(w => t.includes(w))) return "funding";
  if (["framework", "sdk", "library", "runtime", "protocol", "tool use", "orchestration"].some(w => t.includes(w))) return "framework";
  if (["benchmark", "beats", "outperforms", "compared to", "evaluation", "state of the art", "sota"].some(w => t.includes(w))) return "benchmark";
  return "opinion";
}

function looksLikeMemeOrSpam(text) {
  const t = lower(text);
  const memeWords = ["gm ", "gn ", "wagmi", "ngmi", "degen", "wen moon", "ser ", "fren ", "alpha leak", "based and", "kek", "cope", "seethe"];
  const cryptoSpam = ["buy now", "100x", "pump", "to the moon", "ath", "aping", "presale", "rugpull", "honeypot", "dyor"];
  return memeWords.some(w => t.includes(w)) || cryptoSpam.some(w => t.includes(w));
}

function detectsMike(text) {
  const t = lower(text);
  return t.includes("@mikematsh") || t.includes("mikematsh");
}

function isDisagreement(text) {
  const t = lower(text);
  const disagreeWords = [
    "disagree", "wrong about", "not true", "incorrect", "actually,", "actually no",
    "counterpoint", "pushback", "you're wrong", "that's wrong", "that is wrong",
    "i don't think", "i disagree", "bad take", "hot take but", "unpopular opinion",
    "respectfully no", "this is wrong", "no, actually",
  ];
  return disagreeWords.some(w => t.includes(w));
}

function detectSignals(post) {
  const text = lower(post.text_content);
  const sourceQuery = safeString(post.source_query);
  const signals = {
    launch: false,
    milestone: false,
    funding: false,
    acquisition: false,
    infrastructure: false,
    agent_specific: false,
    strong_watchlist: false,
    tier2_source: false,
    dense_signal: false,
    external_embedding: false,
    roundup_worthy: false,
    reply_worthy: false,
    quote_worthy: false,
    repost_worthy: false,
    meme_or_spam: false,
    mentions_mike: false,
    is_disagreement: false,
    topic_classification: "opinion",
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
    "langchain",
    "autogpt",
    "claude code",
    "cursor",
    "browser use",
    "manus",
    "operators",
    "tool calling",
    "memory",
  ];

  signals.launch = launchWords.some((w) => text.includes(w));
  signals.milestone = milestoneWords.some((w) => text.includes(w));
  signals.funding = fundingWords.some((w) => text.includes(w));
  signals.acquisition = acquisitionWords.some((w) => text.includes(w));
  signals.infrastructure = infraWords.some((w) => text.includes(w));
  signals.agent_specific = agentWords.some((w) => text.includes(w));
  signals.strong_watchlist = WATCHLIST_PRIORITY.has(lower(post.author_handle)) ||
    sourceQuery.startsWith("watchlist_tier1") ||
    WATCHLIST_PRIORITY.has(lower(sourceQuery));
  signals.tier2_source = TIER2_ACCOUNTS.has(lower(post.author_handle)) ||
    sourceQuery.startsWith("watchlist_tier2") ||
    TIER2_ACCOUNTS.has(lower(sourceQuery));
  signals.meme_or_spam = looksLikeMemeOrSpam(text);
  signals.topic_classification = classifyTopic(text);
  signals.mentions_mike = detectsMike(post.text_content);
  signals.is_disagreement = isDisagreement(post.text_content);
  const matchedSignalCount = [
    signals.launch,
    signals.milestone,
    signals.funding,
    signals.acquisition,
    signals.infrastructure,
    signals.agent_specific,
  ].filter(Boolean).length;
  const namedEntityCount = countMatches(text, [
    "openclaw",
    "crewai",
    "langgraph",
    "langchain",
    "autogpt",
    "claude code",
    "cursor",
    "browser use",
    "manus",
  ]);

  signals.dense_signal = matchedSignalCount >= 2 || namedEntityCount >= 2;
  signals.external_embedding =
    signals.infrastructure ||
    signals.agent_specific ||
    signals.strong_watchlist ||
    namedEntityCount >= 1;

  signals.roundup_worthy =
    signals.launch ||
    signals.milestone ||
    signals.funding ||
    signals.acquisition ||
    signals.infrastructure ||
    signals.dense_signal ||
    (signals.agent_specific && (post.like_count || 0) >= 3) ||
    signals.strong_watchlist;

  const isWithin72Hours = post.observed_at
    ? (Date.now() - new Date(post.observed_at).getTime()) < 72 * 60 * 60 * 1000
    : false;

  signals.repost_worthy =
    isWithin72Hours &&
    (signals.strong_watchlist || signals.tier2_source) &&
    !signals.funding &&
    !signals.acquisition &&
    !signals.meme_or_spam &&
    (signals.dense_signal || signals.launch || signals.infrastructure) &&
    (signals.strong_watchlist
      ? (Number(post.like_count || 0) >= 5 || Number(post.repost_count || 0) >= 2)
      : (Number(post.like_count || 0) >= 10 || Number(post.repost_count || 0) >= 4));

  signals.like_worthy =
    signals.strong_watchlist &&
    !signals.meme_or_spam &&
    !isTooShort(post.text_content);

  // Real-world events: acquisition, launch, or funding announcements that have a source tweet.
  // These should anchor Mike's response to the source (quote or repost+commentary), not standalone.
  signals.real_world_event = signals.acquisition || signals.launch || signals.funding;

  signals.quote_worthy =
    !signals.meme_or_spam &&
    (
      // Standard path: strong watchlist account with solid engagement
      (signals.strong_watchlist && (signals.dense_signal || signals.roundup_worthy || (post.like_count || 0) >= 5)) ||
      // Event path: acquisition/launch/funding → always attach to source if tweet exists
      (signals.real_world_event && !isTooShort(post.text_content))
    );

  signals.reply_worthy =
    !signals.meme_or_spam &&
    !looksSpammy(text) &&
    (
      // Classic reply path: agent topic, in domain
      (!signals.roundup_worthy && signals.agent_specific && signals.external_embedding) ||
      // Stage 6: someone mentions Mike
      signals.mentions_mike ||
      // Stage 6: disagreement on an agent topic
      (signals.is_disagreement && signals.agent_specific)
    );

  return signals;
}

function computeScore(post, signals) {
  let score = 0;

  if (signals.strong_watchlist) score += 4;
  if (signals.tier2_source) score += 2;
  if (signals.launch) score += 4;
  if (signals.milestone) score += 3;
  if (signals.acquisition) score += 5;
  if (signals.funding) score += 3;
  if (signals.infrastructure) score += 2;
  if (signals.agent_specific) score += 2;
  if (signals.dense_signal) score += 3;
  if (signals.external_embedding) score += 2;

  score += Math.min(Number(post.like_count || 0), 20) * 0.15;
  score += Math.min(Number(post.repost_count || 0), 20) * 0.2;
  score += Math.min(Number(post.reply_count || 0), 20) * 0.1;

  if (isTooShort(post.text_content)) score -= 2;
  if (looksSpammy(post.text_content)) score -= 5;
  if (signals.meme_or_spam) score -= 6;

  return score;
}

async function getTodayCounts() {
  const since = startOfDayUTC();

  // interaction_jobs tracks reply/roundup (x_repost_comment uses copydesk_jobs)
  const { data, error } = await supabase
    .from("interaction_jobs")
    .select("action_type")
    .gte("created_at", since);

  if (error) throw error;

  const counts = {
    reply: 0,
    repost_comment: 0,
    roundup_candidate: 0,
    like: 0,
  };

  for (const row of data || []) {
    const actionType = safeString(row.action_type);
    if (actionType === "x_reply") counts.reply += 1;
    if (actionType === "roundup_candidate") counts.roundup_candidate += 1;
  }

  // x_repost_comment stored as x_post with context.mode="x_repost_comment" (enum workaround)
  const { data: rcJobs } = await supabase
    .from("copydesk_jobs")
    .select("id")
    .eq("job_type", "x_post")
    .eq("context->>mode", "x_repost_comment")
    .gte("created_at", since);
  counts.repost_comment = (rcJobs || []).length;

  // Like count from scheduled_posts
  const { data: spRows } = await supabase
    .from("scheduled_posts")
    .select("payload")
    .eq("channel", "x")
    .neq("status", "cancelled")
    .gte("created_at", since);
  counts.like = (spRows || []).filter(r => r.payload?.type === "x_like").length;

  return counts;
}

/**
 * Returns a Map<handle, count> of interactions per author today.
 * Covers replies + quotes (via interaction_jobs) and reposts + likes (via scheduled_posts).
 * Used to enforce the max 2 interactions per account per day diversity rule.
 */
async function getTodayAccountCounts() {
  const since = startOfDayUTC();
  const accountCounts = new Map();

  function inc(handle) {
    if (!handle) return;
    const h = String(handle).toLowerCase().replace(/^@/, "");
    if (!h) return;
    accountCounts.set(h, (accountCounts.get(h) || 0) + 1);
  }

  // replies + quotes from interaction_jobs
  const { data: ijRows } = await supabase
    .from("interaction_jobs")
    .select("action_type, target_author_handle")
    .in("action_type", ["x_reply", "x_quote"])
    .gte("created_at", since);

  for (const r of ijRows || []) {
    inc(r.target_author_handle);
  }

  // reposts + likes from scheduled_posts
  const { data: spRows } = await supabase
    .from("scheduled_posts")
    .select("payload")
    .eq("channel", "x")
    .neq("status", "cancelled")
    .gte("created_at", since);

  for (const r of spRows || []) {
    const t = r.payload?.type;
    if (t === "x_repost" || t === "x_like") {
      inc(r.payload?.target_author_handle);
    }
  }

  return accountCounts;
}

async function getReplyCountLast24Hours() {
  const since = rollingHoursAgoISO(24);

  const { count, error } = await supabase
    .from("interaction_jobs")
    .select("*", { count: "exact", head: true })
    .eq("action_type", "x_reply")
    .gte("created_at", since);

  if (error) throw error;
  return Number(count || 0);
}

function normalizeObservedPost(post) {
  return {
    ...post,
    pr: post?.pr ?? null,
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
  const metadata = parseMetadata(event.metadata);
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
    pr: event?.pr ?? metadata?.pr ?? null,
    topic: "",
    domain_in_scope: isInDomainReplyTopic(text),
  };
}

async function fetchCandidates() {
  const since = rollingHoursAgoISO(72);

  const [observedRes, replyRes, existingReplyJobsRes] = await Promise.all([
    supabase
      .from("x_observed_posts")
      .select("*")
      .eq("is_processed", false)
      .eq("ignored", false)
      .order("like_count", { ascending: false })
      .order("observed_at", { ascending: false })
      .limit(150),
    supabase
      .from("events")
      .select("id, event_type, metadata, created_at")
      .eq("event_type", "reply_incoming")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("interaction_jobs")
      .select("target_tweet_id")
      .eq("action_type", "x_reply")
      .gte("created_at", since),
  ]);

  if (observedRes.error) throw observedRes.error;
  if (replyRes.error) throw replyRes.error;
  if (existingReplyJobsRes.error) throw existingReplyJobsRes.error;

  const existingReplyTweetIds = new Set(
    (existingReplyJobsRes.data || [])
      .map((row) => safeString(row.target_tweet_id))
      .filter(Boolean)
  );
  const observed = (observedRes.data || []).map((post) =>
    normalizeObservedPost({
      ...post,
      pr: post?.pr ?? null,
    })
  );
  const replies = (replyRes.data || [])
    .map((event) => {
      const metadata = parseMetadata(event.metadata);
      return normalizeReplyEvent({
        ...event,
        metadata: {
          ...metadata,
          pr: metadata?.pr ?? null,
        },
        pr: metadata?.pr ?? null,
      });
    })
    .filter((event) => !existingReplyTweetIds.has(event.tweet_id))
    .filter((event) => !looksSpammy(lower(event.text_content || "")));

  return [...replies, ...observed].sort(
    (a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );
}

function stylePreferenceFor(post, signals, actionType) {
  if (actionType === "x_reply" || actionType === "x_quote") {
    return "reaction";
  }

  if (actionType === "roundup_candidate" || actionType === "x_repost" || actionType === "x_repost_comment") {
    return "signal_amplification";
  }

  if (signals.dense_signal || signals.infrastructure) {
    return "observation";
  }

  return "reaction";
}

function collectSignalTags(signals) {
  return Object.entries(signals)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
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

async function insertCopydeskJob(post, jobType, contextSummary, signals) {
  // x_repost_comment is not in the copydesk_job_type enum — store as x_post with mode flag.
  const dbJobType = jobType === "x_repost_comment" ? "x_post" : jobType;

  const context = {
    target_author: post.author_handle,
    target_text: post.text_content,
    context_summary: contextSummary,
    source_tweet_id: post.tweet_id,
    source_type: post.source_query || "",
    pr: post?.pr ?? null,
    style_preference: stylePreferenceFor(post, signals, jobType),
    signal_tags: collectSignalTags(signals),
    source_metrics: {
      likes: Number(post.like_count || 0),
      reposts: Number(post.repost_count || 0),
      replies: Number(post.reply_count || 0),
    },
    ...(jobType === "x_repost_comment" ? { mode: "x_repost_comment" } : {}),
  };

  const payload = {
    job_type: dbJobType,
    status: "queued",
    priority: 1,
    subject_type: post.candidate_source === "reply_incoming" ? "event" : "x_observed_post",
    subject_id: post.id,
    context,
    max_chars: jobType === "x_repost_comment" ? 200 : 220,
    schema_version: 1,
  };

  console.log("SELECTOR PR DEBUG", JSON.stringify({ contextPr: context?.pr ?? null, context }));

  const { error } = await supabase.from("copydesk_jobs").insert([payload]);
  if (error) throw error;
}

const DAILY_LIKE_CAP = 30;

async function insertLike(post) {
  const payload = {
    type: "x_like",
    target_tweet_id: post.tweet_id,
    target_author_handle: post.author_handle,
    target_text: post.text_content,
  };

  const { error } = await supabase.from("scheduled_posts").insert([{
    channel: "x",
    status: "queued",
    run_at: new Date().toISOString(),
    payload,
    approved: true,
    publish_ready: true,
  }]);

  if (error) throw error;
}

async function insertRepost(post) {
  const payload = {
    type: "x_repost",
    target_tweet_id: post.tweet_id,
    target_author_handle: post.author_handle,
    target_text: post.text_content,
  };

  const { error } = await supabase.from("scheduled_posts").insert([{
    channel: "x",
    status: "queued",
    run_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min out
    payload,
    approved: true,
    publish_ready: true,
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
  if (signals.strong_watchlist) parts.push("tier1 watchlist account");
  if (signals.tier2_source) parts.push("tier2 ecosystem account");
  if (signals.dense_signal) parts.push("multiple ecosystem signals present");
  if (signals.external_embedding) parts.push("strong external ecosystem relevance");
  if (signals.repost_worthy) parts.push("repost candidate");
  if (signals.topic_classification) parts.push(`topic=${signals.topic_classification}`);
  if (signals.mentions_mike) parts.push("mentions_mike");
  if (signals.is_disagreement) parts.push("is_disagreement");
  parts.push(`source=${safeString(post.source_query || "watchlist")}`);
  parts.push(
    `engagement likes=${Number(post.like_count || 0)} reposts=${Number(post.repost_count || 0)} replies=${Number(post.reply_count || 0)}`
  );
  if (post.candidate_source === "reply_incoming") parts.push("incoming reply question");
  if (post.candidate_source === "reply_incoming" && post.domain_in_scope) parts.push("in-domain reply topic");
  parts.push(`score=${score.toFixed(1)}`);

  return parts.join("; ");
}

async function main() {
  const workflow_id = "wf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  _activeWorkflowId = workflow_id;
  console.log(`selector workflow_id=${workflow_id}`);
  await createWorkflow(workflow_id);

  const capCheck = checkXApiCap();
  if (!capCheck.allowed) {
    console.warn(
      `selector skip: x_api_cap_reached estimated_usd=${capCheck.estimatedUsd.toFixed(3)} reason=${capCheck.reason}`
    );
    await logWorkflowEvent({
      workflow_id,
      trace_id: "tr_" + Math.random().toString(36).slice(2, 9),
      role: "selector",
      task_type: "analysis",
      input: { reason: "x_api_cap_skip", estimated_usd: capCheck.estimatedUsd },
      decision: null,
      output: { skipped: true },
      status: "done",
    });
    await closeWorkflow(workflow_id, "completed");
    await logRun("ok", { msg: "x_api_cap_skip", x_api_cost_usd: capCheck.estimatedUsd, reason: capCheck.reason });
    return;
  }

  const activity = getActivityLevel();
  // Normalize: merge with FALLBACK_CAPS so missing keys (e.g. from cached old activity files) are always defined
  const DAILY_CAPS = { ...FALLBACK_CAPS, ...activity.caps };
  console.log(`selector: activity=${activity.label} caps=${JSON.stringify(DAILY_CAPS)}`);

  const todayCounts = await getTodayCounts();
  let replyCountLast24Hours = await getReplyCountLast24Hours();
  const accountCounts = await getTodayAccountCounts();
  const MAX_INTERACTIONS_PER_ACCOUNT = 2;
  const candidates = await fetchCandidates();

  if (!candidates.length) {
    await logWorkflowEvent({
      workflow_id,
      trace_id: "tr_" + Math.random().toString(36).slice(2, 9),
      role: "selector",
      task_type: "analysis",
      input: { reason: "no_candidates" },
      decision: null,
      output: { skipped: true },
      status: "done",
    });
    await closeWorkflow(workflow_id, "completed");
    await logRun("ok", { msg: "no_candidates" });
    return;
  }

  let processed = 0;
  let queuedReply = 0;
  let queuedRepostComment = 0;
  let queuedLike = 0;
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
    // Exit early if all daily caps are exhausted
    if (
      replyCountLast24Hours >= DAILY_CAPS.reply &&
      todayCounts.repost_comment >= DAILY_CAPS.repost_comment &&
      todayCounts.roundup_candidate >= DAILY_CAPS.roundup_candidate
    ) {
      console.log("selector: all daily caps reached — exiting early");
      break;
    }

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
      const replyQuestion = isReplyQuestion(post);
      const inDomainReply = isInDomainReply(post);

      if (post.candidate_source === "reply_incoming") {
        signals.roundup_worthy = false;
        signals.quote_worthy = false;
        signals.repost_worthy = false;
        signals.reply_worthy = !looksSpammy(text);
      }
      const score = computeScore(post, signals);
      const contextSummary = summarizeContext(post, signals, score);

      // PRIORITY ORDER: reply (reply_incoming only) → repost_comment → roundup → like
      // x_quote blocked — X restricts quoting for accounts without conversation history.
      // x_reply for observed posts blocked — X restricts replies unless author has engaged us.
      // checkXApiCap() is called before every action to enforce the daily budget.

      // Account diversity: max MAX_INTERACTIONS_PER_ACCOUNT per author per day.
      const postHandle = String(post.author_handle || "").toLowerCase().replace(/^@/, "");
      const accountInteractionsToday = accountCounts.get(postHandle) || 0;
      if (postHandle && accountInteractionsToday >= MAX_INTERACTIONS_PER_ACCOUNT) {
        console.log(`selector: diversity cap — skipping @${postHandle} (${accountInteractionsToday}/${MAX_INTERACTIONS_PER_ACCOUNT} interactions today)`);
        await finalizeCandidate(post, { ignored: true, used_for_job: false, relevance_score: score });
        ignored += 1;
        ignoredReasons.daily_cap_blocked += 1;
        continue;
      }

      // 1. REPLY — only from reply_incoming events (author has already engaged us)
      if (
        post.candidate_source === "reply_incoming" &&
        signals.reply_worthy &&
        replyCountLast24Hours < DAILY_CAPS.reply
      ) {
        const capNow = checkXApiCap();
        if (!capNow.allowed) {
          console.log(`selector: x_api_cap_reached before reply — stopping actions (usd=${capNow.estimatedUsd.toFixed(3)})`);
          break;
        }
        await insertInteractionJob(post, "x_reply", contextSummary);
        await insertCopydeskJob(post, "x_reply", contextSummary, signals);
        await finalizeCandidate(post, { ignored: false, used_for_job: true, relevance_score: score });
        todayCounts.reply += 1;
        replyCountLast24Hours += 1;
        queuedReply += 1;
        processed += 1;
        accountCounts.set(postHandle, accountInteractionsToday + 1);
        if (selectedSamples.length < 5) selectedSamples.push({ post_id: post.id, handle: post.author_handle, action: "x_reply", score });
        continue;
      }

      // 2. REPOST WITH COMMENT — high-signal posts get Mike commentary via copydesk
      if (
        signals.repost_worthy &&
        todayCounts.repost_comment < DAILY_CAPS.repost_comment
      ) {
        const capNow = checkXApiCap();
        if (!capNow.allowed) {
          console.log(`selector: x_api_cap_reached before repost_comment — stopping actions (usd=${capNow.estimatedUsd.toFixed(3)})`);
          break;
        }
        await insertCopydeskJob(post, "x_repost_comment", contextSummary, signals);
        await finalizeCandidate(post, { ignored: false, used_for_job: true, relevance_score: score });
        todayCounts.repost_comment = (todayCounts.repost_comment || 0) + 1;
        queuedRepostComment += 1;
        processed += 1;
        accountCounts.set(postHandle, accountInteractionsToday + 1);
        if (selectedSamples.length < 5) selectedSamples.push({ post_id: post.id, handle: post.author_handle, action: "x_repost_comment", score });
        continue;
      }

      // 4. ROUNDUP CANDIDATE (fourth priority — no diversity cap; low-cost signal tagging)
      if (
        signals.roundup_worthy &&
        todayCounts.roundup_candidate < DAILY_CAPS.roundup_candidate
      ) {
        await insertInteractionJob(post, "roundup_candidate", contextSummary);
        await finalizeCandidate(post, { ignored: false, used_for_job: true, relevance_score: score });
        todayCounts.roundup_candidate += 1;
        markedRoundup += 1;
        processed += 1;
        if (selectedSamples.length < 5) selectedSamples.push({ post_id: post.id, handle: post.author_handle, action: "roundup_candidate", score });
        continue;
      }

      // 5. LIKE (lowest priority)
      if (
        signals.like_worthy &&
        score >= 6 &&
        todayCounts.like < DAILY_LIKE_CAP &&
        post.candidate_source === "x_observed_post"
      ) {
        await insertLike(post);
        await finalizeCandidate(post, { ignored: false, used_for_job: true, relevance_score: score });
        todayCounts.like += 1;
        queuedLike += 1;
        processed += 1;
        accountCounts.set(postHandle, accountInteractionsToday + 1);
        if (selectedSamples.length < 5) {
          selectedSamples.push({ post_id: post.id, handle: post.author_handle, action: "x_like", score });
        }
        continue;
      }

      const replyRequirementsMissed =
        post.candidate_source === "reply_incoming" && !signals.reply_worthy;

      const capBlocked =
        (signals.roundup_worthy && todayCounts.roundup_candidate >= DAILY_CAPS.roundup_candidate) ||
        (signals.repost_worthy && todayCounts.repost_comment >= DAILY_CAPS.repost_comment) ||
        (signals.reply_worthy && replyCountLast24Hours >= DAILY_CAPS.reply) ||
        (signals.like_worthy && todayCounts.like >= DAILY_LIKE_CAP);

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

  await logWorkflowEvent({
    workflow_id,
    trace_id: "tr_" + Math.random().toString(36).slice(2, 9),
    role: "selector",
    task_type: "analysis",
    input: { candidates_fetched: candidates.length, activity: activity.label },
    decision: { queued_reply: queuedReply, queued_repost_comment: queuedRepostComment, roundup: markedRoundup, liked: queuedLike },
    output: { processed, ignored, ignored_reasons: ignoredReasons },
    status: "done",
  });
  await closeWorkflow(workflow_id, "completed");

  await logRun("ok", {
    activity_level: activity.label,
    processed,
    queuedReply,
    queuedRepostComment,
    queuedLike,
    markedRoundup,
    ignored,
    ignoredReasons,
    selectedSamples,
    candidatesFetched: candidates.length,
    todayCounts,
    replyCountLast24Hours,
    dailySummary: {
      replies: queuedReply,
      repost_comments: queuedRepostComment,
      originals: 0, // tracked in canon-enqueuer runs
    },
  });
}

main().catch(async (e) => {
  await closeWorkflow(_activeWorkflowId, "failed");
  await logRun("error", { fatal: true }, String(e?.message || e));
  process.exit(1);
});

// step-b test marker

// selector-hotfix-001 test marker
