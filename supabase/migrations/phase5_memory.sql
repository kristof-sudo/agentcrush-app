-- Phase 5: Bounded Memory Storage
-- Structured logging only. Not for retrieval or agent reasoning yet.
-- Do NOT apply without reviewer sign-off.

CREATE TABLE workflow_decisions (
    id          BIGSERIAL   PRIMARY KEY,
    workflow_id TEXT        NOT NULL,
    trace_id    TEXT        NOT NULL,
    decision    JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_outcomes (
    id          BIGSERIAL   PRIMARY KEY,
    workflow_id TEXT        NOT NULL,
    outcome     JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_summaries (
    id          BIGSERIAL   PRIMARY KEY,
    workflow_id TEXT        NOT NULL,
    summary     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
