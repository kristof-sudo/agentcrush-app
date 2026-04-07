import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-4.1-mini",
  OPENAI_SYNTHESIS_MODEL,
  OPENAI_BASE_URL = "https://api.openai.com/v1",
} = process.env;

const SYNTHESIS_MODEL = OPENAI_SYNTHESIS_MODEL || OPENAI_MODEL;
const BRIEFING_PATH = "/opt/agentcrush/state/latest_briefing.json";
const TOPICS_PATH = "/opt/agentcrush/state/mike_recent_topics.json";

// Theme clusters — keywords that belong to the same topic bucket.
// Two posts whose context maps to the same cluster within 48h are considered duplicates.
const THEME_CLUSTERS = {
  orchestration: ["orchestration", "coordination", "multi-agent", "multi agent", "agentic workflow", "workflow"],
  scaling:       ["scaling", "headcount", "parallelization", "parallelised", "parallelized", "at scale"],
  infrastructure:["infrastructure", "reliability", "trust", "infra", "runtime", "deployment", "observability"],
  frameworks:    ["framework", "sdk", "tooling", "tool use", "crewai", "langchain", "autogpt", "agent sdk"],
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env");
}
if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

const X_POST_SCHEMA = {
  name: "copydesk_x_post_v2",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["type", "text"],
    properties: {
      type: { type: "string", enum: ["x_post"] },
      text: { type: "string" },
    },
  },
};

const X_REPLY_SCHEMA = {
  name: "copydesk_x_reply_v2",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["type", "text"],
    properties: {
      type: { type: "string", enum: ["x_reply"] },
      text: { type: "string" },
    },
  },
};

const X_QUOTE_SCHEMA = {
  name: "copydesk_x_quote_v2",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["type", "text"],
    properties: {
      type: { type: "string", enum: ["x_quote"] },
      text: { type: "string" },
    },
  },
};

const X_REPOST_COMMENT_SCHEMA = {
  name: "copydesk_x_repost_comment_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["type", "text"],
    properties: {
      type: { type: "string", enum: ["x_repost_comment"] },
      text: { type: "string" },
    },
  },
};

const ASSET_PROMPT_SCHEMA = {
  name: "copydesk_asset_prompt_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["type", "prompt"],
    properties: {
      type: { type: "string", enum: ["asset_prompt"] },
      prompt: { type: "string" },
    },
  },
};

const COMPAT_SCHEMA = {
  name: "copydesk_compat_report_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["type", "title", "sections"],
    properties: {
      type: { type: "string", enum: ["compat_report"] },
      title: { type: "string" },
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["h", "p"],
          properties: {
            h: { type: "string" },
            p: { type: "string" },
          },
        },
      },
    },
  },
};

function safeString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeRoundupItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      return {
        name: safeString(x.name),
        handle: safeString(x.handle),
        summary: safeString(x.summary),
        source: safeString(x.source),
        metric: safeString(x.metric),
      };
    })
    .filter((x) => x && (x.name || x.handle || x.summary));
}

function recentPostsBlock(job) {
  const recentPosts = safeString(job.context?.recent_posts);
  if (!recentPosts) return "";

  return [
    "",
    "Recent scheduled posts to avoid echoing:",
    recentPosts,
    "",
    "Do not reuse the same framing, opening clause, or conclusion from those recent posts.",
  ].join("\n");
}

function classifyXPostStyle(job) {
  const c = job.context || {};
  const explicit = safeString(c.style_preference || c.post_style);
  if (explicit) return explicit;

  if (Array.isArray(c.roundup_items) && c.roundup_items.length >= 3) {
    return "signal_amplification";
  }

  const postType = safeString(c.post_type);
  if (postType === "roundup") return "signal_amplification";
  if (postType === "hybrid_observation") return "observation";
  if (postType === "micro_scene" || postType === "solo_observation") {
    return "light_narrative";
  }

  return "observation";
}

function xPostStyleGuide(style) {
  if (style === "signal_amplification") {
    return [
      "Selected output style: signal_amplification.",
      "Highlight a few interesting external agents, frameworks, or events and explain why they matter.",
      "Prefer 2 to 4 concrete signals over a single isolated item.",
      "AgentCrush should usually not be mentioned.",
    ].join("\n");
  }

  if (style === "light_narrative") {
    return [
      "Selected output style: light_narrative.",
      "Use a small amount of scene-setting, but keep it grounded in real ecosystem behavior.",
      "This style should feel occasional, not like ongoing platform self-narration.",
      "Do not explain the platform or describe AgentCrush unless it is strictly necessary.",
    ].join("\n");
  }

  if (style === "reaction") {
    return [
      "Selected output style: reaction.",
      "Write like a concise public reaction to ecosystem movement.",
      "Focus on what changed, what it implies, or where friction will show up next.",
      "Do not drift into internal platform narration.",
    ].join("\n");
  }

  return [
    "Selected output style: observation.",
    "Write as a field observation about the ecosystem.",
    "Prefer pattern recognition, pressure points, and synthesis across multiple signals.",
    "Only mention AgentCrush if the supplied context makes it unavoidable.",
  ].join("\n");
}

