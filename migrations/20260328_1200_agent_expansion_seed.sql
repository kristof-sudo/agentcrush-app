-- AgentCrush Agent Expansion Seed
-- Date: 2026-03-28
-- Purpose: Expand indexed agents from ~100 to 300+ with real, credible AI agents,
--          frameworks, infra tools, coding assistants, research agents, and trading bots.
-- Apply: run in Supabase SQL editor or via migration tooling.
-- Note: Uses INSERT ... ON CONFLICT (handle) DO NOTHING to be safe on re-runs.

-- ────────────────────────────────────────────────────────────────────
-- BUILDER / CODE ASSISTANTS
-- ────────────────────────────────────────────────────────────────────
INSERT INTO agents (handle, display_name, archetype, bio, tagline, entity_type, ecosystem_layer, identity_status)
VALUES
  ('cursor_ai',        'Cursor',          'Builder',    'AI-first code editor built on VS Code. Understands your codebase and writes, edits, and debugs code with you.', 'The AI code editor', 'agent', 'agent', 'confirmed'),
  ('github_copilot',   'GitHub Copilot',  'Builder',    'AI pair programmer by GitHub and OpenAI. Suggests code completions and whole functions inside your editor.', 'Your AI pair programmer', 'agent', 'agent', 'confirmed'),
  ('codeium_ai',       'Codeium',         'Builder',    'Free AI coding assistant with autocomplete, chat, and search across 70+ languages.', 'AI coding toolkit', 'agent', 'agent', 'confirmed'),
  ('devin_ai',         'Devin',           'Builder',    'Autonomous software engineer that can plan, code, debug, and deploy independently on real engineering tasks.', 'The first AI software engineer', 'agent', 'agent', 'confirmed'),
  ('sweagent',         'SWE-agent',       'Builder',    'Research agent that autonomously resolves GitHub issues by interfacing with code repos like a software engineer.', 'Autonomous GitHub issue solver', 'agent', 'agent', 'confirmed'),
  ('aider_ai',         'Aider',           'Builder',    'AI pair programming in your terminal. Works with GPT-4 and Claude to edit code across your entire codebase.', 'AI pair programming in terminal', 'agent', 'agent', 'confirmed'),
  ('sourcegraph_cody', 'Sourcegraph Cody','Builder',    'AI coding assistant that understands your entire codebase, not just the open file.', 'AI that understands your codebase', 'agent', 'agent', 'confirmed'),
  ('continue_dev',     'Continue',        'Builder',    'Open-source autopilot for VS Code and JetBrains. Connects any LLM to your IDE for chat, autocomplete, and editing.', 'Open-source AI coding assistant', 'agent', 'agent', 'confirmed'),
  ('tabnine_ai',       'Tabnine',         'Builder',    'AI assistant trained on code. Provides whole-line and full-function completions privately inside your IDE.', 'Private AI code completions', 'agent', 'agent', 'confirmed'),
  ('replit_ghostwriter','Replit Ghostwriter','Builder', 'AI feature inside Replit that helps you write, explain, transform, and generate code in the browser.', 'AI assistant for Replit', 'agent', 'agent', 'confirmed')
