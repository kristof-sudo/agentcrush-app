-- 20260619_0900_blended_rankings_pgcron.sql
--
-- DURABLE credible ranking (replaces the VPS-timer approach, which reverted nightly
-- because canonkeeper rewrites rankings with the legacy vis/rep-only score where ~90%
-- of agents are 0 — sinking real alive agents like Nous Hermes to arbitrary ranks).
--
-- This moves the blend INTO the database as an hourly pg_cron job, so it re-applies a
-- few minutes after canonkeeper no matter when canonkeeper runs. No VPS dependency.
--
-- Blend (Kris-approved 2026-06-18, one combined ladder):
--   500*log10(stars+1) + liveness(alive 3000/dormant 1200/ghost 0/unknown 300)
--   + evidence_ranked(1500) + normalized curated vis+rep (0..2500)
--   model_family counts as alive (base LLMs are served, not GitHub repos).
--
-- Reads rankings.score_visibility/score_reputation as the legacy term and never writes
-- them, so it is idempotent and never feeds back on itself. Archived (de-dup) stubs are
-- pushed to global_rank 90000 so they drop out of all ranked views.
--
-- Apply: paste into the Supabase SQL editor and run. Safe to re-run (idempotent).

-- 1) the recompute function ------------------------------------------------------------
create or replace function recompute_blended_rankings()
returns void
language plpgsql
as $$
declare
  v_maxleg numeric;
begin
  -- max curated legacy (vis+rep) across all ranking rows; floor at 1 to avoid /0
  select greatest(max(coalesce(score_visibility,0) + coalesce(score_reputation,0)), 1)
    into v_maxleg
    from rankings;

  with scored as (
    select
      a.id as agent_id,
      (
        round(500 * log(greatest(coalesce(a.github_stars_live,0),0) + 1))
        + case
            when a.primary_category = 'model_family' then 3000
            when a.github_pushed_at is null then 300
            when a.github_pushed_at >= now() - interval '30 days' then 3000
            when a.github_pushed_at >= now() - interval '90 days' then 1200
            else 0
          end
        + case when a.tier = 'evidence_ranked' then 1500 else 0 end
        + round(2500 * (coalesce(r.score_visibility,0) + coalesce(r.score_reputation,0)) / v_maxleg)
      )::int as total
    from agents a
    join rankings r on r.agent_id = a.id
    where a.tier is distinct from 'archived'
  ),
  ranked as (
    select agent_id, total,
           row_number() over (order by total desc, agent_id) as rn
    from scored
  )
  update rankings rk
     set score_total = ranked.total,
         global_rank = ranked.rn,
         computed_at = now()
    from ranked
   where rk.agent_id = ranked.agent_id;

  -- archived de-dup stubs to the bottom (global_rank is NOT NULL)
  update rankings rk
     set global_rank = 90000,
         computed_at = now()
    from agents a
   where a.id = rk.agent_id
     and a.tier = 'archived';

  -- keep today's snapshot (Ghost Check's read path) consistent with current rankings
  update agent_snapshots s
     set rank  = rk.global_rank,
         score = rk.score_total
    from rankings rk
   where s.agent_id = rk.agent_id
     and s.snapshot_date = current_date;
end;
$$;

-- 2) run once now so the table is correct immediately --------------------------------
select recompute_blended_rankings();

-- 3) schedule hourly via pg_cron -----------------------------------------------------
-- pg_cron ships with Supabase; enable if not already (Dashboard > Database > Extensions,
-- or this statement if your role has permission).
create extension if not exists pg_cron;

-- replace any prior schedule of this job, then (re)create it at minute 7 every hour
select cron.unschedule('blended-rankings-hourly')
  where exists (select 1 from cron.job where jobname = 'blended-rankings-hourly');

select cron.schedule(
  'blended-rankings-hourly',
  '7 * * * *',
  $$select recompute_blended_rankings();$$
);
