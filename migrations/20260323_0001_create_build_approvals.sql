create table if not exists build_approvals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending',
  repo text not null,
  branch text,
  commit_sha text,
  pr_number integer,
  request_text text,
  codex_summary text,
  diff_summary text,
  approved_by text,
  approved_at timestamptz,
  ship_result jsonb,
  deploy_result jsonb,
  health_result jsonb
);
