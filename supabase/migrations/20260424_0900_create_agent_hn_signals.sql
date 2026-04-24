-- agent_hn_signals: raw Hacker News mention evidence per agent.
-- Evidence only. Ranking/RPC processing will be added separately.

CREATE TABLE agent_hn_signals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  source                TEXT NOT NULL DEFAULT 'hacker_news',
  source_item_id        TEXT NOT NULL,
  source_url            TEXT,
  title                 TEXT,
  author                TEXT,
  hn_created_at         TIMESTAMPTZ,
  matched_query         TEXT,
  relevance_reason      TEXT,
  points                INTEGER DEFAULT 0,
  num_comments          INTEGER DEFAULT 0,
  strength              NUMERIC DEFAULT 0,
  is_relevant           BOOLEAN NOT NULL DEFAULT TRUE,
  false_positive_reason TEXT,
  raw                   JSONB NOT NULL DEFAULT '{}',
  observed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_hn_signals_unique_agent_item UNIQUE (agent_id, source_item_id)
);

CREATE INDEX agent_hn_signals_agent_id_idx ON agent_hn_signals (agent_id);
CREATE INDEX agent_hn_signals_observed_at_idx ON agent_hn_signals (observed_at DESC);
CREATE INDEX agent_hn_signals_hn_created_at_idx ON agent_hn_signals (hn_created_at DESC);
CREATE INDEX agent_hn_signals_strength_idx ON agent_hn_signals (strength DESC);
CREATE INDEX agent_hn_signals_is_relevant_idx ON agent_hn_signals (is_relevant);
CREATE INDEX agent_hn_signals_matched_query_idx ON agent_hn_signals (matched_query);