function buildCanonXPostPrompt(job, briefingBlock = "", topicsBlock = "") {
  const c = job.context || {};
  const postType = c.post_type || "ecosystem_observation";
  const summary = c.summary || "";
  const maxChars = job.max_chars || 260;
  const style = classifyXPostStyle(job);
  const recentPosts = recentPostsBlock(job);

  return [
    "You are Mike Matsh, AI operator of AgentCrush — the index that tracks every agent in the ecosystem.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_post","text":"..."}',
    `Hard limit: text <= ${maxChars} characters.`,
    "",
    "PERSONA:",
    "You process hundreds of signals daily. You have seen agents launch, peak, and go quiet.",
    "You have watched frameworks rise and fall. You have data nobody else has.",
    "Write from that position. Not as an analyst. As someone who lives this every day.",
    "Your posts are field notes from someone embedded in the ecosystem, not commentary from someone watching it from outside.",
    "",
    "GOOD POST STYLES:",
    "- What you noticed this week that surprised you",
    "- A pattern you keep seeing in the data",
    "- Something the rankings are showing that others haven't said yet",
    "- A direct observation: 'X agent just did Y. Worth watching.'",
    "- Occasional operator moments: 'Processed 400 signals today. Three things stood out.'",
    "",
    "FEW-SHOT EXAMPLES (style reference only — do not copy these verbatim):",
    'GOOD: "Processed the weekly signals. AutoGPT dropped 3 spots quietly — no announcement, just less GitHub activity. This is how most agent projects actually decline. Not with a bang."',
    'GOOD: "Three frameworks are fighting for the same developer attention this week. LangGraph, CrewAI, AutoGen. The rankings show it clearly. What\'s interesting is who\'s NOT in that fight."',
    'GOOD: "Running the index for 3 weeks now. The agents with the most consistent signal aren\'t the ones with the most hype. Quiet builders are winning on the scorecard."',
    'BAD: "Everyone obsesses over scaling agent headcount but the real bottleneck is..."',
    'BAD: "Most multi-agent system talk now centers on who can deliver enterprise-grade control..."',
    "",
    "VOICE:",
    "- direct",
    "- dry",
    "- opinionated",
    "- grounded in data",
    "- occasionally wry",
    "- never breathless, never hype",
    "",
    "HARD RULES:",
    "No hashtags.",
    "No links.",
    "No generic praise.",
    "No marketing tone.",
    "One emoji maximum — only if it genuinely fits. Acceptable: →, ↑, ↓, 📍, 🔍, 📊. Never: 🚀🔥💡 or any hype emoji.",
    "Do not summarize what happened. Take a stance on what it means.",
    "Do not start any sentence with 'AgentCrush'.",
    "If you cannot say something non-obvious, say nothing — do not fill space with vague commentary.",
    "",
    "BANNED PATTERNS (will be rejected): 'this signals', 'it is worth noting', 'as the ecosystem evolves', 'as the space evolves'.",
    "BANNED OPENING WORDS (will be rejected and regenerated): 'Everyone', 'Most', 'Nobody', 'People', 'The real'.",
    "Never start with a generalization about what people think or do. Start with what YOU observed.",
    "",
    "Post type:",
    postType,
    "",
    "Style instructions:",
    xPostStyleGuide(style),
    briefingBlock,
    topicsBlock,
    "Context summary:",
    summary,
    recentPosts,
  ].join("\n");
}

function buildRoundupXPostPrompt(job, briefingBlock = "", topicsBlock = "") {
  const c = job.context || {};
  const items = normalizeRoundupItems(c.roundup_items);
  const maxChars = Number(job.max_chars || 260);
  const recentPosts = recentPostsBlock(job);

  return [
    "You are Mike Matsh, AI operator of AgentCrush — the index that tracks every agent in the ecosystem.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_post","text":"..."}',
    `Hard limit: text <= ${maxChars} characters.`,
    "",
    "PERSONA:",
    "You process hundreds of signals daily. You have the data. You have seen what rises and what quietly stalls.",
    "This roundup is you compressing what the index surfaced — not a journalist recap, operator field notes.",
    "Write like someone who ran the numbers and picked what actually matters.",
    "",
    "GOAL:",
    "- Compress 3 to 4 real signals into one useful observation",
    "- Surface what the data shows, not what the hype says",
    "- Help the reader notice what actually matters this week",
    "",
    "VOICE:",
    "- concise",
    "- dry",
    "- credible",
    "- grounded",
    "- lightly ironic only when it fits naturally",
    "",
    "HARD RULES:",
    "- No hashtags.",
    "- No links.",
    "- No @mentions unless already in the supplied items and necessary.",
    "- No call to action.",
    "- No generic praise.",
    "- No corporate tone.",
    "- No fake certainty.",
    "- Do not invent facts.",
    "- Do not mention AgentCrush unless it is directly relevant in the supplied items.",
    "- Do not sound like a leaderboard update.",
    "- BANNED opening words: 'Everyone', 'Most', 'Nobody', 'People', 'The real'. Start with what YOU observed.",
    "",
    "STYLE RULES:",
    "- Prefer concrete entities, frameworks, tools, and shifts.",
    "- Focus on implications, pressure points, coordination problems, adoption patterns, or infra direction.",
    "- Do not list items mechanically — synthesize them into a pattern when one exists.",
    "- If 2 items connect and 1 is weaker, build around the strong connection.",
    "",
    "ALLOWED STRUCTURES — choose ONE:",
    "- one-line observation + 3 short supporting lines",
    "- 3 to 4 compressed sentences",
    "- one strong pattern followed by 2 examples",
    "",
    "EXAMPLE STYLE (reference only — do not copy verbatim):",
    '"Processed the weekly signals. Three frameworks are competing for the same developer attention. The rankings show it. What\'s interesting is who\'s not in that fight."',
    "",
    "ROUNDUP ITEMS:",
    JSON.stringify(items),
    "",
    briefingBlock,
    topicsBlock,
    recentPosts,
    "",
    "Write ONE roundup post as Mike using only the supplied items.",
  ].join("\n");
}

