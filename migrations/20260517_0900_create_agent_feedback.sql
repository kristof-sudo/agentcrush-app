-- Create agent_feedback table — feedback channel for AI agents using AgentCrush
-- Date: 2026-05-17
--
-- "Ask the agents what they think" (advice 2026-05-17).
-- POST /api/agent-feedback writes here. Free, no auth. Per-IP rate-limited
-- in the route handler.
--
-- Purpose: accumulate structured signal of what real AI agents using
-- AgentCrush need but can't get. First entries inform what to build next
-- (CLI? SDK? webhooks? deeper signals?). Real demand beats forecast.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.agent_feedback (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_type    TEXT NOT NULL CHECK (feedback_type IN ('missing_data', 'wrong_data', 'methodology_question', 'integration_friction', 'feature_request', 'other')),
  message          TEXT NOT NULL,
  agent_handle     TEXT,                    -- subject of the feedback (which AgentCrush agent it's about, if any)
  category         TEXT,                    -- one of: model_family, tokenized, service, developer (if applicable)
  query_attempted  TEXT,                    -- the user/AI query that prompted the feedback
  client_identifier TEXT,                   -- self-reported caller (bot name, MCP client, user_agent, etc.)
  contact          TEXT,                    -- optional email/handle if reply welcomed
  ip_hash          TEXT,                    -- sha256(IP + day_salt) for spam dedup, no raw IP storage
  user_agent       TEXT,                    -- HTTP User-Agent header (truncated)
  reviewed         BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at      TIMESTAMPTZ,
  reviewed_note    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.agent_feedback IS
  'Feedback channel for AI agents using AgentCrush. Populated by POST /api/agent-feedback. Per-IP rate-limited at the route layer. Reviewed manually for product signal.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_feedback_created_at    ON public.agent_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_type          ON public.agent_feedback (feedback_type);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_reviewed      ON public.agent_feedback (reviewed) WHERE reviewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_agent_feedback_agent_handle  ON public.agent_feedback (agent_handle) WHERE agent_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_feedback_ip_hash       ON public.agent_feedback (ip_hash);

-- Length guards (DB-level safety net; route also enforces)
ALTER TABLE public.agent_feedback
  ADD CONSTRAINT chk_message_length CHECK (length(message) <= 4000);
