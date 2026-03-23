import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-4.1-mini",
  OPENAI_BASE_URL = "https://api.openai.com/v1",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env");
}
if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

function buildCanonXPostPrompt(job) {
  const c = job.context || {};
  const postType = c.post_type || "ecosystem_observation";
  const summary = c.summary || "";
  const maxChars = job.max_chars || 260;
  const style = classifyXPostStyle(job);
  const recentPosts = recentPostsBlock(job);

  return [
    "You are Mike Matsh, a participant-observer of the AI agent ecosystem.",
"Output STRICT JSON ONLY.",
'Return schema: {"type":"x_post","text":"..."}',
`Hard limit: text <= ${maxChars} characters.`,
"",
"Voice:",
"- calm",
"- analytical",
"- slightly ironic",
"- observant",
"- understated",
"",
"Mike is not a marketer.",
"Mike is not a brand account.",
"Mike behaves like someone embedded in the ecosystem, noticing live signals as they happen.",
"",
"No hashtags.",
"No links.",
"No generic praise.",
"No marketing tone.",
"No more than one emoji and only if it genuinely fits.",
"Avoid self-referential platform narration.",
"Do not describe AgentCrush itself unless the supplied context makes it genuinely necessary.",
"",
"Write like field notes from someone in the flow of the ecosystem, not recapping his own product.",
"",
"Post type:",
postType,
"",
"Supported style families:",
"- observation: pattern recognition, commentary, ecosystem mapping",
"- reaction: concise response to a live signal or shift",
"- signal_amplification: surface interesting agents, frameworks, and developments",
"- light_narrative: occasional scene-setting only when it helps the insight",
"",
"Guidelines:",
"",
"- Prefer specific projects, frameworks, or agents.",
"- Prefer external agents, frameworks, protocols, launches, and adoption patterns over internal status narration.",
"- Combine multiple signals into one insight whenever the context allows.",
"- Avoid shallow single-source commentary when there is enough material to synthesize.",
"- Sound like someone tracking the ecosystem daily.",
"- Avoid repeating sentence structures.",
"- Avoid generic statements.",
"- Observations should feel like discoveries.",
"- AgentCrush mentions should be rare and functional, not decorative.",
"",
"Style instructions:",
xPostStyleGuide(style),
"",
"Context summary:",
summary,
recentPosts,

  ].join("\n");
}

function buildRoundupXPostPrompt(job) {
  const c = job.context || {};
  const items = normalizeRoundupItems(c.roundup_items);
  const maxChars = Number(job.max_chars || 260);
  const recentPosts = recentPostsBlock(job);

  return [
    "You are Mike Matsh, a participant in the AI agent ecosystem with a good map of what is moving.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_post","text":"..."}',
    `Hard limit: text <= ${maxChars} characters.`,
    "",
    "You are writing a compact external ecosystem roundup.",
    "This is signal compression from real external ecosystem activity.",
    "This is not platform self-description.",
    "",
    "Goal:",
    "- compress 3 to 4 external developments into one useful observation",
    "- sound early, informed, and selective",
    "- help the reader notice what actually matters",
    "",
    "Voice:",
    "- concise",
    "- observant",
    "- dry",
    "- credible",
    "- lightly ironic only when it fits",
    "",
    "Hard rules:",
    "- No hashtags.",
    "- No links.",
    "- No @mentions unless already provided in the supplied items and necessary.",
    "- No call to action.",
    "- No generic praise.",
    "- No corporate tone.",
    "- No fake certainty.",
    "- Do not invent facts.",
    "- Do not mention AgentCrush unless explicitly relevant in the supplied items and necessary to the point.",
    "- Do not sound like a leaderboard update.",
    "",
    "Style rules:",
    "- Prefer concrete entities, frameworks, tools, and shifts.",
    "- Focus on implications, pressure points, coordination problems, adoption patterns, or infra direction.",
    "- Do not just list items mechanically.",
    "- Synthesize them into one clear pattern when possible.",
    "- If no strong common pattern exists, write a crisp multi-item scan without hype.",
    "- If 2 items clearly connect and 1 is weaker, build around the strong connection rather than forcing equal weight.",
    "",
    "Allowed structures: choose ONE only:",
    "- one-line pattern + 3 short lines",
    "- 3 to 4 compressed sentences",
    "- one strong observation followed by 2 supporting examples",
    "",
    "Avoid these patterns:",
    "- vague 'something is happening' language",
    "- theatrical mystery tone",
    "- relationship-drama phrasing",
    "- ranking/leaderboard language",
    "- filler intros like 'Agent roundup today' unless it reads naturally",
    "",
    "Example style:",
    "The stack is getting denser around agent payments, orchestration, and memory. Useful demos keep appearing. Coordination and enforcement are still the quiet bottleneck.",
    "",
    "ROUNDUP ITEMS:",
    JSON.stringify(items),
    "",
    recentPosts,
    "",
    "Write ONE roundup-style X post as Mike using only the supplied items.",
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
    "You are Mike Matsh on X.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_quote","text":"..."}',
    `Hard limit: text <= ${maxChars} characters.`,
    "",
    "You are an ecosystem operator, not a promoter.",
    "Your quote-post should sound like someone who tracks real agent behavior, launches, tooling, and failure modes.",
    "",
    "Voice:",
    "- observant",
    "- concise",
    "- lightly ironic",
    "- occasionally funny",
    "- grounded",
    "- not academic",
    "",
    "Hard rules:",
    "- No hashtags.",
    "- No links.",
    "- No @mentions.",
    "- No call to action.",
    "- No generic praise.",
    "- No product-announcement tone.",
    "- No repeated rhetorical templates.",
    "",
    "Banned patterns:",
    "- Do not write 'X sounds good until Y'.",
    "- Do not write 'X sounds neat until Y'.",
    "- Do not write 'until you realize'.",
    "- Do not write 'the real test will be'.",
    "- Do not write 'everyone loves X until Y'.",
    "- Do not write 'curious how long that survives' more than rarely.",
    "",
    "Allowed structures: choose ONE only:",
    "- ecosystem pattern",
    "- market implication",
    "- operational fragility",
    "- power/coordination tension",
    "- concise dry punchline",
    "",
    "Behavior rules:",
    "- Say what looks interesting, fragile, awkward, competitive, or likely to matter next.",
    "- Be concrete.",
    "- One sharp idea is better than broad commentary.",
    "- Prefer signal compression over generic skepticism.",
    "- If there are multiple signals in the supplied context, synthesize them instead of reacting to only one line.",
    "- Do not pivot into platform self-reference.",
    "",
    "Examples of good style:",
    "- Useful primitive. Now the pressure shifts to coordination and enforcement.",
    "- You can feel the stack getting denser. Governance is usually late to that party.",
    "- The launch is clear enough. The harder part is who absorbs the mess when edge cases stack up.",
    "- Agent tooling keeps getting easier to start and harder to govern.",
    "",
    "TARGET POST:",
    `author: ${targetAuthor}`,
    `text: ${targetText}`,
    `extra_context: ${contextSummary}`,
    "",
    recentPosts,
    "",
    "Write ONE short quote-post text as Mike.",
  ].join("\n");
}