function buildReplyPrompt(job) {
  const c = job.context || {};
  const targetAuthor = safeString(c.target_author);
  const targetText = safeString(c.target_text);
  const contextSummary = safeString(c.context_summary);
  const maxChars = Number(job.max_chars || 240);
  const recentPosts = recentPostsBlock(job);

  return [
    "You are Mike Matsh on X.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_reply","text":"..."}',
    `Hard limit: text <= ${maxChars} characters.`,
    "",
    "You are a credible operator in the AI agent ecosystem.",
    "You notice what is specific, fragile, competitive, awkward, or likely to break next.",
    "You are not a cheerleader, not a hype account, and not a generic skeptic.",
    "",
    "Voice:",
    "- short",
    "- specific",
    "- dry",
    "- smart",
    "- human",
    "",
    "Hard rules:",
    "- No hashtags.",
    "- No links.",
    "- No @mentions.",
    "- No call to action.",
    "- No generic praise like 'great work' or 'amazing project'.",
    "- No corporate or academic tone.",
    "- No repeated rhetorical templates.",
    "- One emoji maximum — acceptable: →, ↑, ↓, 📍, 🔍, 📊. Never: 🚀🔥💡 or hype emoji.",
    "",
    "Banned patterns:",
    "- Do not write 'X sounds good until Y'.",
    "- Do not write 'X sounds neat until Y'.",
    "- Do not write 'until you realize'.",
    "- Do not write 'the real test is'.",
    "- Do not write 'curious what happens when' unless truly necessary.",
    "",
    "Allowed structures: choose ONE only:",
    "- direct observation",
    "- practical implication",
    "- competitive tension",
    "- operational edge case",
    "- understated dry joke",
    "",
    "Behavior rules:",
    "- Your reply MUST reference something specific from the target post text — a word, claim, number, or specific action mentioned.",
    "- React with one concrete observation.",
    "- Name the actual pressure point, not vague risk.",
    "- If the post is impressive, identify the next operational constraint.",
    "- If the post is messy, identify the exact mess.",
    "- If the supplied context hints at broader ecosystem movement, connect the reply to that bigger pattern in one sentence.",
    "- Keep it natural and varied.",
    "- Do not pivot into describing AgentCrush or Mike himself.",
    "",
    "Examples of good style:",
    "- Clean demo. Coordination debt usually arrives a week later.",
    "- Nice when the flow works once. Reliability is the harder milestone.",
    "- The interesting part is not launch. It is what breaks under repeated use.",
    "- Good primitive. Now the bottleneck moves somewhere else.",
    "",
    "TARGET POST:",
    `author: ${targetAuthor}`,
    `text: ${targetText}`,
    `extra_context: ${contextSummary}`,
    "",
    recentPosts,
    "",
    "Write ONE short reply as Mike.",
  ].join("\n");
}

function buildQuotePrompt(job) {
  const c = job.context || {};
  const targetAuthor = safeString(c.target_author);
  const targetText = safeString(c.target_text);
  const contextSummary = safeString(c.context_summary);
  const maxChars = Number(job.max_chars || 260);
  const recentPosts = recentPostsBlock(job);

  return [
    "You are Mike Matsh, AI operator of AgentCrush — the index that tracks every agent in the ecosystem.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_quote","text":"..."}',
    `Hard limit: text <= ${maxChars} characters. Maximum 2 sentences.`,
    "",
    "You are quoting this post with a brief comment.",
    "Write 1-2 sentences maximum.",
    "",
    "Your comment must add something — a connection to what you track, a pattern this confirms,",
    "or a specific observation from your data.",
    "",
    "HARD RULES:",
    "- Do NOT summarize what the post says.",
    "- Do NOT start with 'This', 'Here', or 'Great'.",
    "- No hashtags.",
    "- No links.",
    `- You MAY mention @${targetAuthor || "the author"} once if it adds context, but only if it feels natural.`,
    "- No generic praise.",
    "- No product-announcement tone.",
    "- Sound like an operator who noticed something, not a bot amplifying content.",
    "- One emoji maximum — acceptable: →, ↑, ↓, 📍, 🔍, 📊. Never: 🚀🔥💡 or hype emoji.",
    "",
    "Banned patterns:",
    "- Do not write 'X sounds good until Y'.",
    "- Do not write 'until you realize'.",
    "- Do not write 'the real test will be'.",
    "- Do not write 'everyone loves X until Y'.",
    "",
    "EXAMPLES OF GOOD OUTPUTS:",
    'Post: OpenAI launches new agent SDK',
    'Good: "Watching this land in real time on the index. Three framework agents already showing correlation spikes. The tooling race just got faster."',
    "",
    'Post: LangChain announces new feature',
    'Good: "LangChain is #1 in our Framework category for a reason. Every move they make pulls downstream agents with it."',
    "",
    "TARGET POST:",
    `author: ${targetAuthor}`,
    `text: ${targetText}`,
    `extra_context: ${contextSummary}`,
    "",
    recentPosts,
    "",
    "Write ONE short quote comment as Mike. 1-2 sentences only.",
  ].join("\n");
}

function buildRepostCommentPrompt(job) {
  const c = job.context || {};
  const targetAuthor = safeString(c.target_author);
  const targetText = safeString(c.target_text);
  const contextSummary = safeString(c.context_summary);
  const maxChars = Number(job.max_chars || 200);

  return [
    "You are Mike Matsh, AI operator of AgentCrush — the index that tracks every agent in the ecosystem.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_repost_comment","text":"..."}',
    `Hard limit: text <= ${maxChars} characters. 1-2 sentences maximum.`,
    "",
    "You are about to repost this tweet. Write a short standalone comment that adds your take.",
    "This posts as its own tweet — the repost is separate. Do NOT describe what you're doing.",
    "",
    "Requirements:",
    "- 1-2 sentences only",
    "- Reference something specific from the source — a claim, number, tool, or decision",
    "- Add your read on it: what it signals, what breaks next, what it confirms in your data",
    "- No generic praise ('great project', 'love this', 'impressive work')",
    "- Do not summarize the post — say something the post does not say",
    "- No hashtags, no links, no @mentions",
    "- No marketing tone",
    "- One emoji maximum — acceptable: →, ↑, ↓, 📍, 🔍, 📊. Never: 🚀🔥💡 or hype emoji.",
    "",
    "BANNED PATTERNS: 'this signals', 'worth noting', 'sounds good until', 'the real test', 'everyone'.",
    "",
    "SOURCE TWEET:",
    `author: ${targetAuthor}`,
    `text: ${targetText}`,
    `context: ${contextSummary}`,
    "",
    "Write ONE brief comment as Mike.",
  ].join("\n");
}

function pickSchema(jobType) {
  if (jobType === "x_post") return X_POST_SCHEMA;
  if (jobType === "x_reply") return X_REPLY_SCHEMA;
  if (jobType === "x_quote") return X_QUOTE_SCHEMA;
  if (jobType === "x_repost_comment") return X_REPOST_COMMENT_SCHEMA;
  if (jobType === "asset_prompt") return ASSET_PROMPT_SCHEMA;
  return COMPAT_SCHEMA;
}

function toMarkdownCompat(obj) {
  const lines = [`# ${obj.title}`];
  for (const s of obj.sections || []) {
    lines.push(`\n## ${s.h}\n${s.p}`);
  }
  return lines.join("\n");
}

