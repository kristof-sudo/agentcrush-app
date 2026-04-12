-- Phase 6: Identity + Composition Graph Fields
-- Minimal schema foundation only. Not a graph system.
-- Do NOT apply without reviewer sign-off.

ALTER TABLE agents
    ADD COLUMN identity_type        TEXT CHECK (identity_type IN ('agent', 'tool', 'framework', 'runtime', 'organization')) DEFAULT 'agent',
    ADD COLUMN builder_attribution  TEXT,
    ADD COLUMN framework            TEXT,
    ADD COLUMN runtime              TEXT,
    ADD COLUMN dependencies         JSONB;
