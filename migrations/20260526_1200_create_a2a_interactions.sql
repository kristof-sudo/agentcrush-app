-- A2A interaction log: records each call to /api/agent/:handle/a2a-verify
-- Used as on-chain evidence surface for the Seeker mobile agent lab demo
-- and as a future trust signal for agents that have been queried pre-transaction.

CREATE TABLE IF NOT EXISTS a2a_interactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL    DEFAULT now(),
  seller_handle    TEXT        NOT NULL,
  buyer_handle     TEXT,
  buyer_wallet     TEXT,
  decision         TEXT        NOT NULL CHECK (decision IN ('proceed', 'caution', 'reject')),
  trust_score      INTEGER,
  tier             TEXT,
  agent_framework  TEXT,
  payment_tx_hash  TEXT,
  session_id       TEXT,
  metadata         JSONB       NOT NULL    DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS a2a_interactions_seller_handle_idx ON a2a_interactions (seller_handle);
CREATE INDEX IF NOT EXISTS a2a_interactions_created_at_idx    ON a2a_interactions (created_at DESC);
