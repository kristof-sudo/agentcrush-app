-- Phase 2: Trust Fields
-- Adds minimal trust-state visibility to the agents table.
-- Do NOT apply without reviewer sign-off.

ALTER TABLE agents
    ADD COLUMN claimed_by      TEXT,
    ADD COLUMN claim_status    TEXT NOT NULL DEFAULT 'unclaimed'
                                   CHECK (claim_status IN ('unclaimed', 'claimed', 'verification_requested', 'verified')),
    ADD COLUMN verified_source BOOLEAN NOT NULL DEFAULT FALSE;
