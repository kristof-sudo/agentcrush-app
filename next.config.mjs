/** @type {import('next').NextConfig} */
const nextConfig = {
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
