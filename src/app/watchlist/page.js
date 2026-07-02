import WatchlistPage from '@/components/watchlist/WatchlistPage'

export const metadata = {
  title: 'My Watchlist · AgentCrush',
  description:
    'Track AI agents you depend on. No account needed — saved in your browser. Get personalized change alerts via RSS or JSON feed.',
  alternates: {
    canonical: 'https://agentcrush.xyz/watchlist',
  },
  openGraph: {
    title: 'My Watchlist — AgentCrush',
    description: 'Track AI agents you depend on. Get rank moves, ghost alerts, and resurrections as a personalized feed.',
    url: 'https://agentcrush.xyz/watchlist',
    siteName: 'AgentCrush',
    type: 'website',
  },
}

export default function Page() {
  return <WatchlistPage />
}