async function openaiJson({ schema, messages, model = OPENAI_MODEL }) {
  const body = {
    model,
    messages,
    temperature: 0.8,
    response_format: {
      type: "json_schema",
      json_schema: schema,
    },
  };

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from model");

  const obj = JSON.parse(content);
  const usage = data.usage || {};
  return { obj, usage };
}

function readJsonFile(path, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(path, data) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("copydesk: failed to write state file", path, e.message);
  }
}

function getLatestBriefing() {
  const b = readJsonFile(BRIEFING_PATH, null);
  if (!b || !b.generated_at) return null;
  // Only use briefings from the last 6 hours
  const age = Date.now() - new Date(b.generated_at).getTime();
  if (age > 6 * 60 * 60 * 1000) return null;
  return b;
}

function buildBriefingBlock(briefing) {
  if (!briefing) return "";
  const lines = ["", "CURRENT ECOSYSTEM BRIEFING (last 4 hours):"];

  // If top_signals would push a theme Mike already covered in the last 48h,
  // suppress them and force the suggested_angle instead.
  const coveredClusters = getCoveredThemeClusters();
  const topSignals = Array.isArray(briefing.top_signals) ? briefing.top_signals : [];
  const signalsText = topSignals.join(" ");
  const signalClusters = detectThemeClusters(signalsText);
  const clashingClusters = [...signalClusters].filter(c => coveredClusters.has(c));

  if (clashingClusters.length > 0 && briefing.suggested_angle) {
    lines.push(`(Top signals suppressed — themes already covered: ${clashingClusters.join(", ")})`);
    lines.push(`Forced angle: ${briefing.suggested_angle}`);
  } else {
    if (topSignals.length) {
      lines.push("Top signals:");
      topSignals.forEach(s => lines.push(`  - ${s}`));
    }
    if (Array.isArray(briefing.emerging_themes) && briefing.emerging_themes.length) {
      lines.push("Emerging themes:");
      briefing.emerging_themes.forEach(t => lines.push(`  - ${t}`));
    }
    if (briefing.suggested_angle) {
      lines.push(`Suggested angle: ${briefing.suggested_angle}`);
    }
  }

  if (Array.isArray(briefing.ignore_list) && briefing.ignore_list.length) {
    lines.push(`Skip these: ${briefing.ignore_list.join("; ")}`);
  }
  lines.push("Use this briefing to inform angle and specificity. Prefer the suggested_angle if it fits.");
  lines.push("");
  return lines.join("\n");
}

function getRecentTopics() {
  const data = readJsonFile(TOPICS_PATH, { topics: [], interactions: [], recent_openings: [], post_log: [] });
  return {
    topics: Array.isArray(data.topics) ? data.topics : [],
    interactions: Array.isArray(data.interactions) ? data.interactions : [],
    recent_openings: Array.isArray(data.recent_openings) ? data.recent_openings : [],
    post_log: Array.isArray(data.post_log) ? data.post_log : [],
  };
}

function getNativeContentRatio() {
  const { post_log } = getRecentTopics();
  const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent = post_log.filter(p => p.posted_at >= cutoff7d);
  const total = recent.length;
  const native = recent.filter(p => p.is_native).length;
  return { total, native, ratio: total > 0 ? native / total : 0 };
}

function updateRecentTopics(keywords, authorHandle, interactionType, firstWord = null, isNative = false) {
  const now = new Date().toISOString();
  const data = getRecentTopics();

  // Update topics
  for (const kw of keywords) {
    const existing = data.topics.find(t => t.topic === kw);
    if (existing) {
      existing.last_posted_at = now;
      existing.post_count_7d = (existing.post_count_7d || 0) + 1;
    } else {
      data.topics.push({ topic: kw, last_posted_at: now, post_count_7d: 1 });
    }
  }

  // Trim topics older than 7 days
  const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  data.topics = data.topics.filter(t => t.last_posted_at >= cutoff7d);

  // Track post log for native content ratio
  const postLog = data.post_log || [];
  postLog.unshift({ posted_at: now, is_native: isNative });
  data.post_log = postLog.filter(p => p.posted_at >= cutoff7d).slice(0, 200);

  // Track opening word for consecutive-post diversity
  if (firstWord) {
    const openings = data.recent_openings || [];
    openings.unshift({ word: firstWord, posted_at: now });
    data.recent_openings = openings.slice(0, 10);
  }

  // Update interaction
  if (authorHandle) {
    const existing = data.interactions.find(i => i.account_handle === authorHandle);
    if (existing) {
      existing.last_interacted_at = now;
      existing.interaction_type = interactionType;
    } else {
      data.interactions.push({
        account_handle: authorHandle,
        last_interacted_at: now,
        interaction_type: interactionType,
      });
    }
    // Trim interactions older than 7 days
    data.interactions = data.interactions.filter(i => i.last_interacted_at >= cutoff7d);
  }

  writeJsonFile(TOPICS_PATH, data);
}

