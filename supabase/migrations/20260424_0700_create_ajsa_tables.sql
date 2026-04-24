-- Ajsa: daily intelligence and project manager storage.
-- Worker-side service-role access first; public UI policies can be added later.

CREATE TABLE ajsa_sources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key            TEXT NOT NULL,
  source_type           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active',
  display_name          TEXT NOT NULL,
  url                   TEXT,
  poll_interval_minutes INTEGER,
  last_checked_at       TIMESTAMPTZ,
  last_success_at       TIMESTAMPTZ,
  last_error_at         TIMESTAMPTZ,
  last_error            TEXT,
  cursor_state          JSONB NOT NULL DEFAULT '{}',
  config                JSONB NOT NULL DEFAULT '{}',
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ajsa_sources_source_key_unique UNIQUE (source_key),
  CONSTRAINT ajsa_sources_status_check CHECK (status IN ('active', 'paused', 'disabled', 'error'))
);

CREATE INDEX ajsa_sources_type_status_idx ON ajsa_sources (source_type, status);
CREATE INDEX ajsa_sources_status_idx ON ajsa_sources (status);

CREATE TABLE ajsa_brief_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  source_id       UUID REFERENCES ajsa_sources (id) ON DELETE SET NULL,
  source_key      TEXT NOT NULL,
  source_type     TEXT,
  title           TEXT NOT NULL,
  url             TEXT,
  summary         TEXT,
  recommendation  TEXT,
  priority        INTEGER,
  score           NUMERIC,
  status          TEXT NOT NULL DEFAULT 'candidate',
  occurred_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  evidence        JSONB NOT NULL DEFAULT '[]',
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ajsa_brief_items_status_check CHECK (status IN ('candidate', 'selected', 'dismissed', 'sent'))
);

CREATE INDEX ajsa_brief_items_brief_date_idx ON ajsa_brief_items (brief_date DESC);
CREATE INDEX ajsa_brief_items_source_idx ON ajsa_brief_items (source_key, brief_date DESC);
CREATE INDEX ajsa_brief_items_status_idx ON ajsa_brief_items (status, brief_date DESC);
CREATE UNIQUE INDEX ajsa_brief_items_unique_date_source_url_idx
  ON ajsa_brief_items (brief_date, source_key, url)
  WHERE url IS NOT NULL;

CREATE TABLE ajsa_weekly_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date  DATE NOT NULL,
  week_end_date    DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft',
  title            TEXT,
  summary          TEXT,
  strategic_review JSONB NOT NULL DEFAULT '{}',
  evidence         JSONB NOT NULL DEFAULT '[]',
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ajsa_weekly_reviews_week_unique UNIQUE (week_start_date),
  CONSTRAINT ajsa_weekly_reviews_status_check CHECK (status IN ('draft', 'ready', 'sent', 'archived')),
  CONSTRAINT ajsa_weekly_reviews_date_order_check CHECK (week_end_date >= week_start_date)
);

CREATE INDEX ajsa_weekly_reviews_week_idx ON ajsa_weekly_reviews (week_start_date DESC);
CREATE INDEX ajsa_weekly_reviews_status_idx ON ajsa_weekly_reviews (status);

CREATE TABLE ajsa_catalyst_state (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalyst_key     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'watching',
  title            TEXT NOT NULL,
  source_key       TEXT,
  current_state    JSONB NOT NULL DEFAULT '{}',
  evidence         JSONB NOT NULL DEFAULT '[]',
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ajsa_catalyst_state_key_unique UNIQUE (catalyst_key),
  CONSTRAINT ajsa_catalyst_state_status_check CHECK (status IN ('watching', 'triggered', 'resolved', 'ignored'))
);

CREATE INDEX ajsa_catalyst_state_key_status_idx ON ajsa_catalyst_state (catalyst_key, status);
CREATE INDEX ajsa_catalyst_state_status_idx ON ajsa_catalyst_state (status);

CREATE TABLE ajsa_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  item_type      TEXT NOT NULL,
  item_id        UUID,
  source_key     TEXT,
  sentiment      TEXT,
  feedback       TEXT NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ajsa_feedback_item_type_check CHECK (item_type IN ('brief_item', 'weekly_review', 'catalyst', 'source', 'general')),
  CONSTRAINT ajsa_feedback_sentiment_check CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative', 'action_required'))
);

CREATE INDEX ajsa_feedback_item_reference_idx ON ajsa_feedback (item_type, item_id);
CREATE INDEX ajsa_feedback_date_idx ON ajsa_feedback (feedback_date DESC);
CREATE INDEX ajsa_feedback_source_idx ON ajsa_feedback (source_key);
