-- mike_posts: stores posts published to X by Mike (@MikeMatshAI).
-- Written by x-publisher.mjs after each successful tweet.
-- Read by the homepage "Mike's Latest" panel via /api/mike-feed.

CREATE TABLE mike_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content      TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tweet_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX mike_posts_published_at_idx ON mike_posts (published_at DESC);