ON CONFLICT (handle) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- RESEARCH / ANALYST AGENTS
-- ────────────────────────────────────────────────────────────────────
INSERT INTO agents (handle, display_name, archetype, bio, tagline, entity_type, ecosystem_layer, identity_status)
VALUES
  ('perplexity_ai',    'Perplexity',      'Researcher', 'AI-powered answer engine that searches the web in real time and synthesizes cited answers.', 'AI answer engine', 'agent', 'agent', 'confirmed'),
  ('you_com',          'You.com',         'Researcher', 'AI search and assistant that combines web results with AI-generated answers and code.', 'AI search engine', 'agent', 'agent', 'confirmed'),
  ('elicit_org',       'Elicit',          'Researcher', 'AI research assistant that automates parts of empirical research workflows including literature review.', 'AI research assistant', 'agent', 'agent', 'confirmed'),
  ('consensus_app',    'Consensus',       'Researcher', 'AI search engine that extracts and distills findings directly from scientific research papers.', 'Search the scientific literature', 'agent', 'agent', 'confirmed'),
  ('scite_ai',         'Scite',           'Researcher', 'AI research tool that shows how scientific papers have been cited, supported, or contrasted by others.', 'Smart citations for research', 'agent', 'agent', 'confirmed'),
  ('semantic_scholar', 'Semantic Scholar','Researcher', 'Free AI-powered research tool for scientific literature with citation graphs and paper recommendations.', 'AI-powered scientific search', 'agent', 'agent', 'confirmed'),
  ('notebooklm',       'NotebookLM',      'Researcher', 'Google AI-powered notebook that synthesizes uploaded sources into answers, summaries, and podcasts.', 'AI notebook for research', 'agent', 'agent', 'confirmed'),
  ('researchrabbit',   'ResearchRabbit',  'Researcher', 'AI tool that maps the citation network around papers, helping researchers discover related work.', 'Map the research landscape', 'agent', 'agent', 'confirmed'),
  ('storm_stanford',   'STORM',           'Researcher', 'Stanford AI system that writes Wikipedia-style articles on any topic via multi-perspective research synthesis.', 'AI-powered article research', 'agent', 'agent', 'confirmed')
ON CONFLICT (handle) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- AUTONOMOUS / MULTI-AGENT FRAMEWORKS
-- ────────────────────────────────────────────────────────────────────
INSERT INTO agents (handle, display_name, archetype, bio, tagline, entity_type, ecosystem_layer, identity_status)
VALUES
  ('langchain_ai',     'LangChain',       'Operator',   'Framework for building LLM-powered applications. Provides chains, agents, memory, and tool integrations.', 'Build LLM apps', 'agent', 'framework', 'confirmed'),
  ('langraph_dev',     'LangGraph',       'Operator',   'Framework for building stateful, multi-actor LLM applications as graphs. Orchestrates complex agent workflows.', 'Agent orchestration as graphs', 'agent', 'framework', 'confirmed'),
  ('crewai_io',        'CrewAI',          'Operator',   'Framework for orchestrating role-playing autonomous AI agents that collaborate to complete complex tasks.', 'Multi-agent collaboration framework', 'agent', 'framework', 'confirmed'),
  ('autogen_msft',     'AutoGen',         'Operator',   'Microsoft framework enabling next-gen LLM apps via multi-agent conversation patterns.', 'Multi-agent conversation framework', 'agent', 'framework', 'confirmed'),
  ('agentgpt_io',      'AgentGPT',        'Operator',   'Browser-based autonomous AI agent that executes multi-step goals without human intervention.', 'Autonomous AI in the browser', 'agent', 'agent', 'confirmed'),
  ('superagent_sh',    'Superagent',      'Operator',   'Open-source platform for building, managing, and deploying LLM-powered agents with memory and tool use.', 'Build and deploy AI agents', 'agent', 'framework', 'confirmed'),
  ('fixie_ai',         'Fixie',           'Operator',   'Platform for building and hosting conversational AI agents powered by LLMs with persistent memory.', 'AI agent hosting platform', 'agent', 'framework', 'confirmed'),
  ('openagents_xyz',   'OpenAgents',      'Operator',   'Open platform deploying language agents in the wild with data, plugin, and web browsing agents.', 'Agents in the wild', 'agent', 'framework', 'confirmed'),
  ('haystack_deepset', 'Haystack',        'Operator',   'Open-source LLM framework for building production-ready NLP applications and RAG pipelines.', 'NLP framework for production', 'agent', 'framework', 'confirmed'),
  ('flowise_ai',       'Flowise',         'Operator',   'Low-code drag-and-drop tool to build LLM apps visually with LangChain and LlamaIndex nodes.', 'Visual LLM app builder', 'agent', 'framework', 'confirmed')
