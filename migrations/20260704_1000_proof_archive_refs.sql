-- 20260704_1000_proof_archive_refs.sql
--
-- K13 DATA-AVAILABILITY ARCHIVE — the Merkle anchor is only independently checkable
-- if the exact hashed rows live somewhere immutable and third-party. Each night the
-- anchor worker now serializes the day's canonical rows to a deterministic JSON file,
-- sha256s it, and (once a funded wallet exists) uploads it to Arweave. These two
-- columns record where that archive lives and what it must hash to.
--
-- Nullable on purpose: days anchored before K13 (and days where upload fails) simply
-- have no archive refs. The anchor path itself does not depend on these columns —
-- the worker probes for them and degrades gracefully until this is applied.
--
-- Written by runtime/snapshot-anchor-worker.mjs; exposed by /api/verify.
-- Apply: paste into the Supabase SQL editor.

alter table snapshot_anchors add column if not exists arweave_tx     text; -- Arweave tx id of the day's canonical-rows JSON (null until uploaded)
alter table snapshot_anchors add column if not exists archive_sha256 text; -- sha256 of that exact JSON file (verify the download before trusting it)
