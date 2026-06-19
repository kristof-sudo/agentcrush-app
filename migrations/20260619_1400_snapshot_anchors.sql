-- 20260619_1400_snapshot_anchors.sql
--
-- VERIFIABLE HISTORIC RECORD — make our daily snapshots tamper-evident and (optionally)
-- anchored on-chain, so "trust AgentCrush" becomes "verify it yourself."
--
-- Each day: canonicalize that day's agent_snapshots (agent_id|rank|score|is_alive),
-- fold into a binary Merkle root, and chain it to the prior day
-- (chain_hash = sha256(prev_chain_hash + merkle_root)). Altering any past row breaks
-- every chain_hash after it. The root can then be anchored on Base (tx_hash) for an
-- immutable external timestamp — same mechanism as OpenTimestamps/Chainpoint.
--
-- Written by runtime/snapshot-anchor-worker.mjs; verified by /api/verify.
-- Apply: paste into the Supabase SQL editor.

create table if not exists snapshot_anchors (
  snapshot_date date primary key,
  merkle_root   text not null,
  prev_root     text,                 -- prior day's merkle_root (provenance trail)
  chain_hash    text not null,        -- sha256(prev_chain_hash + merkle_root)
  row_count     int  not null,
  algo          text not null default 'sha256-merkle-v1',
  tx_hash       text,                 -- Base anchor tx (null until anchored on-chain)
  chain         text,                 -- e.g. 'base-mainnet'
  anchored_at   timestamptz,          -- when the on-chain anchor confirmed
  created_at    timestamptz not null default now()
);

create index if not exists snapshot_anchors_created_idx on snapshot_anchors (created_at desc);
