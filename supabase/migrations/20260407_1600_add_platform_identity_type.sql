-- Phase 9 identity validation: add 'platform' to identity_type allowed values.
-- Found during backfill of 20 agents: agentops, virtuals, autonolas, fetchagents,
-- superagent, aiarena, agentverse are platforms (ecosystems/marketplaces/launchpads),
-- not agents, tools, frameworks, or organizations. The omission caused 7/20 update failures.

ALTER TABLE agents
  DROP CONSTRAINT agents_identity_type_check;

ALTER TABLE agents
  ADD CONSTRAINT agents_identity_type_check
    CHECK (identity_type IN ('agent', 'tool', 'framework', 'runtime', 'organization', 'platform'));
