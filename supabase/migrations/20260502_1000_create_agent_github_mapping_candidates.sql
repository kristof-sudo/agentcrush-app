-- 20260502_1000_create_agent_github_mapping_candidates.sql
--
-- Internal review table for GitHub repository mapping candidates.
-- Populated by the VPS website evidence probe; not public product data.
-- Human review required before any row is applied to agents.github_full_name.
--
-- Apply to Supabase: paste into SQL editor or run via Supabase CLI.
-- Log in: migrations/MIGRATION_LOG.md

create table if not exists agent_github_mapping_candidates (
  id                          uuid        primary key default gen_random_uuid(),
  agent_id                    uuid        not null references agents(id) on delete cascade,
  handle                      text        not null,
  candidate_github_full_name  text        not null,
  confidence_tier             text        not null check (confidence_tier in ('high', 'medium', 'low')),
  confidence_score            integer     not null check (confidence_score between 0 and 999),
  evidence_signals            text[]      not null default '{}',
  website_url                 text,
  match_context               text,
  probe_run_date              date        not null default current_date,
  review_status               text        not null default 'pending'
                                          check (review_status in (
                                            'pending', 'approved', 'rejected',
                                            'needs_more_info', 'superseded', 'applied'
                                          )),
  reviewed_by                 text,
  reviewed_at                 timestamptz,
  review_notes                text,
  applied_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint uq_agent_github_candidate unique (agent_id, candidate_github_full_name)
);

comment on table agent_github_mapping_candidates is
  'Internal review queue for GitHub repo candidates detected by the VPS website evidence probe. '
  'Not public product data. Human approval required before applying to agents.github_full_name.';

comment on column agent_github_mapping_candidates.review_status is
  'pending → reviewed as approved/rejected/needs_more_info → applied once written to agents.github_full_name';

comment on column agent_github_mapping_candidates.candidate_github_full_name is
  'Normalised owner/repo form, e.g. openai/openai-agents-python. Never auto-applied.';

-- Indexes
create index if not exists idx_agmc_review_status
  on agent_github_mapping_candidates (review_status);

create index if not exists idx_agmc_confidence_score
  on agent_github_mapping_candidates (confidence_score desc);

create index if not exists idx_agmc_agent_id
  on agent_github_mapping_candidates (agent_id);

create index if not exists idx_agmc_probe_run_date
  on agent_github_mapping_candidates (probe_run_date);

create index if not exists idx_agmc_candidate_github_full_name
  on agent_github_mapping_candidates (candidate_github_full_name);

-- updated_at trigger
create or replace function set_agmc_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_agmc_updated_at on agent_github_mapping_candidates;
create trigger trg_agmc_updated_at
  before update on agent_github_mapping_candidates
  for each row execute function set_agmc_updated_at();

-- RLS
-- This table is internal. No anon or authenticated write policies.
-- Service role only. Reads may be opened to authenticated role if a
-- review UI is built, but writes stay service-role-only.
alter table agent_github_mapping_candidates enable row level security;

-- No policies added by default: service role bypasses RLS.
-- Uncomment to allow authenticated reads for a future review UI:
-- create policy "authenticated_read" on agent_github_mapping_candidates
--   for select to authenticated using (true);