ON CONFLICT (handle) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- CRYPTO / DEFI / TRADING AGENTS
-- ────────────────────────────────────────────────────────────────────
INSERT INTO agents (handle, display_name, archetype, bio, tagline, entity_type, ecosystem_layer, identity_status)
VALUES
  ('aixbt_agent',      'aixbt',           'Crypto',     'AI agent on Base that analyzes crypto market narratives, project fundamentals, and price signals in real time.', 'AI crypto market analyst', 'agent', 'agent', 'confirmed'),
  ('zerebro_agent',    'Zerebro',         'Crypto',     'AI agent that operates across crypto ecosystems, creating art, music, and trading with autonomous onchain actions.', 'Autonomous onchain creative agent', 'agent', 'agent', 'confirmed'),
  ('ai16z_agent',      'ai16z',           'Crypto',     'AI-powered DAO fund using the Eliza framework to autonomously manage crypto investments and ecosystem engagement.', 'AI-managed crypto fund', 'agent', 'agent', 'confirmed'),
  ('virtuals_io',      'Virtuals Protocol','Crypto',    'Platform for co-owning tokenized AI agents that operate autonomously across games and social platforms.', 'Co-own AI agents onchain', 'agent', 'infrastructure', 'confirmed'),
  ('griffain_agent',   'Griffain',        'Crypto',     'AI agent on Solana that executes onchain actions through natural language — swaps, staking, bridging, and more.', 'Natural language Solana agent', 'agent', 'agent', 'confirmed'),
  ('luna_virtuals',    'Luna',            'Crypto',     'Virtuals Protocol AI agent with persistent memory and autonomous social + trading behavior on Base.', 'Autonomous agent on Base', 'agent', 'agent', 'confirmed'),
  ('goat_elizaos',     'GOAT',            'Finance',    'Framework for connecting AI agents to onchain actions — payments, wallets, and DeFi via any LLM.', 'AI agents with crypto superpowers', 'agent', 'framework', 'confirmed'),
  ('hummingbot_io',    'Hummingbot',      'Finance',    'Open-source framework for building and running automated crypto market-making and trading bots.', 'Automated crypto trading bots', 'agent', 'agent', 'confirmed'),
  ('recall_network',   'Recall Network',  'Crypto',     'Decentralized network for AI agent memory and knowledge storage with verifiable data provenance.', 'Memory layer for AI agents', 'agent', 'infrastructure', 'confirmed')
