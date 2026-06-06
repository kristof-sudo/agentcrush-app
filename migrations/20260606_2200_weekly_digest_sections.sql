-- Auto Weekly Digest — Phase R-3.1 (2026-06-06)
--
-- Stores the AI-distilled "Ecosystem this week" section that the weekly-digest-generator
-- worker produces every Sunday 19:00 UTC. The /weekly/[week] dynamic route reads from
-- here at request time.
--
-- Schema is intentionally tiny — week_id PK, content + metadata. Future sections (e.g.
-- "Top onchain events", "Methodology updates") become additional columns or rows.
--
-- Safe to apply: CREATE IF NOT EXISTS + RLS enabling read-only anon access.

CREATE TABLE IF NOT EXISTS weekly_digest_sections (
  week_id            TEXT PRIMARY KEY,  -- e.g. '2026-W23'
  ecosystem_section  TEXT NOT NULL,
  briefs_included    INT  NOT NULL DEFAULT 0,
  model              TEXT NOT NULL,
  input_tokens       INT,
  output_tokens      INT,
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION weekly_digest_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_weekly_digest_sections_updated_at ON weekly_digest_sections;
CREATE TRIGGER trg_weekly_digest_sections_updated_at
  BEFORE UPDATE ON weekly_digest_sections
  FOR EACH ROW EXECUTE FUNCTION weekly_digest_sections_updated_at();

-- RLS: anon role can read; service_role writes via worker.
ALTER TABLE weekly_digest_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_digest_anon_read ON weekly_digest_sections;
CREATE POLICY weekly_digest_anon_read ON weekly_digest_sections
  FOR SELECT TO anon USING (TRUE);

-- Service-role has full access by default in Supabase (bypasses RLS), so no policy needed for writes.

-- Refresh PostgREST schema cache so new table appears via REST API
NOTIFY pgrst, 'reload schema';

-- Comment for catalog
COMMENT ON TABLE weekly_digest_sections IS
  'Auto Weekly Digest ecosystem sections — written Sundays by weekly-digest-generator.mjs; read by /weekly/[week] dynamic route. Phase R-3.1.';
