-- Ajsa seed data: catalyst detection and execution-prioritization sources.
-- Idempotent seed only. Does not set last_checked_at or create brief items.

INSERT INTO ajsa_sources (
  source_key,
  source_type,
  status,
  display_name,
  url,
  poll_interval_minutes,
  config,
  metadata
) VALUES
  (
    'agentic_market_bazaar_discovery',
    'ecosystem',
    'active',
    'Agentic.Market / Bazaar marketplace discovery',
    'https://agentic.market/',
    360,
    '{"watch_for":["new x402 services","live pricing changes","usage spikes","machine-readable marketplace signals","new service categories"],"related_urls":["https://agentic.market/","https://x402.gitbook.io/x402/core-concepts/bazaar-discovery-layer"]}'::jsonb,
    '{"priority":"high","execution_use":"trigger AgentCrush listings, marketplace comparisons, and fast response briefs when new agent-service categories or leaders emerge"}'::jsonb
  ),
  (
    'coinbase_cdp_changelog',
    'docs',
    'active',
    'Coinbase CDP changelog',
    'https://docs.cdp.coinbase.com/get-started/changelog',
    720,
    '{"watch_for":["wallet APIs","x402 releases","agent payment primitives","stablecoin settlement changes","CDP platform changes"]}'::jsonb,
    '{"priority":"high","execution_use":"trigger implementation checks, docs updates, or explainer briefs when Coinbase ships agent-economy primitives"}'::jsonb
  ),
  (
    'coinbase_x402_docs_welcome',
    'docs',
    'active',
    'Coinbase x402 docs/welcome',
    'https://docs.cdp.coinbase.com/x402/welcome',
    720,
    '{"watch_for":["x402 integration changes","middleware examples","buyer and seller implementation shifts","network support"]}'::jsonb,
    '{"priority":"high","execution_use":"trigger AgentCrush x402 guide updates and integration-priority decisions"}'::jsonb
  ),
  (
    'x402_ecosystem',
    'ecosystem',
    'active',
    'x402 ecosystem page',
    'https://www.x402.org/ecosystem',
    720,
    '{"watch_for":["new apps","new infrastructure providers","commercial deployments","directory gaps","enterprise adopters"]}'::jsonb,
    '{"priority":"high","execution_use":"trigger new AgentCrush listing candidates, category pages, and commercial adoption briefs"}'::jsonb
  ),
  (
    'x402_bazaar_docs',
    'docs',
    'active',
    'x402 Bazaar docs',
    'https://docs.cdp.coinbase.com/x402/bazaar',
    720,
    '{"watch_for":["discovery schema changes","service listing mechanics","agent service marketplace patterns","MCP or API changes"]}'::jsonb,
    '{"priority":"high","execution_use":"trigger AgentCrush discovery alignment work and parser/backlog updates"}'::jsonb
  ),
  (
    'erc8004_official_eip',
    'docs',
    'active',
    'ERC-8004 official EIP',
    'https://eips.ethereum.org/EIPS/eip-8004',
    1440,
    '{"watch_for":["standard status changes","identity registry updates","reputation model changes","validation registry changes","implementation references"]}'::jsonb,
    '{"priority":"high","execution_use":"trigger trust-model updates, standards explainers, and ranking metadata changes for AgentCrush"}'::jsonb
  ),
  (
    'erc8004_scan',
    'ecosystem',
    'active',
    '8004scan',
    'https://testnet.8004scan.io/',
    720,
    '{"watch_for":["new registered agents","top ranked agents","feedback volume","validation activity","ERC-8004 x402 examples"]}'::jsonb,
    '{"priority":"high","execution_use":"trigger AgentCrush agent imports, ERC-8004 coverage, and reputation-signal experiments"}'::jsonb
  ),
  (
    'kite_official_network',
    'protocol_site',
    'active',
    'Kite official site / network',
    'https://www.gokite.ai/',
    1440,
    '{"watch_for":["agent identity claims","payment rails","network growth","enterprise launches","protocol announcements"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger comparison coverage when Kite becomes relevant to identity, payments, or A2A network strategy"}'::jsonb
  ),
  (
    'fetch_ai_agentverse',
    'blog',
    'active',
    'Fetch.ai blog / Agentverse',
    'https://fetch.ai/blog',
    1440,
    '{"watch_for":["agent commerce","Agentverse updates","network adoption","enterprise partnerships","agent marketplace changes"],"related_urls":["https://fetch.ai/blog","https://agentverse.ai/"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger ecosystem coverage or listing updates when Fetch.ai expands agent discovery, deployment, or commerce"}'::jsonb
  ),
  (
    'virtuals_protocol_announcements',
    'ecosystem',
    'active',
    'Virtuals Protocol announcements',
    'https://x.com/virtuals_io',
    1440,
    '{"watch_for":["official announcements","ACP updates","agent commerce integrations","chain expansions","new agent launches","marketplace changes","tokenized agent milestones"],"related_urls":["https://www.virtuals.io/","https://whitepaper.virtuals.io/"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger AgentCrush coverage when Virtuals announces agent-commerce integrations, ACP updates, chain expansions, or agent launches"}'::jsonb
  ),
  (
    'huggingface_agents_spaces',
    'ecosystem',
    'active',
    'Hugging Face agents / Spaces',
    'https://huggingface.co/docs/hub/en/spaces-agents',
    1440,
    '{"watch_for":["Spaces as agent tools","agents.md adoption","new agent-compatible spaces","model/tool distribution changes"],"related_urls":["https://huggingface.co/spaces","https://huggingface.co/docs/hub/en/spaces-agents"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger AgentCrush tool-distribution coverage and identify agent tools worth listing or benchmarking"}'::jsonb
  ),
  (
    'bankr_agent_wallets',
    'ecosystem',
    'active',
    'Bankr',
    'https://docs.bankr.bot/',
    720,
    '{"watch_for":["agent wallets","self-funding agents","x402 cloud endpoints","token launch mechanics","agent trading APIs"]}'::jsonb,
    '{"priority":"high","execution_use":"trigger analysis when agent wallets, self-funding mechanics, or x402 endpoints create new AgentCrush categories"}'::jsonb
  ),
  (
    'farcaster_ai_agents_channels',
    'community',
    'active',
    'Farcaster /ai and /agents',
    'https://warpcast.com/~/channel/ai',
    360,
    '{"channels":[{"name":"/ai","url":"https://warpcast.com/~/channel/ai"},{"name":"/agents","url":"https://warpcast.com/~/channel/agents"}],"watch_for":["x402 discussion","agent launch chatter","builder pain points","payments and identity discussion","founder announcements"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger daily brief candidates, founder follow-ups, and quick AgentCrush listing reviews from early community signals"}'::jsonb
  ),
  (
    'hacker_news_agent_economy_search',
    'search',
    'active',
    'Hacker News filtered search for x402 / AI agent / ERC-8004',
    'https://hn.algolia.com/?q=x402%20OR%20%22AI%20agent%22%20OR%20ERC-8004',
    720,
    '{"queries":["x402","\"AI agent\"","ERC-8004","agent payments","agent economy","agent wallet"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger response briefs when technical community attention, criticism, or launch chatter needs an AgentCrush take"}'::jsonb
  ),
  (
    'github_agent_repo_search',
    'search',
    'active',
    'GitHub trending/search for agent repos',
    'https://github.com/search?q=agent+x402+OR+ERC-8004+OR+%22agent+payments%22&type=repositories&s=updated&o=desc',
    720,
    '{"queries":["agent x402","ERC-8004","agent payments","autonomous agents","agent wallet"],"watch_for":["fast-rising repos","payment examples","identity standard implementations","reference integrations"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger AgentCrush listings, technical comparisons, or implementation spikes from fast-moving repos"}'::jsonb
  ),
  (
    'product_hunt_agent_launches',
    'search',
    'active',
    'Product Hunt agent launches',
    'https://www.producthunt.com/search?q=agent',
    1440,
    '{"queries":["agent","AI agent","agent marketplace","automation agent","agent wallet"],"watch_for":["commercial launches","positioning shifts","new competitors","agent marketplace products"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger launch coverage, directory additions, and competitive positioning updates"}'::jsonb
  ),
  (
    'competitor_watch_agent_directories',
    'competitor',
    'active',
    'Competitor watch: aiagentsdirectory, agentsindex, MIT AI Agent Index',
    NULL,
    10080,
    '{"cadence":"weekly","targets":[{"name":"AI Agents Directory","url":"https://aiagentsdirectory.com/"},{"name":"AgentsIndex","url":"https://www.agentsindex.com/"},{"name":"MIT AI Agent Index","url":"https://aiagentindex.mit.edu/"}],"watch_for":["new category coverage","ranking UX changes","submission flows","monetization","x402 or agent-economy pages"]}'::jsonb,
    '{"priority":"medium","execution_use":"trigger defensive product prioritization when directories copy AgentCrush ranking, discovery, or monetization moves"}'::jsonb
  )
