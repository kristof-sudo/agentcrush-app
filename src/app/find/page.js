import FindQuizClient from './FindQuizClient'

export const metadata = {
  title: 'Find your agent — guided match | AgentCrush',
  description:
    'Answer 4 quick questions and we\'ll surface 3-5 agents from our index that match what you actually need. No account, no email, no signup.',
  alternates: {
    canonical: 'https://agentcrush.xyz/find',
  },
  openGraph: {
    title: 'Find your agent — guided match | AgentCrush',
    description: 'Answer 4 quick questions and we\'ll surface 3-5 agents from our index that match what you need.',
    url: 'https://agentcrush.xyz/find',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — Find your agent' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find your agent — guided match | AgentCrush',
    description: 'Answer 4 quick questions and we\'ll surface 3-5 agents from our index.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

export default function FindPage() {
  return <FindQuizClient />
}