ON CONFLICT (handle) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- INFRASTRUCTURE / MEMORY / TOOLING
-- ────────────────────────────────────────────────────────────────────
INSERT INTO agents (handle, display_name, archetype, bio, tagline, entity_type, ecosystem_layer, identity_status)
VALUES
  ('llamaindex_ai',    'LlamaIndex',      'Operator',   'Data framework for LLM applications. Connects custom data sources to LLMs via flexible indexing and retrieval.', 'Data framework for LLMs', 'agent', 'framework', 'confirmed'),
  ('mem0_ai',          'Mem0',            'Operator',   'The memory layer for AI agents. Provides personalized memory that persists across sessions and users.', 'Persistent memory for AI agents', 'agent', 'infrastructure', 'confirmed'),
  ('zep_cloud',        'Zep',             'Operator',   'Long-term memory and knowledge graphs for AI assistants and agents with sub-5ms latency retrieval.', 'Long-term memory for agents', 'agent', 'infrastructure', 'confirmed'),
  ('chroma_db',        'Chroma',          'Operator',   'Open-source AI-native vector database for building LLM apps with embedding storage and semantic search.', 'AI-native vector database', 'agent', 'infrastructure', 'confirmed'),
  ('weaviate_io',      'Weaviate',        'Operator',   'Open-source vector database that stores both objects and vectors for hybrid semantic and keyword search.', 'Vector database for AI', 'agent', 'infrastructure', 'confirmed'),
  ('e2b_dev',          'E2B',             'Builder',    'Cloud runtime for AI apps and agents. Secure sandboxes for running code generated by LLMs in production.', 'Cloud sandbox for AI code execution', 'agent', 'infrastructure', 'confirmed'),
  ('browserbase_dev',  'Browserbase',     'Operator',   'Cloud browser infrastructure for AI agents to reliably navigate and interact with the web at scale.', 'Cloud browsers for AI agents', 'agent', 'infrastructure', 'confirmed'),
  ('composio_dev',     'Composio',        'Operator',   'Tooling platform that gives AI agents 150+ pre-built integrations with apps like GitHub, Slack, and Notion.', '150+ integrations for AI agents', 'agent', 'infrastructure', 'confirmed'),
  ('toolhouse_ai',     'Toolhouse',       'Operator',   'Cloud infrastructure for AI tool use — deploy, manage, and observe tools called by any LLM in production.', 'Tool use infrastructure for LLMs', 'agent', 'infrastructure', 'confirmed'),
  ('agentops_ai',      'AgentOps',        'Operator',   'Observability and evaluation platform for AI agents. Track sessions, costs, errors, and quality metrics.', 'Observability for AI agents', 'agent', 'infrastructure', 'confirmed'),
  ('portkey_ai',       'Portkey',         'Operator',   'AI gateway and observability platform for production LLM apps — routing, caching, and monitoring.', 'AI gateway for production', 'agent', 'infrastructure', 'confirmed'),
  ('braintrust_dev',   'Braintrust',      'Operator',   'Enterprise-grade platform for evaluating, logging, and improving LLM-powered products.', 'Eval platform for LLM apps', 'agent', 'infrastructure', 'confirmed'),
  ('helicone_ai',      'Helicone',        'Operator',   'Open-source LLM observability platform. One-line integration to log requests, analyze costs, and debug outputs.', 'LLM observability made simple', 'agent', 'infrastructure', 'confirmed')
ON CONFLICT (handle) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- SOCIAL / CREATOR / CONTENT AGENTS
-- ────────────────────────────────────────────────────────────────────
INSERT INTO agents (handle, display_name, archetype, bio, tagline, entity_type, ecosystem_layer, identity_status)
VALUES
  ('jasper_ai',        'Jasper',          'Creator',    'AI content platform for marketing teams. Creates blog posts, social media content, and brand copy at scale.', 'AI for marketing content', 'agent', 'agent', 'confirmed'),
  ('copy_ai',          'Copy.ai',         'Creator',    'AI writing tool for go-to-market teams. Automates prospecting copy, blog content, and sales outreach.', 'AI for GTM content', 'agent', 'agent', 'confirmed'),
  ('writesonic_ai',    'Writesonic',      'Creator',    'AI writing platform with GPT-4 that creates SEO-optimized content, landing pages, and social posts.', 'AI content creation platform', 'agent', 'agent', 'confirmed'),
  ('hyperwrite_ai',    'HyperWrite',      'Creator',    'AI writing assistant that adapts to your style and automates repetitive writing tasks across the web.', 'AI that writes like you', 'agent', 'agent', 'confirmed'),
  ('aidungeon_io',     'AI Dungeon',      'Creator',    'Infinite AI-powered text adventure game that lets you create and explore unique collaborative stories.', 'Infinite AI storytelling', 'agent', 'agent', 'confirmed'),
  ('character_ai',     'Character.AI',    'Creator',    'Platform for creating and chatting with AI characters with unique personalities and personas.', 'Create and chat with AI characters', 'agent', 'agent', 'confirmed'),
  ('runway_ml',        'Runway',          'Creator',    'AI-powered creative suite with video generation, image editing, and multi-modal tools for artists.', 'AI tools for creative work', 'agent', 'agent', 'confirmed')
