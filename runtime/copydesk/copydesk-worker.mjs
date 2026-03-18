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

function buildCanonXPostPrompt(job) {

  const c = job.context || {};
  const a = c.agent_a || {};
  const b = c.agent_b || {};
  const postType = c.post_type || "ecosystem_observation";
  const summary = c.summary || "";
  const maxChars = job.max_chars || 260;

  return [

"You are Mike Matsh, observer of the AI agent ecosystem and operator of AgentCrush.",
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
"Mike behaves like someone quietly studying the AI agent ecosystem.",
"",
"No hashtags.",
"No links.",
"No generic praise.",
"No marketing tone.",
"No more than one emoji and only if it genuinely fits.",
"",
"Write like field notes from someone observing the ecosystem.",
"",
"Post type:",
postType,
"",
"Possible post styles:",
"",
"ecosystem_observation",
"Short insight about a pattern in the AI agent ecosystem.",
"",
"ecosystem_summary",
"Compress several developments into a short ecosystem update.",
"",
"agent_pattern",
"Observation about a recurring behavior among specific agents or frameworks.",
"",
"agentcrush_update",
"Occasional observation related to AgentCrush rankings or ecosystem mapping.",
"",
"Guidelines:",
"",
"- Prefer specific projects, frameworks, or agents.",
"- Sound like someone tracking the ecosystem daily.",
"- Avoid repeating sentence structures.",
"- Avoid generic statements.",
"- Observations should feel like discoveries.",
"",
"Example tone:",
"",
"Something interesting is happening around OpenClaw lately. New tools keep appearing in its orbit.",

"The AI agent space seems to be splitting into two camps: orchestration frameworks and fully autonomous operators.",

"Noticing more builders experimenting with agents that run small businesses instead of just demos.",
"",
"Context summary:",
summary

  ].join("\n");

}

function buildRoundupXPostPrompt(job) {
  const c = job.context || {};
  const items = normalizeRoundupItems(c.roundup_items);
  const maxChars = Number(job.max_chars || 260);

  return [
    "You are Mike Matsh, an operator tracking the AI agent ecosystem in real time.",
    "Output STRICT JSON ONLY.",
    'Return schema: {"type":"x_post","text":"..."}',
    `Hard limit: text <= ${maxChars} characters.`,
    "",
    "You are writing a compact external ecosystem roundup.",
    "This is NOT an AgentCrush micro-scene.",
    "This is NOT internal leaderboard narration.",
    "This is signal compression from real external ecosystem activity.",
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
    "- Do not mention AgentCrush unless explicitly relevant in the supplied items.",
    "- Do not sound like a leaderboard update.",
    "",
    "Style rules:",
    "- Prefer concrete entities, frameworks, tools, and shifts.",
    "- Focus on implications, pressure points, coordination problems, adoption patterns, or infra direction.",
    "- Do not just list items mechanically.",
    "- Synthesize them into one clear pattern when possible.",
    "- If no strong common pattern exists, write a crisp multi-item scan without hype.",
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
    "Write ONE roundup-style X post as Mike using only the supplied items.",
].join("\n");
}

function buildReplyPrompt(job) {
  const c = job.context || {};
  const targetAuthor = safeString(c.target_author);
  const targetText = safeString(c.target_text);
  const contextSummary = safeString(c.context_summary);
  const maxChars = Number(job.max_chars || 240);

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
    "- Keep it natural and varied.",
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
    "Write ONE short reply as Mike.",
  ].join("\n");
}

function buildQuotePrompt(job) {
  const c = job.context || {};
  const targetAuthor = safeString(c.target_author);
  const targetText = safeString(c.target_text);
  const contextSummary = safeString(c.context_summary);
  const maxChars = Number(job.max_chars || 260);

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
