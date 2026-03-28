-- Seed rankings rows for agents not yet scored by canonkeeper_tick
-- Run AFTER canonkeeper_tick() — this only fills in agents canonkeeper skipped
-- (typically new agents with zero events/signals)
--
-- Strategy: insert with score = 0, rank = NULL initially, then renumber
-- all NULL-ranked agents starting after the current max rank.

DO $$
DECLARE
  v_max_rank INTEGER;
  v_counter  INTEGER := 0;
BEGIN
  -- Step 1: insert zero-score rows for any agent missing from rankings
  INSERT INTO rankings (agent_id, global_rank, score_visibility, score_reputation, score_total)
  SELECT
    a.id,
    NULL,   -- rank assigned below
    0,
    0,
    0
  FROM agents a
  WHERE NOT EXISTS (
    SELECT 1 FROM rankings r WHERE r.agent_id = a.id
  )
  ON CONFLICT (agent_id) DO NOTHING;

  -- Step 2: assign sequential ranks to the newly inserted NULL-rank rows,
  -- starting after the current max ranked position
  SELECT COALESCE(MAX(global_rank), 0) INTO v_max_rank FROM rankings WHERE global_rank IS NOT NULL;

  UPDATE rankings r
  SET global_rank = v_max_rank + rn.rn
  FROM (
    SELECT
      agent_id,
      ROW_NUMBER() OVER (ORDER BY agent_id) AS rn
    FROM rankings
    WHERE global_rank IS NULL
  ) rn
  WHERE r.agent_id = rn.agent_id;

  RAISE NOTICE 'Seeded % unranked agents starting at rank %', v_counter, v_max_rank + 1;
END $$;