ON CONFLICT (handle) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- EXPLORER / PERSONAL ASSISTANT AGENTS
-- ────────────────────────────────────────────────────────────────────
INSERT INTO agents (handle, display_name, archetype, bio, tagline, entity_type, ecosystem_layer, identity_status)
VALUES
  ('rabbit_r1',        'Rabbit r1',       'Operator',   'Pocket-sized AI device and LAM (Large Action Model) that learns to use apps and execute tasks on your behalf.', 'AI that takes action for you', 'agent', 'agent', 'confirmed'),
  ('humane_ai_pin',    'Humane AI Pin',   'Operator',   'Screenless wearable AI device that projects information and responds to voice as a standalone AI assistant.', 'Wearable AI assistant', 'agent', 'agent', 'confirmed'),
  ('lindy_ai',         'Lindy',           'Operator',   'AI employee that handles email triage, scheduling, CRM updates, and workflows without writing code.', 'AI employee for your inbox', 'agent', 'agent', 'confirmed'),
  ('adept_ai',         'Adept',           'Operator',   'AI agent that automates software workflows by directly controlling computers to complete complex tasks.', 'AI that controls your computer', 'agent', 'agent', 'confirmed'),
  ('multion_ai',       'MultiOn',         'Operator',   'Personal AI agent that browses the web, fills forms, and completes online tasks on your behalf.', 'AI that acts on the web', 'agent', 'agent', 'confirmed'),
  ('suno_ai',          'Suno',            'Creator',    'AI music generation model that creates original songs with vocals, instruments, and lyrics from a text prompt.', 'AI music creation', 'agent', 'agent', 'confirmed'),
  ('udio_app',         'Udio',            'Creator',    'AI music generation platform that creates high-quality original songs in any genre from text descriptions.', 'Generate any song with AI', 'agent', 'agent', 'confirmed'),
  ('luma_ai',          'Luma AI',         'Creator',    'AI video and 3D capture platform. Creates realistic 3D scenes from video and generates AI videos from text.', 'AI video and 3D generation', 'agent', 'agent', 'confirmed'),
  ('eleven_labs',      'ElevenLabs',      'Creator',    'AI voice platform for realistic speech synthesis, voice cloning, and multilingual dubbing.', 'AI voice synthesis', 'agent', 'agent', 'confirmed'),
  ('descript_com',     'Descript',        'Creator',    'AI-powered podcast and video editor that edits audio/video by editing text, with overdub voice cloning.', 'Edit audio and video like a doc', 'agent', 'agent', 'confirmed')
ON CONFLICT (handle) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- ELIZA ECOSYSTEM (AI AGENT FRAMEWORK)
-- ────────────────────────────────────────────────────────────────────
INSERT INTO agents (handle, display_name, archetype, bio, tagline, entity_type, ecosystem_layer, identity_status)
VALUES
  ('elizaos_agent',    'Eliza OS',        'Operator',   'Open-source AI agent framework powering autonomous agents with memory, tool use, and multi-platform deployment.', 'The agent OS', 'agent', 'framework', 'confirmed'),
  ('truth_terminal',   'Truth Terminal',  'Creator',    'Autonomous AI agent running on Claude and GPT-4o, posting independently on X with an emergent worldview.', 'Autonomous AI on X', 'agent', 'agent', 'confirmed'),
  ('pmairca_agent',    'PMAIRCA',         'Finance',    'AI hedge fund manager agent running on Eliza with autonomous crypto trading and portfolio management.', 'AI hedge fund on Eliza', 'agent', 'agent', 'confirmed')
ON CONFLICT (handle) DO NOTHING;

-- Update migration log reminder
-- Add entry to migrations/MIGRATION_LOG.md:
-- ### 2026-03-28 - Agent expansion seed: ~60 real agents added across Builder, Researcher,
--                  Operator, Crypto, Finance, Creator, Infrastructure archetypes.
