-- Phase 10: claim_requests table.
-- Stores inbound builder claim requests from agent profile pages.
-- Manual review surface: Mission Control claim queue.
-- Supports future progression: pending → approved (triggers agents.claim_status update) → rejected.

CREATE TABLE claim_requests (
  id           BIGSERIAL PRIMARY KEY,
  agent_handle TEXT        NOT NULL,
  agent_id     TEXT,
  contact      TEXT        NOT NULL,
  note         TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX claim_requests_agent_handle_idx ON claim_requests (agent_handle);
CREATE INDEX claim_requests_status_created_idx ON claim_requests (status, created_at DESC);
