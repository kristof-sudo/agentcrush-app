-- Ecosystem relationship seed — 100+ curated relationships for top agents
-- Date: 2026-03-28
-- Apply: run in Supabase SQL editor
--
-- Uses a safe INSERT … SELECT pattern: if either handle doesn't exist the
-- SELECT returns zero rows and nothing is inserted — never errors on missing agents.
--
-- Assumes agent_relationships columns: from_agent_id, to_agent_id, rel_type, intensity
-- If your column names differ (e.g. source_agent_id / target_agent_id), adjust below.
--
-- rel_type values used (matching agent_profile_related view + formatRelationshipLabel):
--   runs_on          → "Built on X" (agent uses framework as base)
--   framework_of     → "Powers X"  (framework → child agents, inverse of runs_on)
--   derived_from     → "Derived from X"
--   integrates_with  → "Integrates with / Uses X"
--   part_of_ecosystem → "Part of X ecosystem"
--   competes_with    → "Competes with X"
--   adjacent_to      → "Related project"

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: insert one directed relationship if both agents exist
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _seed_rel(
  p_from text, p_to text, p_rel_type text, p_intensity int DEFAULT 7
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO agent_relationships (from_agent_id, to_agent_id, rel_type, intensity)
  SELECT a1.id, a2.id, p_rel_type, p_intensity
  FROM   agents a1, agents a2
  WHERE  a1.handle = p_from
    AND  a2.handle = p_to
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipping % → % (%) : %', p_from, p_to, p_rel_type, SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FRAMEWORK RELATIONSHIPS — agents built on LangChain
-- ─────────────────────────────────────────────────────────────────────────────
SELECT _seed_rel('devin',            'langchain',    'runs_on',      9);
SELECT _seed_rel('devin_ai',         'langchain',    'runs_on',      9);
SELECT _seed_rel('openhands',        'langchain',    'runs_on',      9);
SELECT _seed_rel('autogpt',          'langchain',    'runs_on',      8);
SELECT _seed_rel('gpt_engineer',     'langchain',    'runs_on',      8);
SELECT _seed_rel('gptengineer',      'langchain',    'runs_on',      8);
SELECT _seed_rel('flowise',          'langchain',    'runs_on',      9);
SELECT _seed_rel('flowise_ai',       'langchain',    'runs_on',      9);
SELECT _seed_rel('dify',             'langchain',    'runs_on',      8);
SELECT _seed_rel('superagi',         'langchain',    'runs_on',      8);
SELECT _seed_rel('sweep_ai',         'langchain',    'runs_on',      7);
SELECT _seed_rel('sweepai',          'langchain',    'runs_on',      7);
SELECT _seed_rel('smol_developer',   'langchain',    'runs_on',      7);
SELECT _seed_rel('smoldeveloper',    'langchain',    'runs_on',      7);

-- Inverse: LangChain → framework_of these agents
SELECT _seed_rel('langchain',        'devin',        'framework_of', 9);
SELECT _seed_rel('langchain',        'devin_ai',     'framework_of', 9);
SELECT _seed_rel('langchain',        'openhands',    'framework_of', 9);
SELECT _seed_rel('langchain',        'autogpt',      'framework_of', 8);
SELECT _seed_rel('langchain',        'flowise',      'framework_of', 9);
SELECT _seed_rel('langchain',        'flowise_ai',   'framework_of', 9);
SELECT _seed_rel('langchain',        'dify',         'framework_of', 8);
SELECT _seed_rel('langchain',        'superagi',     'framework_of', 8);

-- LangGraph is built on LangChain
SELECT _seed_rel('langgraph',        'langchain',    'runs_on',      10);
SELECT _seed_rel('langchain',        'langgraph',    'framework_of', 10);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTOGEN ECOSYSTEM
-- ─────────────────────────────────────────────────────────────────────────────
SELECT _seed_rel('agentverse',       'autogen',      'runs_on',      8);
SELECT _seed_rel('agentverse_io',    'autogen',      'runs_on',      8);
SELECT _seed_rel('autogen_studio',   'autogen',      'runs_on',      10);
SELECT _seed_rel('autogen',          'agentverse',   'framework_of', 8);
SELECT _seed_rel('autogen',          'autogen_studio','framework_of',10);

-- ─────────────────────────────────────────────────────────────────────────────
-- CREWAI ECOSYSTEM
-- ─────────────────────────────────────────────────────────────────────────────
SELECT _seed_rel('crewai',           'langchain',    'runs_on',      7);
SELECT _seed_rel('langchain',        'crewai',       'framework_of', 7);

-- ─────────────────────────────────────────────────────────────────────────────
-- DERIVED_FROM RELATIONSHIPS
-- ─────────────────────────────────────────────────────────────────────────────
SELECT _seed_rel('babyagi',          'autogpt',      'derived_from', 8);
SELECT _seed_rel('memgpt',           'letta',        'derived_from', 10); -- MemGPT evolved into Letta
SELECT _seed_rel('letta',            'memgpt',       'adjacent_to',  10); -- Letta is successor to MemGPT

-- ─────────────────────────────────────────────────────────────────────────────
-- INFRASTRUCTURE — agents that use E2B for sandboxed code execution
-- ─────────────────────────────────────────────────────────────────────────────
SELECT _seed_rel('devin',            'e2b',          'integrates_with', 9);
SELECT _seed_rel('devin_ai',         'e2b',          'integrates_with', 9);
SELECT _seed_rel('openhands',        'e2b',          'integrates_with', 9);
SELECT _seed_rel('sweagent',         'e2b',          'integrates_with', 8);
SELECT _seed_rel('swe_agent',        'e2b',          'integrates_with', 8);
SELECT _seed_rel('gpt_engineer',     'e2b',          'integrates_with', 7);
SELECT _seed_rel('gptengineer',      'e2b',          'integrates_with', 7);
SELECT _seed_rel('autogen',          'e2b',          'integrates_with', 7);
SELECT _seed_rel('superagi',         'e2b',          'integrates_with', 7);

-- Helicone (LLM observability)
SELECT _seed_rel('autogpt',          'helicone',     'integrates_with', 7);
SELECT _seed_rel('crewai',           'helicone',     'integrates_with', 7);
SELECT _seed_rel('langchain',        'helicone',     'integrates_with', 8);
SELECT _seed_rel('superagi',         'helicone',     'integrates_with', 7);
SELECT _seed_rel('letta',            'helicone',     'integrates_with', 6);

-- LiteLLM (unified LLM interface)
SELECT _seed_rel('autogen',          'litellm',      'integrates_with', 9);
SELECT _seed_rel('crewai',           'litellm',      'integrates_with', 8);
SELECT _seed_rel('superagi',         'litellm',      'integrates_with', 8);
SELECT _seed_rel('agentverse',       'litellm',      'integrates_with', 7);
SELECT _seed_rel('letta',            'litellm',      'integrates_with', 7);

-- Composio (tools & integrations)
SELECT _seed_rel('crewai',           'composio',     'integrates_with', 9);
SELECT _seed_rel('autogen',          'composio',     'integrates_with', 9);
SELECT _seed_rel('langchain',        'composio',     'integrates_with', 8);
SELECT _seed_rel('superagi',         'composio',     'integrates_with', 8);
SELECT _seed_rel('autogpt',          'composio',     'integrates_with', 7);

-- Mem0 (memory layer)
SELECT _seed_rel('autogen',          'mem0',         'integrates_with', 8);
SELECT _seed_rel('crewai',           'mem0',         'integrates_with', 8);
SELECT _seed_rel('superagi',         'mem0',         'integrates_with', 7);
SELECT _seed_rel('devin',            'mem0',         'integrates_with', 6);
SELECT _seed_rel('devin_ai',         'mem0',         'integrates_with', 6);

-- AgentOps (monitoring)
SELECT _seed_rel('crewai',           'agentops',     'integrates_with', 9);
SELECT _seed_rel('autogen',          'agentops',     'integrates_with', 8);
SELECT _seed_rel('langchain',        'agentops',     'integrates_with', 8);
SELECT _seed_rel('autogpt',          'agentops',     'integrates_with', 7);

-- ─────────────────────────────────────────────────────────────────────────────
-- ECOSYSTEM MEMBERSHIP — crypto / network agents
-- ─────────────────────────────────────────────────────────────────────────────
SELECT _seed_rel('ai16z',            'virtuals',     'part_of_ecosystem', 6);
SELECT _seed_rel('zerebro',          'virtuals',     'part_of_ecosystem', 8);
SELECT _seed_rel('luna_virtuals',    'virtuals',     'part_of_ecosystem', 9);
SELECT _seed_rel('convo_virtuals',   'virtuals',     'part_of_ecosystem', 9);

-- Solana ecosystem
SELECT _seed_rel('ai16z',            'solana',       'part_of_ecosystem', 9);
SELECT _seed_rel('zerebro',          'solana',       'part_of_ecosystem', 9);
SELECT _seed_rel('aixbt',            'solana',       'part_of_ecosystem', 7);
SELECT _seed_rel('bankr',            'solana',       'part_of_ecosystem', 8);
SELECT _seed_rel('griffain',         'solana',       'part_of_ecosystem', 8);

-- Crypto / DeFi ecosystem
SELECT _seed_rel('aixbt',            'crypto_infra', 'part_of_ecosystem', 8);
SELECT _seed_rel('bankr',            'crypto_infra', 'part_of_ecosystem', 7);
SELECT _seed_rel('griffain',         'crypto_infra', 'part_of_ecosystem', 8);

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPETITIVE RELATIONSHIPS (bidirectional)
-- ─────────────────────────────────────────────────────────────────────────────
-- Coding agents
SELECT _seed_rel('devin',            'openhands',    'competes_with', 9);
SELECT _seed_rel('openhands',        'devin',        'competes_with', 9);
SELECT _seed_rel('devin',            'sweagent',     'competes_with', 8);
SELECT _seed_rel('sweagent',         'devin',        'competes_with', 8);
SELECT _seed_rel('devin_ai',         'openhands',    'competes_with', 9);
SELECT _seed_rel('openhands',        'devin_ai',     'competes_with', 9);

-- Code editors / assistants
SELECT _seed_rel('cursor',           'codeium_ai',   'competes_with', 9);
SELECT _seed_rel('codeium_ai',       'cursor',       'competes_with', 9);
SELECT _seed_rel('cursor',           'github_copilot','competes_with',9);
SELECT _seed_rel('github_copilot',   'cursor',       'competes_with', 9);
SELECT _seed_rel('cursor',           'tabnine_ai',   'competes_with', 8);
SELECT _seed_rel('tabnine_ai',       'cursor',       'competes_with', 8);
SELECT _seed_rel('github_copilot',   'codeium_ai',   'competes_with', 8);
SELECT _seed_rel('codeium_ai',       'github_copilot','competes_with',8);
SELECT _seed_rel('cursor',           'sourcegraph_cody','competes_with',7);
SELECT _seed_rel('sourcegraph_cody', 'cursor',       'competes_with', 7);
SELECT _seed_rel('aider',            'cursor',       'competes_with', 7);
SELECT _seed_rel('cursor',           'aider',        'competes_with', 7);

-- Autonomous agent frameworks
SELECT _seed_rel('autogpt',          'babyagi',      'competes_with', 8);
SELECT _seed_rel('babyagi',          'autogpt',      'competes_with', 8);
SELECT _seed_rel('crewai',           'autogen',      'competes_with', 9);
SELECT _seed_rel('autogen',          'crewai',       'competes_with', 9);
SELECT _seed_rel('crewai',           'langchain',    'adjacent_to',   7);
SELECT _seed_rel('autogpt',          'superagi',     'competes_with', 8);
SELECT _seed_rel('superagi',         'autogpt',      'competes_with', 8);

-- Research agents
SELECT _seed_rel('perplexity_ai',    'elicit_ai',    'competes_with', 7);
SELECT _seed_rel('elicit_ai',        'perplexity_ai','competes_with', 7);
SELECT _seed_rel('perplexity_ai',    'elicit',       'competes_with', 7);
SELECT _seed_rel('elicit',           'perplexity_ai','competes_with', 7);

-- Crypto trading agents
SELECT _seed_rel('aixbt',            'bankr',        'competes_with', 7);
SELECT _seed_rel('bankr',            'aixbt',        'competes_with', 7);
SELECT _seed_rel('aixbt',            'griffain',     'adjacent_to',   6);
SELECT _seed_rel('griffain',         'aixbt',        'adjacent_to',   6);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADJACENT / INTEGRATION RELATIONSHIPS
-- ─────────────────────────────────────────────────────────────────────────────
SELECT _seed_rel('devin',            'aider',        'adjacent_to',  7);
SELECT _seed_rel('aider',            'devin',        'adjacent_to',  7);
SELECT _seed_rel('langgraph',        'langchain',    'runs_on',      10);
SELECT _seed_rel('flowise',          'langchain',    'runs_on',      9);
SELECT _seed_rel('sweep_ai',         'github_copilot','adjacent_to', 6);
SELECT _seed_rel('sweepai',          'github_copilot','adjacent_to', 6);
SELECT _seed_rel('gpt_engineer',     'devin',        'competes_with',7);
SELECT _seed_rel('devin',            'gpt_engineer', 'competes_with',7);
SELECT _seed_rel('gptengineer',      'devin_ai',     'competes_with',7);
SELECT _seed_rel('devin_ai',         'gptengineer',  'competes_with',7);
SELECT _seed_rel('continue_dev',     'github_copilot','competes_with',7);
SELECT _seed_rel('github_copilot',   'continue_dev', 'competes_with',7);

-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup helper function
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS _seed_rel(text, text, text, int);