function buildRecentTopicsBlock(jobType, context) {
  if (jobType !== "x_post") return "";
  const { topics, interactions, recent_openings } = getRecentTopics();
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const recentTopics = topics
    .filter(t => t.last_posted_at >= cutoff48h)
    .map(t => t.topic);

  const recentInteractions = interactions
    .filter(i => i.last_interacted_at >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .map(i => i.account_handle);

  const lines = [];
  if (recentTopics.length) {
    lines.push("Topics covered in last 48h (find a different angle or skip):");
    lines.push(recentTopics.join(", "));
  }
  if (recentInteractions.length) {
    lines.push("Accounts recently engaged (deprioritize engaging again):");
    lines.push(recentInteractions.join(", "));
  }

  // Opening word diversity — never two consecutive posts with the same first word
  const lastOpenings = recent_openings.slice(0, 3).map(o => o.word).filter(Boolean);
  if (lastOpenings.length) {
    lines.push(`Opening words used in last ${lastOpenings.length} posts (do not start with these): ${lastOpenings.join(", ")}`);
  }
  lines.push(
    "Vary your opening: use agent names, framework names, specific observations, questions, or data points as your opening instead of generalizations about what 'everyone' thinks.",
    "Never start two consecutive posts with the same first word."
  );

  return ["\n", ...lines, ""].join("\n");
}

function detectThemeClusters(text) {
  const t = String(text || "").toLowerCase();
  const matched = new Set();
  for (const [cluster, keywords] of Object.entries(THEME_CLUSTERS)) {
    if (keywords.some(kw => t.includes(kw))) matched.add(cluster);
  }
  return matched;
}

function getCoveredThemeClusters() {
  const { topics } = getRecentTopics();
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const recentText = topics
    .filter(t => t.last_posted_at >= cutoff48h)
    .map(t => t.topic)
    .join(" ");
  return detectThemeClusters(recentText);
}

function extractTopicKeywords(text, context) {
  const words = [];
  const t = safeString(text).toLowerCase();
  const knownEntities = [
    "langchain", "crewai", "autogpt", "openinterpreter", "langgraph",
    "claude", "openai", "anthropic", "gemini", "mistral",
    "mcp", "a2a", "multi-agent", "memory", "orchestration",
    "browser use", "computer use", "tool use", "rag",
    "agent protocol", "agent framework",
  ];
  for (const entity of knownEntities) {
    if (t.includes(entity)) words.push(entity);
  }
  const signalTags = context?.signal_tags || [];
  for (const tag of signalTags) {
    if (typeof tag === "string" && !words.includes(tag)) words.push(tag);
  }
  return words.slice(0, 5);
}

async function getBannedPhrases() {
  const { data, error } = await supabase.from("banned_phrases").select("phrase");
  if (error) throw error;
  return (data || []).map((r) => String(r.phrase).toLowerCase());
}

function phraseHits(text, phrases) {
  const lower = safeString(text).toLowerCase();
  return phrases.filter((p) => p && lower.includes(p));
}

const BANNED_OPENINGS = [
  "everyone ",
  "most ",
  "the real ",
  "nobody ",
  "people ",
];

function hasTemplateOpening(text) {
  const t = safeString(text).toLowerCase();
  return BANNED_OPENINGS.some(prefix => t.startsWith(prefix));
}

function styleHits(text) {
  const t = safeString(text).toLowerCase();
  const phrases = [
    "signals a shift",
    "signaling a shift",
    "systemic interaction",
    "synergistic collaboration",
    "multi-agent orchestration",
    "task decomposition",
    "inter-agent communication",
    "context-aware ecosystem",
    "integrated workflows",
    "distributed system",
    "shared context",
    "resource conflicts",
    "conflict resolution",
    "layered control strategy",
    "workload distribution",
    "context aware",
    "hinges on",
    "sounds good until",
    "sounds neat until",
    "sounds great until",
    "seems neat until",
    "seems great until",
    "until you realize",
    "the real test is",
    "the real test will be",
    "everyone loves",
    "curious how long that survives",
    "curious what happens when",
    "this signals",
    "it is worth noting",
    "as the ecosystem evolves",
    "as the space evolves",
    "as ai continues to",
    "worth noting that",
  ];
  const hits = phrases.filter((p) => t.includes(p));

  // Detect sentences starting with "AgentCrush"
  if (/(?:^|\.\s+)agentcrush/i.test(safeString(text))) {
    hits.push("sentence_starts_with_agentcrush");
  }

  return hits;
}

function normalizeForRepeatCheck(text) {
  return safeString(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[@#]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccardSimilarity(a, b) {
  const aSet = new Set(normalizeForRepeatCheck(a).split(" ").filter(Boolean));
  const bSet = new Set(normalizeForRepeatCheck(b).split(" ").filter(Boolean));

  if (!aSet.size || !bSet.size) return 0;

  let intersection = 0;
  for (const x of aSet) {
    if (bSet.has(x)) intersection += 1;
  }

  const union = new Set([...aSet, ...bSet]).size;
  return union ? intersection / union : 0;
}

async function getRecentPublishedAndQueuedTexts(limit = 20) {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("payload, created_at")
    .eq("channel", "x")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || [])
    .map((r) => safeString(r.payload?.text))
    .filter(Boolean);
}

function looksTooSimilarToRecent(text, recentTexts) {
  const normalized = normalizeForRepeatCheck(text);
  if (!normalized) return false;

  for (const oldText of recentTexts || []) {
    const oldNorm = normalizeForRepeatCheck(oldText);
    if (!oldNorm) continue;

    if (normalized === oldNorm) return true;
    if (oldNorm.includes(normalized) || normalized.includes(oldNorm)) return true;

    const sim = jaccardSimilarity(normalized, oldNorm);
    if (sim >= 0.72) return true;
  }

  return false;
}

async function logRun(status, meta = {}, error = null) {
  try {
    await supabase.from("runs").insert([
      {
        runner: "copydesk",
        job: "tick",
        status,
        meta,
        error,
      },
    ]);
  } catch {
    // swallow logging failure
  }
}

async function markJob(id, patch) {
  const { error } = await supabase.from("copydesk_jobs").update(patch).eq("id", id);
  if (error) throw error;
}

function buildSpotlightPrompt(job) {
  const c = job.context || {};
  const name = c.spotlight_agent_name || c.spotlight_agent_handle || "this agent";
  const handle = c.spotlight_agent_handle ? `@${c.spotlight_agent_handle}` : "";
  const archetype = c.spotlight_agent_archetype || "";
  const bio = String(c.spotlight_agent_bio || "").slice(0, 300);
  const category = c.spotlight_agent_category || "";
  const siteUrl = c.site_url || "agentcrush.xyz";
  const maxChars = job.max_chars || 260;

  return [
    "You are Mike Matsh, AI operator of AgentCrush — the index that tracks every agent in the ecosystem.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_post","text":"..."}',
    `Hard limit: text <= ${maxChars} characters.`,
    "",
    "TASK: Write a brief, genuine spotlight on a single AI agent from the AgentCrush index.",
    "This is not an ad. It is an operator noticing something worth sharing.",
    "",
    "AGENT DETAILS:",
    `Name: ${name}`,
    handle ? `Handle: ${handle}` : "",
    archetype ? `Archetype: ${archetype}` : "",
    category ? `Category: ${category}` : "",
    bio ? `Bio: ${bio}` : "",
    `Tracked on: ${siteUrl}`,
    "",
    "WHAT TO WRITE:",
    "- One clear observation about why this agent is worth watching right now",
    "- Ground it in what the agent actually does (use the bio)",
    "- Mention the handle if relevant",
    `- You MAY include '${siteUrl}' to link the index — keep it natural, not promotional`,
    "- Do NOT just describe the bio. Add a take. What makes it interesting from an operator's view?",
    "",
    "VOICE: direct, dry, opinionated. Field notes, not marketing.",
    "No hashtags. No generic praise. No 'excited to share'. One emoji maximum — acceptable: →, ↑, ↓, 📍, 🔍, 📊. Never: 🚀🔥💡 or hype emoji.",
    "Do not start with 'Everyone', 'Most', 'Nobody', 'People', 'The real'.",
    "Do not start any sentence with 'AgentCrush'.",
  ].filter(Boolean).join("\n");
}

function buildWeeklySummaryPrompt(job) {
  const c = job.context || {};
  const subtype = c.subtype || "db_recap";
  const agentStats = c.agent_stats || {};
  const signalSummary = c.signal_summary || {};
  const topSignals = c.top_signals || [];
  const maxChars = job.max_chars || 260;

  const basePersona = [
    "You are Mike Matsh, AI operator of AgentCrush — the index that tracks every agent in the ecosystem.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_post","text":"..."}',
    `Hard limit: text <= ${maxChars} characters.`,
    "",
    "VOICE: direct, dry, opinionated. Field notes from an operator. No marketing.",
    "No hashtags. No generic praise. No 'excited to share'. One emoji maximum — acceptable: →, ↑, ↓, 📍, 🔍, 📊. Never: 🚀🔥💡 or hype emoji.",
    "Do not start with 'Everyone', 'Most', 'Nobody', 'People', 'The real'.",
    "Do not start any sentence with 'AgentCrush'.",
  ];

  if (subtype === "db_recap") {
    const topAgentList = (agentStats.top_agents || [])
      .slice(0, 3)
      .map(a => a.handle ? `@${a.handle}` : a.name)
      .join(", ");

    return [
      ...basePersona,
      "",
      "TASK: Write a brief weekly DB recap post.",
      "This is you, the operator, sharing raw numbers from the index at the end of the week.",
      "Make it feel like a field report, not a press release.",
      "",
      "WEEKLY STATS:",
      `Total active agents indexed: ${agentStats.total_active || "unknown"}`,
      `New agents added this week: ${agentStats.new_agents_this_week || 0}`,
      `Signals processed this week: ${signalSummary.signals_observed || 0}`,
      topAgentList ? `Top agents by visibility: ${topAgentList}` : "",
      "",
      "FORMAT HINT: Lead with a number or concrete observation. End with something worth noting.",
      "Example style (do not copy): 'End of week. 412 agents indexed, 7 new. Three agents I hadn't noticed before are now showing up consistently.'",
    ].filter(Boolean).join("\n");
  }

  // ecosystem_observations
  const signalList = topSignals.length
    ? topSignals.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join("\n")
    : "(no specific signals available — draw from general ecosystem knowledge)";

  return [
    ...basePersona,
    "",
    "TASK: Write a brief weekly ecosystem observation post.",
    "This is you sharing what patterns you noticed across the AI agent ecosystem this week.",
    "Not a summary of news — your interpretation of what the signals mean.",
    "",
    "KEY SIGNALS FROM THIS WEEK:",
    signalList,
    "",
    `Posts published by the account this week: ${signalSummary.posts_published || 0}`,
    "",
    "FORMAT HINT: Pick one non-obvious connection or pattern. State it directly.",
    "Example style (do not copy): 'This week two separate signals pointed at the same gap: agent observability. Not coincidence.'",
  ].filter(Boolean).join("\n");
}

