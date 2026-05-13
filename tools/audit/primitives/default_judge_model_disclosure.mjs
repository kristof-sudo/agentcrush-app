// Primitive: default_judge_model_disclosure
//
// For a project that uses an LLM-as-judge / LLM-grader pattern, is the
// default judge model disclosed to the user (via docs or a configurable
// surface) or silently hardcoded?
//
// Field-lab origin: agentcrush-field-lab/14-evals-observability/field-report.md.
// Canonical positive case: braintrustdata/autoevals — DEFAULT_MODEL in
// py/autoevals/llm.py.

import { walk, readText, findLines } from "./_lib.mjs";

export const name = "default_judge_model_disclosure";
export const description =
  "Checks whether a project that uses LLM-as-judge evals discloses the default judge model.";

// Model identifiers commonly used as judge models. Order: more specific first
// so the first match wins if we ever care; we use .test() not .exec() though.
const MODEL_RE = new RegExp(
  String.raw`\b(` +
    [
      // OpenAI
      "gpt-5(?:-mini|-nano|-turbo)?",
      "gpt-4o(?:-mini)?",
      "gpt-4(?:-turbo|-mini)?(?:-preview)?",
      "gpt-4\\.[0-9]+(?:-mini|-turbo)?",
      "gpt-3\\.5(?:-turbo)?",
      "o1(?:-mini|-preview)?",
      "o3(?:-mini)?",
      // Anthropic
      "claude-3(?:-5|\\.5|-7|\\.7)?(?:-sonnet|-opus|-haiku)(?:-[0-9]{6,8})?",
      "claude-(?:sonnet|opus|haiku)-[0-9]+(?:-[0-9]+)?",
      "claude-3-(?:opus|sonnet|haiku)-[0-9]+",
      // Google
      "gemini-(?:1\\.5|2|2\\.0|2\\.5)-(?:pro|flash)(?:-[a-z0-9-]+)?",
      // Meta / open
      "llama-?3(?:\\.[0-9]+)?-[0-9]+b(?:-instruct)?",
      "mixtral-[0-9]+x[0-9]+b",
    ].join("|") +
    String.raw`)\b`,
  "i",
);

// Identifiers in proximity to a model name that suggest "judge / eval / grader".
const JUDGE_RE = /\b(judge|grader|scorer|llm[_-]?as[_-]?judge|autoeval|auto_eval|rubric|eval(?:uator|uation)?)\b/i;

// Default-ish: assignments like DEFAULT_MODEL, default_model, JUDGE_MODEL, etc.
const DEFAULT_NAME_RE = /\b(default[_-]?model|judge[_-]?model|grader[_-]?model|scorer[_-]?model|eval[_-]?model|model[_-]?default)\b/i;

