/**
 * /watchlist — the retention loop. Your agent stack is your position;
 * this page answers "is anything I depend on going dark?"
 *
 * Accountless by design: the list lives in localStorage, the personalized
 * RSS/JSON feed URL is the subscription. No signup wall in front of the
 * habit we're trying to build.
 */

import WatchlistClient from './WatchlistClient'

export const metadata = {
  title: 'Watchlist · AgentCrush',
  description:
    'Watch the AI agents and MCP servers you depend on. Get alerted when one goes dark, resurrects, or moves in the rankings — no account needed.',
  alternates: { canonical: 'https://agentcrush.xyz/watchlist' },
  openGraph: {
    title: 'AgentCrush Watchlist',
    description: 'Dead-agent alerts for the agents you depend on. Accountless — the feed URL is the subscription.',
    url: 'https://agentcrush.xyz/watchlist',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

export default function WatchlistPage() {
  return <WatchlistClient />
}
