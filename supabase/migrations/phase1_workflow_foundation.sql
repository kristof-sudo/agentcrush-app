-- Phase 1: Workflow Foundation
-- Implements tables defined in docs/contracts/workflow_contracts_v1.md
-- Do NOT apply without reviewer sign-off.

-- 1. workflows
CREATE TABLE workflows (
    workflow_id TEXT PRIMARY KEY,
    status      TEXT NOT NULL CHECK (status IN (
                    'created', 'in_progress', 'review_required',
                    'approved', 'rejected', 'completed', 'failed'
                )),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. workflow_events (append-only — no UPDATE or DELETE permitted by convention)
CREATE TABLE workflow_events (
    id          BIGSERIAL PRIMARY KEY,
    workflow_id TEXT        NOT NULL REFERENCES workflows (workflow_id),
    trace_id    TEXT        NOT NULL,
    role        TEXT        NOT NULL,
    task_type   TEXT        NOT NULL CHECK (task_type IN (
                    'code_change', 'deploy', 'publish', 'analysis', 'migration'
                )),
    input       JSONB       NOT NULL,
    decision    JSONB,
    output      JSONB,
    status      TEXT        NOT NULL CHECK (status IN (
                    'pending', 'executing', 'review_required',
                    'approved', 'rejected', 'done', 'failed'
                )),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workflow_id, trace_id)
);

CREATE INDEX workflow_events_workflow_id_idx ON workflow_events (workflow_id);

-- 3. workflow_reviews
CREATE TABLE workflow_reviews (
    review_id     TEXT        PRIMARY KEY,
    workflow_id   TEXT        NOT NULL REFERENCES workflows (workflow_id),
    trace_id      TEXT        NOT NULL,
    reviewer_role TEXT        NOT NULL CHECK (reviewer_role IN ('reviewer')),
    review_status TEXT        NOT NULL CHECK (review_status IN ('approved', 'rejected')),
    review_notes  TEXT        CHECK (review_status <> 'rejected' OR review_notes IS NOT NULL),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (workflow_id, trace_id) REFERENCES workflow_events (workflow_id, trace_id)
);

CREATE INDEX workflow_reviews_workflow_id_idx ON workflow_reviews (workflow_id);

-- 4. workflow_costs
CREATE TABLE workflow_costs (
    id             BIGSERIAL PRIMARY KEY,
    workflow_id    TEXT            NOT NULL REFERENCES workflows (workflow_id),
    cost_type      TEXT            NOT NULL CHECK (cost_type IN ('x_api', 'llm', 'other')),
    estimated_cost NUMERIC(10, 6) NOT NULL CHECK (estimated_cost >= 0),
    actual_cost    NUMERIC(10, 6)          CHECK (actual_cost IS NULL OR actual_cost >= 0),
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX workflow_costs_workflow_id_idx ON workflow_costs (workflow_id);
