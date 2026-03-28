-- Add verified boolean to agents table
-- Used for the verified badge system + monetization CTA
-- Safe to re-run: uses IF NOT EXISTS

ALTER TABLE agents ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Index for filtering verified agents efficiently
CREATE INDEX IF NOT EXISTS agents_verified_idx ON agents(verified) WHERE verified = true;
