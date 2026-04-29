-- =============================================================================
-- Migration: lock_down_personal_coaching_tables
-- Date: 2026-04-29
-- Author: Security hardening
-- =============================================================================
--
-- PURPOSE
-- -------
-- Enable Row Level Security on three tables that belong to a personal coaching
-- app accidentally created in the AgentCrush Supabase project:
--
--   public.coach_messages  — personal nutrition/fitness coaching chat history
--   public.daily_logs      — daily calorie, protein, training session logs
--   public.recent_foods    — personal food tracking entries
--
-- These tables are NOT AgentCrush product tables. They contain personal health
-- data and must not be readable by the anon role.
--
-- CURRENT STATE (before migration)
-- ---------------------------------
-- RLS is disabled on all three tables. The anon key can SELECT all rows.
-- PostgREST exposes all three tables in its public schema cache.
-- All rows share user_id = '00000000-0000-0000-0000-000000000001' — a
-- manually set placeholder, NOT a real Supabase auth.uid() UUID.
--
-- AFTER MIGRATION
-- ---------------
-- RLS is enabled. No anon or authenticated policies exist.
-- Result: anon and authenticated roles cannot SELECT/INSERT/UPDATE/DELETE.
-- service_role bypasses RLS as always and retains full access.
--
-- If the coaching app backend uses the service_role key, it will continue to
-- work without any policy changes.
--
-- LONG-TERM RECOMMENDATION
-- -------------------------
-- Move the personal coaching app to a separate Supabase project. Sharing a
-- project with an unrelated production app creates ongoing security surface
-- and credential confusion.
--
-- If you need to re-enable authenticated access later (e.g. the coaching app
-- migrates to real Supabase Auth with proper auth.uid()), see the commented
-- OPTIONAL POLICY section at the bottom of this file.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Step 1: Enable RLS on all three tables
-- This alone blocks anon and authenticated access immediately.
-- service_role is unaffected (it bypasses RLS at the Postgres level).
-- ---------------------------------------------------------------------------

ALTER TABLE public.coach_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_foods    ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Step 2: Force RLS even for table owners
-- Prevents accidental owner-role bypass.
-- ---------------------------------------------------------------------------

ALTER TABLE public.coach_messages  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recent_foods    FORCE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Step 3: Drop any pre-existing unsafe policies (safety net)
-- These tables had RLS disabled so no policies should exist, but defensive
-- cleanup is included in case any were added before this migration.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('coach_messages', 'daily_logs', 'recent_foods')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Dropped existing policy: % on %', pol.policyname, pol.tablename;
  END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- NO ANON OR AUTHENTICATED POLICIES ARE ADDED
-- ---------------------------------------------------------------------------
--
-- Rationale:
--   The user_id column on all three tables contains '00000000-0000-0000-0000-000000000001'
--   which is a manually set placeholder UUID — not a real Supabase auth.uid().
--   Adding auth.uid() = user_id policies would never match and would give a
--   false sense of security without actually granting access.
--
--   The coaching app backend must use the service_role key (which bypasses RLS)
--   for all reads/writes. If it currently uses the anon key, it needs to be
--   updated to use service_role — do NOT add permissive anon policies to fix this.
--
-- Result: no role except service_role can touch these tables after this migration.
-- ---------------------------------------------------------------------------


-- =============================================================================
-- OPTIONAL — future owner policy (do NOT run unless coaching app uses real auth)
-- =============================================================================
-- If the coaching app is later migrated to use Supabase Auth with real UUIDs,
-- uncomment and adapt the following policies:
--
-- CREATE POLICY "owner_select" ON public.coach_messages
--   FOR SELECT TO authenticated
--   USING (auth.uid() = user_id);
--
-- CREATE POLICY "owner_all" ON public.coach_messages
--   FOR ALL TO authenticated
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
--
-- (Repeat pattern for daily_logs and recent_foods)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Verification queries — run these after applying to confirm the fix
-- ---------------------------------------------------------------------------
--
-- 1. Confirm RLS is enabled:
--
--    SELECT relname, relrowsecurity, relforcerowsecurity
--    FROM pg_class
--    WHERE relname IN ('coach_messages', 'daily_logs', 'recent_foods')
--      AND relnamespace = 'public'::regnamespace;
--
--    Expected: relrowsecurity = true, relforcerowsecurity = true for all three.
--
-- 2. Confirm no policies exist:
--
--    SELECT schemaname, tablename, policyname, roles, cmd, qual
--    FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename IN ('coach_messages', 'daily_logs', 'recent_foods');
--
--    Expected: zero rows returned.
--
-- 3. Confirm anon is blocked (run with anon key or test via Supabase Table Editor):
--
--    SET ROLE anon;
--    SELECT * FROM public.coach_messages LIMIT 1;
--    -- Expected: ERROR: permission denied for table coach_messages
--    RESET ROLE;
--
-- ---------------------------------------------------------------------------
