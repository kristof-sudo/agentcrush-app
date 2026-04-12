-- news_items: AI agent news from RSS feeds
-- Populated by /api/news/fetch (cron every 4h)
-- Read by homepage AgentIntelBar component

CREATE TABLE news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  headline text NOT NULL,
  url text UNIQUE NOT NULL,
  summary text,
  published_at timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX news_items_published_at_idx ON news_items (published_at DESC);
CREATE INDEX news_items_featured_idx ON news_items (is_featured);

-- Run in Supabase SQL Editor after creating the table:
-- CREATE OR REPLACE FUNCTION cleanup_old_news()
-- RETURNS void LANGUAGE plpgsql AS $$
-- BEGIN
--   DELETE FROM news_items
--   WHERE id NOT IN (
--     SELECT id FROM news_items
--     ORDER BY published_at DESC NULLS LAST
--     LIMIT 50
--   );
-- END;
-- $$;
