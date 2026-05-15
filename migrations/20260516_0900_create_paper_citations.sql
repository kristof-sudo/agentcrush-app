-- Create paper_citations table + agents.semantic_scholar_paper_ids
-- Date: 2026-05-16 (started 2026-05-15 late evening)
-- Depends on: 20260515_1600_model_family_scoring_view.sql (model_family seeds exist)
--
-- Step (c.3) of the Category Index Pivot. Adds the 4th signal slice for the
-- model_family scoring view: paper citations.
--
-- Data source: Semantic Scholar Graph API
--   https://api.semanticscholar.org/graph/v1/paper/{ID}
--   ID can be:
--     - paperId (40-char hex hash)
--     - "arXiv:2408.11857"
--     - "DOI:10.48550/arXiv.2408.11857"
--     - "CorpusId:271923775"
--   Free, no key needed for low volume (~100 req per 5-min window).
--   Authenticated key gives 1 req/sec sustained.
--
-- Coverage strategy:
--   One agent (lab) → multiple foundational papers (one per major model release).
--   citations_score per agent = LOG10(SUM(citation_count)) * 16, capped at 100.
--   Coefficient 16 chosen so:
--     - 10 citations → score 16
--     - 100 citations → score 32
--     - 1,000 citations → score 48
--     - 10,000 citations → score 64
--     - 100,000 citations → score 80
--   Heavily-cited labs (Gemini ~30K, LLaMA ~50K) end up high-70s/80s.
--   Niche labs (Hermes ~33 cites for v3) end up low-20s.
--
-- Seeded paper IDs (arXiv) — verified canonical papers per lab:
--   Hermes:    arXiv:2408.11857 (Hermes 3 Technical Report)
--   Gemini:    arXiv:2312.11805 (Gemini: A Family of Highly Capable Multimodal Models)
--              arXiv:2403.05530 (Gemini 1.5: Long-Context)
--              arXiv:2507.06261 (Gemini 2.5 Pro — if exists in S2)
--   DeepSeek:  arXiv:2412.19437 (DeepSeek-V3 Technical Report)
--              arXiv:2501.12948 (DeepSeek-R1)
--              arXiv:2405.04434 (DeepSeek-V2)
--   Qwen:      arXiv:2309.16609 (Qwen Technical Report)
--              arXiv:2407.10671 (Qwen2)
--              arXiv:2412.15115 (Qwen2.5 Technical Report)
--              arXiv:2409.12191 (Qwen2-VL)
--   Llama:     arXiv:2407.21783 (The Llama 3 Herd of Models)
--              arXiv:2307.09288 (Llama 2)
--              arXiv:2302.13971 (LLaMA: Open and Efficient Foundation Language Models)
--
-- Lifecycle: paper_citations rows soft-deleted via removed_at if S2 no longer
-- returns them. Updated daily by `runtime/citations-adapter.mjs`.
--
-- Idempotent.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. paper_citations table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.paper_citations (
  paper_id                    TEXT PRIMARY KEY,           -- Semantic Scholar canonical 40-char hex hash
  arxiv_id                    TEXT,                       -- e.g. "2408.11857"
  doi                         TEXT,                       -- e.g. "10.48550/arXiv.2408.11857"
  corpus_id                   BIGINT,                     -- S2 numeric id
  title                       TEXT,
  authors                     JSONB,                      -- [{name, authorId}, ...]
  venue                       TEXT,                       -- "arXiv.org" / "NeurIPS" / etc.
  publication_year            INTEGER,
  publication_date            DATE,                       -- if S2 provides
  citation_count              INTEGER NOT NULL DEFAULT 0,
  influential_citation_count  INTEGER NOT NULL DEFAULT 0,
  reference_count             INTEGER,
  abstract                    TEXT,
  fields_of_study             JSONB,                      -- ["Computer Science", ...]
  raw_payload                 JSONB,
  payload_hash                TEXT,                       -- sha256 of normalized payload for change detection
  first_seen_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.paper_citations IS
  'Semantic Scholar paper-level citation mirror. Source signal for model_family agent scoring (citations_score). One row per paper. Agents link via agents.semantic_scholar_paper_ids TEXT[].';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_paper_citations_citation_count   ON public.paper_citations (citation_count DESC);
CREATE INDEX IF NOT EXISTS idx_paper_citations_arxiv_id         ON public.paper_citations (arxiv_id) WHERE arxiv_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paper_citations_publication_year ON public.paper_citations (publication_year);
CREATE INDEX IF NOT EXISTS idx_paper_citations_last_seen_at     ON public.paper_citations (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_citations_payload_hash     ON public.paper_citations (payload_hash);

-- updated_at touch trigger (per-table function, matches pattern from
-- hf_models / lmarena_models / hf_derivatives migrations)
CREATE OR REPLACE FUNCTION trg_paper_citations_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'paper_citations_touch'
  ) THEN
    CREATE TRIGGER paper_citations_touch
      BEFORE UPDATE ON public.paper_citations
      FOR EACH ROW EXECUTE FUNCTION trg_paper_citations_touch();
  END IF;
END$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. agents.semantic_scholar_paper_ids
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS semantic_scholar_paper_ids TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.agents.semantic_scholar_paper_ids IS
  'Array of Semantic Scholar paper IDs (40-char hex hashes) OR ArXiv IDs prefixed "arxiv:" linking this agent to its foundational papers. Many-to-one: one lab → multiple papers. Joined to paper_citations in agent_score_model_family_v1.';

CREATE INDEX IF NOT EXISTS idx_agents_semantic_scholar_paper_ids_gin
  ON public.agents USING GIN (semantic_scholar_paper_ids);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Backfill seed paper IDs for the 5 model_family agents
-- ──────────────────────────────────────────────────────────────────────────────
-- Store as "arxiv:XXXX.XXXXX" tokens. The adapter resolves these to canonical
-- paperId on first sync, but stores both so we can look up either way later.

UPDATE public.agents SET semantic_scholar_paper_ids = ARRAY[
  'arxiv:2408.11857'   -- Hermes 3 Technical Report
]::TEXT[] WHERE handle = 'nousresearch_hermes_agent';

UPDATE public.agents SET semantic_scholar_paper_ids = ARRAY[
  'arxiv:2312.11805',  -- Gemini: A Family of Highly Capable Multimodal Models
  'arxiv:2403.05530'   -- Gemini 1.5 Pro long context
]::TEXT[] WHERE handle = 'gemini';

UPDATE public.agents SET semantic_scholar_paper_ids = ARRAY[
  'arxiv:2412.19437',  -- DeepSeek-V3 Technical Report
  'arxiv:2501.12948',  -- DeepSeek-R1
  'arxiv:2405.04434'   -- DeepSeek-V2
]::TEXT[] WHERE handle = 'deepseek';

UPDATE public.agents SET semantic_scholar_paper_ids = ARRAY[
  'arxiv:2309.16609',  -- Qwen Technical Report
  'arxiv:2407.10671',  -- Qwen2
  'arxiv:2412.15115',  -- Qwen2.5 Technical Report
  'arxiv:2409.12191'   -- Qwen2-VL
]::TEXT[] WHERE handle = 'qwen';

UPDATE public.agents SET semantic_scholar_paper_ids = ARRAY[
  'arxiv:2407.21783',  -- The Llama 3 Herd of Models
  'arxiv:2307.09288',  -- Llama 2
  'arxiv:2302.13971'   -- LLaMA: Open and Efficient Foundation Language Models
]::TEXT[] WHERE handle = 'llama';
