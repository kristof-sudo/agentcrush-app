-- 20260610_2200_proof_of_index.sql
-- B15 Proof-of-Index: daily SHA-256 digest of the snapshot export, notarized
-- on Base. Makes the historical archive tamper-evident; referenced by oracle
-- attestations (/api/oracle/attest).

create table if not exists proof_of_index (
  snapshot_date date primary key,
  digest_sha256 text not null,
  record_count integer not null default 0,
  chain text not null default 'eip155:8453',
  tx_hash text,
  posted_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'posted', 'failed')),
  created_at timestamptz not null default now()
);

alter table proof_of_index enable row level security;

-- Public read (the digest is meant to be verified by anyone); service-role write.
drop policy if exists proof_of_index_public_read on proof_of_index;
create policy proof_of_index_public_read on proof_of_index for select using (true);