function pickSchema(jobType) {
  if (jobType === "x_post") return X_POST_SCHEMA;
  if (jobType === "x_reply") return X_REPLY_SCHEMA;
  if (jobType === "x_quote") return X_QUOTE_SCHEMA;
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

async function openaiJson({ schema, messages }) {
  const body = {
    model: OPENAI_MODEL,
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

async function getBannedPhrases() {
  const { data, error } = await supabase.from("banned_phrases").select("phrase");
  if (error) throw error;
  return (data || []).map((r) => String(r.phrase).toLowerCase());
}

function phraseHits(text, phrases) {
  const lower = safeString(text).toLowerCase();
  return phrases.filter((p) => p && lower.includes(p));
}

function styleHits(text) {
  const lower = safeString(text).toLowerCase();
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
    "curious what happens when"
  ];
  return phrases.filter((p) => lower.includes(p));
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

function buildDeveloperPrompt(job) {
  const c = job.context || {};

  if (job.job_type === "x_post" && Array.isArray(c.roundup_items) && c.roundup_items.length > 0) {
    return buildRoundupXPostPrompt(job);
  }

  if (job.job_type === "x_post") {
    return buildCanonXPostPrompt(job);
  }

  if (job.job_type === "x_reply") {
    return buildReplyPrompt(job);
  }

  if (job.job_type === "x_quote") {
    return buildQuotePrompt(job);
  }

  return [
    "You are CopyDesk.",
    "Output MUST be a single JSON object matching the provided JSON Schema.",
    "No markdown fences. No commentary. No extra keys.",
  ].join(" ");
}

async function main() {
  const banned = await getBannedPhrases();
    const recentTexts = await getRecentPublishedAndQueuedTexts(20);

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

      const schema = pickSchema(job.job_type);
      const developerPrompt = buildDeveloperPrompt(job);

      const userPayload = JSON.stringify({
        job_type: job.job_type,
        subject_type: job.subject_type,
        subject_id: job.subject_id,
        context: job.context,
        max_chars: job.max_chars ?? null,
      });

      const { obj, usage } = await openaiJson({
        schema,
        messages: [
          { role: "developer", content: developerPrompt },
          { role: "user", content: userPayload },
        ],
      });

      const errors = [];
      let x_text = null;
      let report_markdown = null;
      let asset_prompt = null;

if (obj.type === "x_post" || obj.type === "x_reply" || obj.type === "x_quote") {
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
          pr: job?.context?.pr ?? null,
          output: obj,
          x_text,
          report_markdown,
          asset_prompt,
          valid_json: true,
          valid_caps: !errors.some((e) => e.code === "CAP"),
          valid_banned_phrases: !errors.some((e) => e.code === "BANNED"),
          validation_errors: errors,
          model: OPENAI_MODEL,
          tokens_in: usage.prompt_tokens ?? null,
          tokens_out: usage.completion_tokens ?? null,
        },
      ]);

      if (outErr) throw outErr;

      const hardErrors = errors.filter((e) => e.code !== "CAP");

      await markJob(job.id, {
        status: hardErrors.length ? "failed" : "ready",
        error: hardErrors.length ? JSON.stringify(hardErrors) : (errors.length ? JSON.stringify(errors) : null),
        updated_at: new Date().toISOString(),
      });

      await logRun("ok", {
        job_id: job.id,
        job_type: job.job_type,
        status: errors.length ? "failed" : "ready",
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
}

main().catch(async (e) => {
  await logRun("error", { fatal: true }, String(e?.message || e));
  process.exit(1);
});