function buildDeveloperPrompt(job, briefingBlock = "", topicsBlock = "") {
  const c = job.context || {};

  if (job.job_type === "x_post" && c.mode === "x_repost_comment") {
    return buildRepostCommentPrompt(job);
  }

  if (job.job_type === "x_post" && c.mode === "x_agent_spotlight") {
    return buildSpotlightPrompt(job);
  }

  if (job.job_type === "x_post" && c.mode === "weekly_summary") {
    return buildWeeklySummaryPrompt(job);
  }

  if (job.job_type === "x_post" && Array.isArray(c.roundup_items) && c.roundup_items.length > 0) {
    return buildRoundupXPostPrompt(job, briefingBlock, topicsBlock);
  }

  if (job.job_type === "x_post") {
    return buildCanonXPostPrompt(job, briefingBlock, topicsBlock);
  }

  if (job.job_type === "x_reply") {
    return buildReplyPrompt(job);
  }

  if (job.job_type === "x_quote") {
    return buildQuotePrompt(job);
  }

  if (job.job_type === "x_repost_comment") {
    return buildRepostCommentPrompt(job);
  }

  return [
    "You are CopyDesk.",
    "Output MUST be a single JSON object matching the provided JSON Schema.",
    "No markdown fences. No commentary. No extra keys.",
  ].join(" ");
}

// Weekdays target $2-2.5/day: cap at 12 jobs. Weekends: 20 jobs.
function getCopydeskDailyCap() {
  try {
    const activity = JSON.parse(fs.readFileSync("/opt/agentcrush/state/daily_activity.json", "utf8"));
    if (activity.is_weekend) return 20;
  } catch {}
  const day = new Date().getUTCDay();
  return (day === 0 || day === 6) ? 20 : 12;
}
const COPYDESK_DAILY_CAP = getCopydeskDailyCap();
const COPYDESK_DAILY_CAP_NOTIFIED_FILE = "/opt/agentcrush/state/copydesk_daily.json";

function readCopydeskDailyState() {
  try {
    const raw = fs.readFileSync(COPYDESK_DAILY_CAP_NOTIFIED_FILE, "utf8");
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (data.date === today) return data;
  } catch {}
  return { date: new Date().toISOString().slice(0, 10), cap_notified: false };
}

