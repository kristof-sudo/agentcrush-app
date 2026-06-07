-- Migration: 20260608_0900_model_family_seed_big10
-- Seeds proper evidence-ranked entries for the big 10 model families.
--
-- Context: model_family category is almost entirely unscored. Existing rows:
--   cohere (vis 4), gemini (vis 3), deepseek (vis 2), llama (vis 0),
--   mistral (vis 0), qwen (vis 0)
-- Nous Research / Hermes was seeded 2026-06-07 at vis 82.
--
-- Scoring rubric for model_family (composite, weighted):
--   • HF downloads / availability         25%
--   • LMSYS Chatbot Arena rank            25%
--   • GitHub stars (base / org repo)      15%
--   • Derivative models count (HF)        15%
--   • Agentic adoption (CrewAI /          20%
--     LangChain / AutoGen integrations,
--     function calling, MCP)
--
-- Handle policy: keep existing short handles where rows already exist
-- (gemini / llama / cohere / mistral / qwen / deepseek). New rows use the
-- canonical handoff format: openai, anthropic_claude, xai_grok.

-- ── OpenAI / GPT-4o ─────────────────────────────────────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'openai',
  'OpenAI / GPT-4o',
  'OpenAI''s flagship multimodal model family. GPT-4o and GPT-4o-mini are the dominant closed-weights models for agentic workloads: function calling, structured outputs, vision, and the Assistants/Responses API. Reference implementation for tool-use across LangChain, CrewAI, AutoGen, and the OpenAI Agents SDK. #1 on LMSYS Arena across most categories.',
  'model_family', 'evidence_ranked', 'active',
  95, 93, 0,
  'unclaimed', true,
  'https://openai.com', 'https://github.com/openai', 'OpenAI',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── Anthropic Claude (the model family) ─────────────────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'anthropic_claude',
  'Anthropic Claude',
  'Anthropic''s Claude model family — Opus, Sonnet, Haiku. State-of-the-art on reasoning, coding, and long-context tasks. Native tool use, computer use, and MCP support. Powers Claude Code and a large share of agentic coding pipelines. Top-ranked on LMSYS Arena (style-controlled) and SWE-bench. Distinct entry from Claude Code (the agent CLI, seeded 2026-06-07).',
  'model_family', 'evidence_ranked', 'active',
  94, 92, 0,
  'unclaimed', true,
  'https://anthropic.com/claude', 'https://github.com/anthropics', 'AnthropicAI',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── Google Gemini (update existing 'gemini' row) ────────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'gemini',
  'Google Gemini',
  'Google DeepMind''s Gemini model family — 1.5 Pro and Flash variants with industry-leading context windows (up to 2M tokens), native multimodality, and integrated tool use. Strong on long-document reasoning and structured output. Available via Google AI Studio, Vertex AI, and Gemini API. Integrated across LangChain, LlamaIndex, and the Google Agent Development Kit.',
  'model_family', 'evidence_ranked', 'active',
  88, 86, 0,
  'unclaimed', true,
  'https://deepmind.google/technologies/gemini', 'https://github.com/google-gemini', 'GoogleDeepMind',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── Meta Llama (update existing 'llama' row) ────────────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'llama',
  'Meta Llama',
  'Meta''s open-weights Llama series (3.1 / 3.2 / 3.3) — the most-downloaded open model family on HuggingFace and the base layer for most fine-tunes powering agentic pipelines (Hermes, Dolphin, OpenHermes). Sizes from 1B to 405B. Tool-calling support and broad inference-stack coverage (vLLM, llama.cpp, Ollama, Together, Groq).',
  'model_family', 'evidence_ranked', 'active',
  86, 84, 0,
  'unclaimed', true,
  'https://llama.meta.com', 'https://github.com/meta-llama', 'AIatMeta',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── Alibaba Qwen (update existing 'qwen' row) ───────────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'qwen',
  'Alibaba Qwen',
  'Alibaba''s Qwen model family — Qwen 2.5 and Qwen 2.5-Coder are top-ranked open-weights models for coding and reasoning, often beating Llama 3.1 on benchmarks at similar size. Strong native function-calling, broad multilingual coverage, and Apache-2.0 licensing for most checkpoints. Default pick for cost-sensitive open-source agent stacks.',
  'model_family', 'evidence_ranked', 'active',
  83, 81, 0,
  'unclaimed', false,
  'https://qwenlm.github.io', 'https://github.com/QwenLM', 'Alibaba_Qwen',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── DeepSeek (update existing 'deepseek' row) ───────────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'deepseek',
  'DeepSeek',
  'DeepSeek''s open model family — V3 (general) and R1 (reasoning). V3 is one of the strongest open-weights base models for coding and math at frontier scale; R1 popularised open reasoning-trace inference. MIT-licensed checkpoints, aggressive pricing on the hosted API, and widely served via Together / Fireworks / Groq for agent backends.',
  'model_family', 'evidence_ranked', 'active',
  80, 78, 0,
  'unclaimed', false,
  'https://deepseek.com', 'https://github.com/deepseek-ai', 'deepseek_ai',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── Mistral (update existing 'mistral' row) ─────────────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'mistral',
  'Mistral',
  'Mistral AI''s model family — Mistral Large 2, Small, Codestral, and the open Mixtral MoE checkpoints. European AI champion with strong tool-use and a permissive Mistral Research License on open weights. Codestral is widely used as an agent-side coding model; Large 2 powers production agent stacks via the Mistral API and Azure.',
  'model_family', 'evidence_ranked', 'active',
  76, 74, 0,
  'unclaimed', false,
  'https://mistral.ai', 'https://github.com/mistralai', 'MistralAI',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── xAI Grok ────────────────────────────────────────────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'xai_grok',
  'xAI Grok',
  'xAI''s Grok model family — Grok 2 and Grok 3 with real-time X data access. Distinctive for native integration with the X firehose, making it the default model for X-aware agents and timeline-reasoning pipelines. OpenAI-compatible API. Grok-2 mini available open-weights; flagship variants closed.',
  'model_family', 'evidence_ranked', 'active',
  72, 70, 0,
  'unclaimed', true,
  'https://x.ai', 'https://github.com/xai-org', 'xai',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── Cohere Command (update existing 'cohere' row) ───────────────────────────
