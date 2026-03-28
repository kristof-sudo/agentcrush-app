export const USE_CASES = {
  'coding-automation': {
    title: 'Coding Automation',
    seoTitle: 'Best AI Agents for Coding Automation',
    description:
      'These agents autonomously write, review, debug, and deploy code across your codebase. Use them to ship faster, resolve GitHub issues hands-free, or pair-program at scale.',
    handles: ['devin', 'swe_agent', 'aider', 'sweepai', 'openhands'],
  },
  'research-automation': {
    title: 'Research Automation',
    seoTitle: 'Best AI Agents for Research Automation',
    description:
      'These agents search, synthesize, and summarize information from across the web and academic sources. Use them to accelerate competitive analysis, literature reviews, or real-time fact-finding.',
    handles: ['perplexity', 'elicit', 'agentbench', 'gpt_researcher', 'notebooklm'],
  },
  'multi-agent-orchestration': {
    title: 'Multi-Agent Orchestration',
    seoTitle: 'Best Frameworks for Multi-Agent Orchestration',
    description:
      'These frameworks let you build, coordinate, and deploy networks of specialized agents working together. Use them when a single agent isn\'t enough and you need role-based delegation at scale.',
    handles: ['autogen', 'crewai', 'langgraph', 'phidata', 'agentverse'],
  },
  'crypto-trading': {
    title: 'Crypto Trading',
    seoTitle: 'Best AI Agents for Crypto Trading',
    description:
      'These agents monitor on-chain signals, execute trades, and surface market intelligence in real time. Use them to stay ahead of the market without watching charts around the clock.',
    handles: ['bankr', 'aixbt', 'virtuals', 'griffain', 'ai16z'],
  },
  'browser-automation': {
    title: 'Browser Automation',
    seoTitle: 'Best AI Agents for Browser Automation',
    description:
      'These agents navigate, click, fill forms, and extract data from any website without APIs. Use them to automate repetitive web workflows, scrape structured data, or run end-to-end tests.',
    handles: ['multion', 'browserbase', 'agent_ai', 'stagehand', 'browse_ai'],
  },
  'data-analysis': {
    title: 'Data Analysis',
    seoTitle: 'Best AI Agents for Data Analysis',
    description:
      'These agents connect to your data sources, run queries, and produce structured insights or visualizations. Use them to replace ad-hoc SQL queries and turn raw data into decisions faster.',
    handles: ['langchainagents', 'llamaindex', 'haystack', 'flowise', 'dify'],
  },
  'customer-support': {
    title: 'Customer Support',
    seoTitle: 'Best AI Agents for Customer Support',
    description:
      'These agents handle inbound queries, route tickets, draft responses, and maintain context across long conversations. Use them to reduce support load while keeping response quality high.',
    handles: ['lindy', 'letta', 'memgpt', 'intercom_fin', 'siena_ai'],
  },
  'code-review': {
    title: 'Code Review',
    seoTitle: 'Best AI Agents for Code Review',
    description:
      'These agents automatically review pull requests, flag bugs, suggest improvements, and enforce style guides. Use them to catch issues earlier and reduce review bottlenecks on your team.',
    handles: ['cursor', 'codeium', 'aider', 'sweep', 'github_copilot'],
  },
}

export function getUseCase(slug) {
  return USE_CASES[slug] || null
}

export function getAllUseCaseSlugs() {
  return Object.keys(USE_CASES)
}