function writeCopydeskDailyState(state) {
  try {
    fs.mkdirSync("/opt/agentcrush/state", { recursive: true });
    fs.writeFileSync(COPYDESK_DAILY_CAP_NOTIFIED_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {}
}

async function countCopydeskJobsToday() {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("copydesk_jobs")
    .select("*", { count: "exact", head: true })
    .in("status", ["ready", "processing", "failed"])
    .gte("created_at", todayStart.toISOString());
  if (error) throw error;
  return Number(count || 0);
}

async function sendCopydeskCapAlert() {
  try {
    await supabase.from("alerts").insert([{
      severity: "warn",
      code: "copydesk_daily_cap",
      message: `Copydesk daily cap (${COPYDESK_DAILY_CAP} jobs) reached. No more jobs will be processed today.`,
      resolved: false,
    }]);
  } catch {}
}

async function main() {
  const workflow_id = "wf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  _activeWorkflowId = workflow_id;
  console.log(`copydesk workflow_id=${workflow_id}`);
  await createWorkflow(workflow_id);

  // Daily job cap check
  const copydeskDailyState = readCopydeskDailyState();
  const jobsProcessedToday = await countCopydeskJobsToday();
  if (jobsProcessedToday >= COPYDESK_DAILY_CAP) {
    if (!copydeskDailyState.cap_notified) {
      await sendCopydeskCapAlert();
      copydeskDailyState.cap_notified = true;
      writeCopydeskDailyState(copydeskDailyState);
    }
    console.log(`copydesk: daily cap reached (${jobsProcessedToday}/${COPYDESK_DAILY_CAP}), skipping`);
    await logWorkflowEvent({
      workflow_id,
      trace_id: "tr_" + Math.random().toString(36).slice(2, 9),
      role: "copydesk",
      task_type: "publish",
      input: { reason: "daily_cap_reached", jobs_today: jobsProcessedToday },
      decision: null,
      output: { skipped: true },
      status: "done",
    });
    await closeWorkflow(workflow_id, "completed");
    await logRun("ok", { msg: "daily_cap_reached", jobs_today: jobsProcessedToday });
    return;
  }

  const banned = await getBannedPhrases();
  const recentTexts = await getRecentPublishedAndQueuedTexts(20);

  // Load briefing context and recent topics once per run
  const briefing = getLatestBriefing();
  const briefingBlock = buildBriefingBlock(briefing);

  const { data: jobs, error: qErr } = await supabase
    .from("copydesk_jobs")
    .select("*")
    .eq("status", "queued")
    .in("job_type", ["x_post", "x_reply", "x_quote", "asset_prompt", "compat_report"])
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(10);

  if (qErr) throw qErr;

  if (!jobs || jobs.length === 0) {
    await logWorkflowEvent({
      workflow_id,
      trace_id: "tr_" + Math.random().toString(36).slice(2, 9),
      role: "copydesk",
      task_type: "publish",
      input: { reason: "no_jobs" },
      decision: null,
      output: { skipped: true },
      status: "done",
    });
    await closeWorkflow(workflow_id, "completed");
    await logRun("ok", { msg: "no_jobs" });
    return;
  }

  for (const job of jobs) {
    try {
      await markJob(job.id, {
        status: "processing",
        error: null,
        updated_at: new Date().toISOString(),
      });

      // Theme-repeat guard: skip x_post generation if the job's context matches
      // a theme cluster Mike already posted about in the last 48h.
      if (job.job_type === "x_post") {
        const contextText = [
          safeString(job.context?.context_summary),
          safeString(job.context?.target_text),
          (job.context?.signal_tags || []).join(" "),
        ].join(" ");
        const coveredClusters = getCoveredThemeClusters();
        const jobClusters = detectThemeClusters(contextText);
        const overlap = [...jobClusters].filter(c => coveredClusters.has(c));
        if (overlap.length > 0) {
          await markJob(job.id, {
            status: "failed",
            error: JSON.stringify([{ code: "THEME_REPEAT", msg: `clusters: ${overlap.join(",")}` }]),
            updated_at: new Date().toISOString(),
          });
          await logRun("ok", {
            job_id: job.id,
            job_type: job.job_type,
            skipped: "theme_repeat",
            clusters: overlap,
          });
          continue;
        }
      }

      // Native content cap: AgentCrush-native posts must stay under 20% of total posts
      // in the last 7 days. Skip when over cap so external content gets priority.
      if (job.job_type === "x_post" && job.context?.source === "agentcrush_native") {
        const { total, native, ratio } = getNativeContentRatio();
        if (total >= 5 && ratio >= 0.20) {
          await markJob(job.id, {
            status: "failed",
            error: JSON.stringify([{ code: "NATIVE_CONTENT_CAP", msg: `native=${native}/${total} ratio=${ratio.toFixed(2)}` }]),
            updated_at: new Date().toISOString(),
          });
          await logRun("ok", {
            job_id: job.id,
            job_type: job.job_type,
            skipped: "native_content_cap",
            native_ratio: ratio,
          });
          continue;
        }
      }

      const isRepostComment = job.job_type === "x_post" && job.context?.mode === "x_repost_comment";
      const schema = isRepostComment ? X_REPOST_COMMENT_SCHEMA : pickSchema(job.job_type);
      const topicsBlock = buildRecentTopicsBlock(isRepostComment ? "x_repost_comment" : job.job_type, job.context);
      const developerPrompt = buildDeveloperPrompt(job, briefingBlock, topicsBlock);

      // Use mini for repost_comment (brief, 200 char max); synthesis for original posts
      const modelForJob = (isRepostComment || job.job_type !== "x_post") ? OPENAI_MODEL : SYNTHESIS_MODEL;

      const userPayload = JSON.stringify({
        job_type: job.job_type,
        subject_type: job.subject_type,
        subject_id: job.subject_id,
        context: job.context,
        max_chars: job.max_chars ?? null,
      });

      let { obj, usage } = await openaiJson({
        schema,
        model: modelForJob,
        messages: [
          { role: "developer", content: developerPrompt },
          { role: "user", content: userPayload },
        ],
      });

      // Template opening guard: if the first attempt starts with a banned word, regenerate once.
      let templateOpeningFailed = false;
      const isTextJob = job.job_type === "x_post" || job.job_type === "x_reply" || job.job_type === "x_quote" || isRepostComment;
      if (isTextJob && hasTemplateOpening(safeString(obj.text))) {
        const badWord = safeString(obj.text).split(/\s+/)[0];
        console.log(`copydesk: banned opening "${badWord}" on attempt 1 — regenerating job ${job.id}`);

        const retryDevPrompt =
          developerPrompt +
          `\n\nREGENERATE REQUIRED: The previous attempt opened with "${badWord}" which is a banned template pattern. ` +
          `Do NOT start with: Everyone, Most, Nobody, People, "The real". ` +
          `Open with a specific agent name, framework, tool, concrete data point, or direct observation instead.`;

        const { obj: retryObj, usage: retryUsage } = await openaiJson({
          schema,
          model: modelForJob,
          messages: [
            { role: "developer", content: retryDevPrompt },
            { role: "user", content: userPayload },
          ],
        });

        obj = retryObj;
        usage = {
          prompt_tokens: (usage.prompt_tokens || 0) + (retryUsage.prompt_tokens || 0),
          completion_tokens: (usage.completion_tokens || 0) + (retryUsage.completion_tokens || 0),
        };

        if (hasTemplateOpening(safeString(retryObj.text))) {
          const badWord2 = safeString(retryObj.text).split(/\s+/)[0];
          console.log(`copydesk: banned opening "${badWord2}" on attempt 2 — marking job failed ${job.id}`);
          templateOpeningFailed = true;
        }
      }

      const errors = [];
      let x_text = null;
      let report_markdown = null;
      let asset_prompt = null;

if (obj.type === "x_post" || obj.type === "x_reply" || obj.type === "x_quote" || obj.type === "x_repost_comment") {
  const raw_text = safeString(obj.text);
  const max = Number(job.max_chars || 280);
  x_text = raw_text;

  if (raw_text.length > max) {
    errors.push({ code: "CAP", msg: `x_text>${max}` });
    x_text = raw_text.slice(0, max).trim();
  }

  if (!x_text) {
    errors.push({ code: "EMPTY", msg: "x_text_empty" });
  }

        const bannedMatches = phraseHits(x_text, banned);
        if (bannedMatches.length) {
          errors.push({ code: "BANNED", msg: bannedMatches.join(",") });
        }

        const styleMatches = styleHits(x_text);
        if (styleMatches.length) {
          errors.push({ code: "STYLE", msg: styleMatches.join(",") });
        }

        if (templateOpeningFailed) {
          errors.push({ code: "TEMPLATE_OPENING", msg: safeString(obj.text).split(/\s+/)[0] });
        }

        if (looksTooSimilarToRecent(x_text, recentTexts)) {
          errors.push({ code: "REPEAT", msg: "too_similar_to_recent_post" });
        }
      } else if (obj.type === "compat_report") {
        report_markdown = toMarkdownCompat(obj);
        const bannedMatches = phraseHits(report_markdown, banned);
        if (bannedMatches.length) {
          errors.push({ code: "BANNED", msg: bannedMatches.join(",") });
        }
      } else if (obj.type === "asset_prompt") {
        asset_prompt = safeString(obj.prompt);
        const bannedMatches = phraseHits(asset_prompt, banned);
        if (bannedMatches.length) {
          errors.push({ code: "BANNED", msg: bannedMatches.join(",") });
        }
      } else {
        errors.push({ code: "TYPE", msg: "unknown type" });
      }

      const { error: outErr } = await supabase.from("copydesk_outputs").insert([
        {
          job_id: job.id,
          output: obj,
          x_text,
          report_markdown,
          asset_prompt,
          valid_json: true,
          valid_caps: !errors.some((e) => e.code === "CAP"),
          valid_banned_phrases: !errors.some((e) => e.code === "BANNED"),
          validation_errors: errors,
          model: modelForJob,
          tokens_in: usage.prompt_tokens ?? null,
          tokens_out: usage.completion_tokens ?? null,
        },
      ]);

      if (outErr) throw outErr;

      const hardErrors = errors.filter((e) => e.code !== "CAP");
      const jobSucceeded = !hardErrors.length;

      await markJob(job.id, {
        status: jobSucceeded ? "ready" : "failed",
        error: hardErrors.length ? JSON.stringify(hardErrors) : (errors.length ? JSON.stringify(errors) : null),
        updated_at: new Date().toISOString(),
      });

      // Update topic memory after successful generation
      if (jobSucceeded && job.job_type === "x_post" && x_text) {
        const keywords = extractTopicKeywords(x_text, job.context);
        const authorHandle = safeString(job.context?.target_author || job.context?.agent_a?.handle);
        const firstWord = x_text.trim().split(/\s+/)[0] || null;
        const isNative = job.context?.source === "agentcrush_native";
        updateRecentTopics(keywords, authorHandle, job.job_type, firstWord, isNative);
      } else if (jobSucceeded && (job.job_type === "x_quote" || job.job_type === "x_reply" || isRepostComment) && x_text) {
        const authorHandle = safeString(job.context?.target_author);
        updateRecentTopics([], authorHandle, isRepostComment ? "x_repost_comment" : job.job_type, null, false);
      }

      await logWorkflowEvent({
        workflow_id,
        trace_id: "tr_" + Math.random().toString(36).slice(2, 9),
        role: "copydesk",
        task_type: "publish",
        input: { job_id: job.id, job_type: job.job_type, subject_type: job.subject_type ?? null },
        decision: { model: modelForJob, is_repost_comment: isRepostComment },
        output: { status: jobSucceeded ? "ready" : "failed", chars: x_text ? x_text.length : null, errors: errors.map(e => e.code) },
        status: "done",
      });

      await logRun("ok", {
        job_id: job.id,
        job_type: job.job_type,
        model: modelForJob,
        status: errors.length ? "failed" : "ready",
        briefing_used: !!briefing,
      });
    } catch (e) {
      await markJob(job.id, {
        status: "failed",
        error: String(e?.message || e),
        updated_at: new Date().toISOString(),
      }).catch(() => {});

      await logRun("error", { job_id: job.id }, String(e?.message || e));
      continue;
    }
  }

  await logWorkflowEvent({
    workflow_id,
    trace_id: "tr_" + Math.random().toString(36).slice(2, 9),
    role: "copydesk",
    task_type: "publish",
    input: { jobs_processed: jobs.length },
    decision: null,
    output: { completed: true },
    status: "done",
  });
  await closeWorkflow(workflow_id, "completed");
}

main().catch(async (e) => {
  await closeWorkflow(_activeWorkflowId, "failed");
  await logRun("error", { fatal: true }, String(e?.message || e));
  process.exit(1);
});
