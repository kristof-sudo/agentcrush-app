/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/trends', destination: '/agent-economy-index', permanent: true },
      { source: '/agent-economy-explained', destination: '/agent-economy', permanent: true },
      { source: '/shop', destination: '/pricing', permanent: true },
      { source: '/shop/success', destination: '/pricing', permanent: true },
      { source: '/watchlist', destination: '/explore', permanent: true },
      { source: '/surfaces/agentverse', destination: '/explore', permanent: true },
      { source: '/how-we-rank', destination: '/methodology', permanent: true },
      { source: '/for-agents', destination: '/developers#for-agents', permanent: true },
      { source: '/api-docs', destination: '/developers#api', permanent: true },
      { source: '/developers/mcp', destination: '/developers#mcp', permanent: true },
      { source: '/leaderboard', destination: '/rankings', permanent: true },
      { source: '/llm-summary', destination: '/methodology', permanent: true },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/embed/:handle.svg',
        destination: '/embed/:handle',
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.artificialintelligence-news.com' },
      { protocol: 'https', hostname: '**.venturebeat.com' },
      { protocol: 'https', hostname: '**.huggingface.co' },
      { protocol: 'https', hostname: '**.substack.com' },
      { protocol: 'https', hostname: '**.therundown.ai' },
      { protocol: 'https', hostname: '**.techcrunch.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
        ],
      },
    ]
  },
}

export default nextConfig