// Env var read patterns (Python + JS/TS).
const ENV_READ_RE = /(?:os\.environ(?:\.get)?\s*\(\s*["']([A-Z0-9_]+)["']|process\.env\.([A-Z0-9_]+))/;

// Doc phrases that indicate user-facing disclosure.
const DOC_PHRASE_RE =
  /\b(default\s+(?:judge\s+)?model|judge\s+model|llm[-_ ]?as[-_ ]?(?:a[-_ ]?)?judge|grader\s+model|evaluation\s+model|configure\s+(?:the\s+)?(?:default\s+)?model)\b/i;

const DOC_FILE_RE = /(^|\/)(readme(\.[a-z]+)?|docs?\/.*\.(md|mdx|rst|txt)|.*\.md|.*\.mdx)$/i;

function snippetAround(lines, lineIdx, ctx = 1) {
  const start = Math.max(0, lineIdx - ctx);
  const end = Math.min(lines.length, lineIdx + ctx + 1);
  return lines.slice(start, end).join("\n").trim();
}

/**
 * @param {{kind:"local"|"github", path:string, url:string|null}} target
 * @returns {Promise<object>}
 */
export async function run(target) {
  const evidence = [];
  let sawJudgeContext = false;
  let sawHardcodedDefault = false;
  let sawEnvOrConfig = false;
  let sawDocDisclosure = false;
  let sawCodeCommentDisclosure = false;

  for await (const { rel, abs } of walk(target.path)) {
    const text = await readText(abs);
    if (!text) continue;
    const lines = text.split("\n");
    const lowerRel = rel.toLowerCase();
    const isDoc = DOC_FILE_RE.test(lowerRel);
    // Test files are noisy and don't reflect product surface. Skip for code scans.
    const isTest =
      /(^|\/)tests?\//.test(lowerRel) ||
      /(^|\/)test_[^/]+\.(py|mjs|js|ts|tsx)$/.test(lowerRel) ||
      /[._-]test\.(py|mjs|js|ts|tsx|go)$/.test(lowerRel) ||
      /\.spec\.(mjs|js|ts|tsx)$/.test(lowerRel);

    // Doc disclosure: phrase + model name within a 5-line window, OR phrase
    // alone if it explicitly says "default judge model".
    if (isDoc) {
      for (let i = 0; i < lines.length; i++) {
        if (!DOC_PHRASE_RE.test(lines[i])) continue;
        const window = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join("\n");
        const modelHit = MODEL_RE.exec(window);
        if (modelHit || /default\s+(?:judge\s+)?model/i.test(lines[i])) {
          sawDocDisclosure = true;
          evidence.push({
            file: rel,
            line: i + 1,
            snippet: snippetAround(lines, i, 1).slice(0, 240),
            kind: modelHit ? "doc_discloses_model" : "doc_mentions_default_model",
          });
          // don't break; we want a couple of doc hits if present, but cap.
          if (evidence.filter((e) => e.kind.startsWith("doc_")).length >= 3) break;
        }
      }
    }

    // Source code: look for judge-context AND a model name AND a default-like
    // identifier on the same or adjacent line.
    if (!isDoc && !isTest) {
      const fileHintsJudge = /(eval|judge|grader|score|autoeval|rubric)/i.test(lowerRel);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const window = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join("\n");

        const hasJudge = JUDGE_RE.test(window) || fileHintsJudge;
        const hasModel = MODEL_RE.test(l);
        const hasDefaultName = DEFAULT_NAME_RE.test(window);

        if (hasJudge) sawJudgeContext = true;

        // Hardcoded default judge model: assignment-like line with a model
        // literal and a default-ish identifier in scope, in a judge context.
        if (hasJudge && hasModel && hasDefaultName) {
          // Try to confirm it's an assignment / constant (=, : in a dict, etc.)
          if (/[=:]/.test(l)) {
            sawHardcodedDefault = true;
            evidence.push({
              file: rel,
              line: i + 1,
              snippet: l.trim().slice(0, 240),
              kind: "hardcoded_default",
            });
            // Look backward up to 3 lines for a comment that points users at an override.
            const back = lines.slice(Math.max(0, i - 3), i).join("\n");
            if (/(use|see|set|pass|configure|override)[^\n]{0,60}\b(init|default_model|env|environ|config)\b/i.test(back) ||
                /\b(deprecated|use\s+init)/i.test(back)) {
              sawCodeCommentDisclosure = true;
              evidence.push({
                file: rel,
                line: i, // the comment line above
                snippet: back.trim().split("\n").pop().slice(0, 240),
                kind: "code_comment_discloses_override",
              });
            }
          }
        }

        // Env var read: a process.env / os.environ.get adjacent to a model
        // or judge identifier counts as configurable.
        const envMatch = ENV_READ_RE.exec(l);
        if (envMatch && (hasJudge || hasDefaultName || hasModel)) {
          const varName = envMatch[1] || envMatch[2];
          if (/MODEL|JUDGE|GRADER|EVAL|SCORER/i.test(varName)) {
            sawEnvOrConfig = true;
            evidence.push({
              file: rel,
              line: i + 1,
              snippet: l.trim().slice(0, 240),
              kind: "env_var_configurable",
            });
          }
        }
      }
    }

    // Don't let evidence grow unbounded.
    if (evidence.length > 40) break;
  }

  // Decide status.
  let status;
  let notes;
  if (!sawJudgeContext && !sawHardcodedDefault && !sawDocDisclosure) {
    status = "not_applicable";
    notes =
      "No LLM-as-judge / grader / scorer pattern detected in this source tree. Primitive does not apply.";
  } else if (sawDocDisclosure && (sawEnvOrConfig || !sawHardcodedDefault)) {
    status = "disclosed";
    notes =
      "Default judge model is documented and/or read from a configurable surface (env var or config).";
  } else if (sawHardcodedDefault && (sawDocDisclosure || sawCodeCommentDisclosure)) {
    // Hardcoded default but the override path is disclosed — canonical
    // "partial" (Braintrust Autoevals shape).
    status = "partial";
    notes =
      "Default judge model is hardcoded, but the default is named and the override path is disclosed (docs or in-source comment). Canonical hardcoded-and-disclosed shape.";
  } else if (sawHardcodedDefault) {
    status = "partial";
    notes =
      "Default judge model is hardcoded in a judge/eval/scorer code path. Some user-facing override may exist but documentation of the default was not found in README/docs or adjacent comments.";
  } else if (sawJudgeContext && sawEnvOrConfig) {
    status = "disclosed";
    notes =
      "Judge/eval surface exists and reads model from a configurable env var or config field.";
  } else {
    status = "undisclosed";
    notes =
      "Judge/eval surface exists in code, but no documentation of the default and no user-facing config knob were found.";
  }

  return {
    primitive: name,
    target: target.url || target.path,
    status,
    evidence: evidence.slice(0, 20),
    notes,
  };
}

/** Render a short markdown report fragment for a result. */
export function renderMarkdown(result) {
  const lines = [];
  lines.push(`### \`default_judge_model_disclosure\` — \`${result.status}\``);
  lines.push("");
  lines.push(`**Target:** ${result.target}`);
  lines.push("");
  lines.push(result.notes);
  if (result.evidence.length) {
    lines.push("");
    lines.push("**Evidence:**");
    lines.push("");
    for (const e of result.evidence.slice(0, 6)) {
      const loc = e.line ? `${e.file}:${e.line}` : e.file;
      const snip = e.snippet ? ` — \`${e.snippet.replace(/`/g, "ʼ").slice(0, 140)}\`` : "";
      lines.push(`- [\`${e.kind}\`] ${loc}${snip}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