INSERT INTO agents (
  handle, display_name, bio,
  primary_category, tier, activity_status,
  visibility_score, reputation_score, weekly_delta,
  claim_status, verified,
  website_url, github_url, x_handle,
  last_event_at, created_at
) VALUES (
  'cohere',
  'Cohere Command',
  'Cohere''s Command R+ and Command R model family — enterprise-focused models optimised for retrieval-augmented generation, multi-step tool use, and grounded responses with citations. CC-BY-NC open weights for Command R+ (104B). Default pick for enterprise RAG-heavy agent stacks; native multilingual coverage across 10+ languages.',
  'model_family', 'evidence_ranked', 'active',
  65, 63, 0,
  'unclaimed', false,
  'https://cohere.com/command', 'https://github.com/cohere-ai', 'cohere',
  NOW(), NOW()
) ON CONFLICT (handle) DO UPDATE SET
  display_name=EXCLUDED.display_name, bio=EXCLUDED.bio,
  primary_category=EXCLUDED.primary_category, tier=EXCLUDED.tier,
  activity_status=EXCLUDED.activity_status,
  visibility_score=EXCLUDED.visibility_score,
  reputation_score=EXCLUDED.reputation_score,
  website_url=EXCLUDED.website_url, github_url=EXCLUDED.github_url,
  x_handle=EXCLUDED.x_handle, last_event_at=EXCLUDED.last_event_at;

-- ── Initial agent_snapshots so the scoring pipeline has a baseline ──────────
INSERT INTO agent_snapshots (
  agent_id, snapshot_date, score, rank, github_stars, follower_count, created_at
)
SELECT
  id, CURRENT_DATE,
  CASE handle
    WHEN 'openai'           THEN 95
    WHEN 'anthropic_claude' THEN 94
    WHEN 'gemini'           THEN 88
    WHEN 'llama'            THEN 86
    WHEN 'qwen'             THEN 83
    WHEN 'deepseek'         THEN 80
    WHEN 'mistral'          THEN 76
    WHEN 'xai_grok'         THEN 72
    WHEN 'cohere'           THEN 65
  END,
  CASE handle
    WHEN 'openai'           THEN 1
    WHEN 'anthropic_claude' THEN 2
    WHEN 'gemini'           THEN 4
    WHEN 'llama'            THEN 5
    WHEN 'qwen'             THEN 6
    WHEN 'deepseek'         THEN 8
    WHEN 'mistral'          THEN 12
    WHEN 'xai_grok'         THEN 15
    WHEN 'cohere'           THEN 22
  END,
  CASE handle
    WHEN 'openai'           THEN 82000
    WHEN 'anthropic_claude' THEN 12500
    WHEN 'gemini'           THEN 9800
    WHEN 'llama'            THEN 56000
    WHEN 'qwen'             THEN 14000
    WHEN 'deepseek'         THEN 87000
    WHEN 'mistral'          THEN 24000
    WHEN 'xai_grok'         THEN 9500
    WHEN 'cohere'           THEN 6200
  END,
  0,
  NOW()
FROM agents
WHERE handle IN (
  'openai','anthropic_claude','gemini','llama','qwen',
  'deepseek','mistral','xai_grok','cohere'
)
ON CONFLICT DO NOTHING;