ON CONFLICT (source_key) DO UPDATE SET
  source_type = EXCLUDED.source_type,
  status = EXCLUDED.status,
  display_name = EXCLUDED.display_name,
  url = EXCLUDED.url,
  poll_interval_minutes = EXCLUDED.poll_interval_minutes,
  config = EXCLUDED.config,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO ajsa_catalyst_state (
  catalyst_key,
  status,
  title,
  source_key,
  current_state,
  evidence
) VALUES
  (
    'stripe_x402_revenue_disclosure',
    'watching',
    'Stripe discloses x402 revenue, volume, or merchant adoption',
    NULL,
    '{"trigger":"credible Stripe x402 revenue, volume, merchant, or roadmap disclosure","suggested_action":"publish fast analysis and update AgentCrush x402 commercial-readiness pages"}'::jsonb,
    '[]'::jsonb
  ),
  (
    'frontier_model_usdc_wallet',
    'watching',
    'Frontier model provider ships USDC wallet or agent payment capability',
    NULL,
    '{"trigger":"OpenAI, Anthropic, Google, Meta, xAI, or similar provider adds USDC wallet/payment capability for agents","suggested_action":"prioritize explainer, ranking tags, and integration opportunity review"}'::jsonb,
    '[]'::jsonb
  ),
  (
    'enterprise_x402_deployment',
    'watching',
    'Enterprise deploys x402 for paid API, content, data, or agent access',
    'x402_ecosystem',
    '{"trigger":"named enterprise or credible production service adopts x402","suggested_action":"create case study brief and identify listing/category updates"}'::jsonb,
    '[]'::jsonb
  ),
  (
    'cloudflare_pay_per_crawl_ga',
    'watching',
    'Cloudflare pay-per-crawl reaches general availability or x402-compatible rollout',
    NULL,
    '{"trigger":"Cloudflare ships GA, pricing, partner, or protocol details for pay-per-crawl","suggested_action":"assess crawler/payment implications and publish AgentCrush operator guidance"}'::jsonb,
    '[]'::jsonb
  ),
  (
    'commercial_robot_x402',
    'watching',
    'Commercial robot or embodied agent uses x402-style payments',
    NULL,
    '{"trigger":"robotics company demonstrates autonomous purchase, service, or settlement flow using x402 or adjacent standard","suggested_action":"brief founder on physical-agent commerce implications"}'::jsonb,
    '[]'::jsonb
  ),
  (
    'erc8004_major_adoption',
    'watching',
    'Major ecosystem adopts ERC-8004 for agent identity, reputation, or discovery',
    'erc8004_official_eip',
    '{"trigger":"major wallet, protocol, marketplace, or agent platform adopts or implements ERC-8004","suggested_action":"update trust model, ranking metadata plan, and standards coverage"}'::jsonb,
    '[]'::jsonb
  ),
  (
    'competing_agent_payment_standard',
    'watching',
    'Competing agent payment standard gains credible adoption',
    NULL,
    '{"trigger":"non-x402 payment standard gets meaningful protocol, cloud, wallet, or enterprise support","suggested_action":"compare against x402 and decide whether AgentCrush should track it as first-class infrastructure"}'::jsonb,
    '[]'::jsonb
  ),
  (
    'agentcrush_equivalent_competitor',
    'watching',
    'AgentCrush-equivalent competitor ships meaningful discovery, ranking, or monetization feature',
    'competitor_watch_agent_directories',
    '{"trigger":"competitor launches feature that overlaps AgentCrush rankings, discovery, claims, monetization, or x402 positioning","suggested_action":"produce response options and prioritize defensive product work"}'::jsonb,
    '[]'::jsonb
  )
ON CONFLICT (catalyst_key) DO UPDATE SET
  status = EXCLUDED.status,
  title = EXCLUDED.title,
  source_key = EXCLUDED.source_key,
  current_state = EXCLUDED.current_state,
  evidence = EXCLUDED.evidence,
  updated_at = NOW();
