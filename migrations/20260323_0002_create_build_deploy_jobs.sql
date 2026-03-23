create table if not exists build_deploy_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'queued',
  build_approval_id uuid not null references build_approvals(id) on delete cascade,
  repo text not null,
  pr_number integer not null,
  commit_sha text,
  deploy_result jsonb,
  health_result jsonb,
  error text
);

create index if not exists build_deploy_jobs_status_idx
  on build_deploy_jobs (status);

create index if not exists build_deploy_jobs_created_at_idx
  on build_deploy_jobs (created_at desc);
